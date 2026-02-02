import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { Feedback, Customer, StaffUser } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Legacy email notification service (feedback/password reset + staff flows).
 */
@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.setupTransporter();
  }

  private setupTransporter() {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const secure = this.configService.get<boolean>('mail.secure');
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.pass');

    if (!host || !port || !user || !pass) {
      this.logger.warn('Mail configuration is missing, email notifications disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: Boolean(secure),
      auth: { user, pass },
      connectionTimeout: 10_000,
      socketTimeout: 10_000,
      pool: true,
      maxConnections: 3,
      maxMessages: 20,
    });
  }

  private renderTemplate(templateName: string, variables: Record<string, string>) {
    const candidates = [
      path.join(__dirname, 'templates', templateName), // dist
      path.join(process.cwd(), 'src', 'modules', 'notifications', 'templates', templateName), // dev
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          const raw = fs.readFileSync(candidate, 'utf-8');
          return raw.replace(/{{(.*?)}}/g, (_, key: string) => variables[key.trim()] ?? '');
        } catch (error) {
          this.logger.warn(`Render template failed: ${candidate}. Error: ${error}`);
        }
      }
    }
    this.logger.warn(`Template ${templateName} not found in: ${candidates.join(', ')}`);
    return '';
  }

  private async sendMail(subject: string, html: string, toOverride?: string) {
    if (!this.transporter) {
      this.logger.warn(`Email not sent because transporter is not configured. Subject: ${subject}`);
      return;
    }

    const from = this.configService.get<string>('mail.from');
    const to = toOverride ?? this.configService.get<string>('mail.to');
    if (!from || !to) {
      this.logger.warn('MAIL_FROM or MAIL_TO is missing, skip sending email.');
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} subject="${subject}" id=${info.messageId ?? 'n/a'}`);
    } catch (err) {
      const msg = (err as any)?.message ?? String(err);
      this.logger.error(
        `Email send failed to ${to} subject="${subject}" host=${this.configService.get<string>('mail.host')}: ${msg}`,
      );
      throw err;
    }
  }

  async sendStaffTempPassword(staff: Pick<StaffUser, 'email' | 'fullName'>, tempPassword: string, ttlMinutes: number) {
    const subject = 'Mật khẩu tạm thời cho tài khoản nhân viên';
    const appName = this.configService.get<string>('app.name') ?? 'ACE Farmer App';
    const html =
      this.renderTemplate('staff-temp-password.html', {
        appName,
        staffName: staff.fullName ?? 'Anh/Chị',
        email: staff.email,
        tempPassword,
        expiryMinutes: ttlMinutes.toString(),
      }) ||
      `
        <p>Chào ${staff.fullName ?? 'bạn'},</p>
        <p>Mật khẩu tạm thời của bạn là: <strong>${tempPassword}</strong></p>
        <p>Mật khẩu này sẽ hết hạn sau ${ttlMinutes} phút. Vui lòng đăng nhập và đổi mật khẩu ngay.</p>
      `;
    await this.sendMail(subject, html, staff.email);
  }

  async sendStaffPasswordExpiryReminder(
    staff: Pick<StaffUser, 'email' | 'fullName'>,
    expiresDate: string,
    daysLeft: number,
    changePasswordHint: string,
  ) {
    const subject = 'Nhắc mật khẩu sắp hết hạn';
    const appName = this.configService.get<string>('app.name') ?? 'ACE Farmer App';
    const html =
      this.renderTemplate('staff-password-expiry-reminder.html', {
        appName,
        staffName: staff.fullName ?? 'Anh/Chị',
        email: staff.email,
        expiresDate,
        daysLeft: daysLeft.toString(),
        changePasswordHint,
      }) ||
      `
        <p>Mật khẩu sẽ hết hạn vào ${expiresDate} (còn ${daysLeft} ngày). Vui lòng đổi mật khẩu: ${changePasswordHint}</p>
      `;
    await this.sendMail(subject, html, staff.email);
  }

  async sendPasswordResetToStaff(customer: Customer, tempPassword: string) {
    const subject = `Yeu cau cap lai mat khau cho khach hang ${customer.memberNo}`;
    const html =
      this.renderTemplate('reset-password.html', {
        memberNo: customer.memberNo,
        fullName: customer.fullName ?? '',
        phoneNumber: customer.phoneNumber ?? '',
        villageName: customer.villageName ?? '',
        groupName: customer.groupName ?? '',
        tempPassword,
      }) ||
      `
        <p>Nhan vien than men,</p>
        <p>Co yeu cau cap lai mat khau cho khach hang:</p>
        <ul>
          <li><strong>Ma thanh vien:</strong> ${customer.memberNo}</li>
          <li><strong>Ho ten:</strong> ${customer.fullName ?? ''}</li>
          <li><strong>So dien thoai:</strong> ${customer.phoneNumber ?? ''}</li>
          <li><strong>Dia chi:</strong> ${(customer.villageName ?? '')} ${(customer.groupName ?? '')}</li>
          <li><strong>Mat khau tam:</strong> ${tempPassword}</li>
        </ul>
        <p>Vui long lien he khach hang va huong dan doi mat khau sau khi dang nhap.</p>
      `;
    await this.sendMail(subject, html);
  }

  async sendFeedbackToStaff(customer: Customer, feedback: Feedback) {
    const subject = `Feedback moi tu khach hang ${customer.memberNo}`;
    const html =
      this.renderTemplate('feedback.html', {
        memberNo: customer.memberNo,
        fullName: customer.fullName ?? '',
        phoneNumber: customer.phoneNumber ?? '',
        villageName: customer.villageName ?? '',
        groupName: customer.groupName ?? '',
        createdAt: feedback.createdAt.toISOString(),
        content: feedback.content ?? '',
      }) ||
      `
        <p>Nhan vien than men,</p>
        <p>Khach hang vua gui gop y:</p>
        <ul>
          <li><strong>Ma thanh vien:</strong> ${customer.memberNo}</li>
          <li><strong>Ho ten:</strong> ${customer.fullName ?? ''}</li>
          <li><strong>So dien thoai:</strong> ${customer.phoneNumber ?? ''}</li>
          <li><strong>Dia chi:</strong> ${(customer.villageName ?? '')} ${(customer.groupName ?? '')}</li>
          <li><strong>Thoi gian:</strong> ${feedback.createdAt.toISOString()}</li>
        </ul>
        <p><strong>Noi dung:</strong></p>
        <p>${feedback.content}</p>
      `;
    await this.sendMail(subject, html);
  }
}
