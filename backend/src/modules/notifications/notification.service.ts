import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { Feedback, Customer } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
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
    });
  }

  private renderTemplate(templateName: string, variables: Record<string, string>) {
    const candidates = [
      path.join(__dirname, 'templates', templateName), // dist
      path.join(process.cwd(), 'src', 'modules', 'notifications', 'templates', templateName), // ts-node / dev
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          const raw = fs.readFileSync(candidate, 'utf-8');
          return raw.replace(/{{(.*?)}}/g, (_, key: string) => variables[key.trim()] ?? '');
        } catch (error) {
          this.logger.warn(`Đọc template thất bại: ${candidate}. Error: ${error}`);
        }
      }
    }
    this.logger.warn(`Không tìm thấy template ${templateName} trong các đường dẫn: ${candidates.join(', ')}`);
    return '';
  }

  private async sendMail(subject: string, html: string) {
    if (!this.transporter) {
      this.logger.warn(`Email not sent because transporter is not configured. Subject: ${subject}`);
      return;
    }

    const from = this.configService.get<string>('mail.from');
    const to = this.configService.get<string>('mail.to');
    if (!from || !to) {
      this.logger.warn('MAIL_FROM or MAIL_TO is missing, skip sending email.');
      return;
    }

    await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  }

  async sendPasswordResetToStaff(customer: Customer, tempPassword: string) {
    const subject = `Yêu cầu cấp lại mật khẩu cho khách hàng ${customer.memberNo}`;
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
        <p>Nhân viên thân mến,</p>
        <p>Có yêu cầu cấp lại mật khẩu cho khách hàng:</p>
        <ul>
          <li><strong>Mã thành viên:</strong> ${customer.memberNo}</li>
          <li><strong>Họ tên:</strong> ${customer.fullName ?? ''}</li>
          <li><strong>Số điện thoại:</strong> ${customer.phoneNumber ?? ''}</li>
          <li><strong>Địa chỉ:</strong> ${(customer.villageName ?? '')} ${(customer.groupName ?? '')}</li>
          <li><strong>Mật khẩu tạm:</strong> ${tempPassword}</li>
        </ul>
        <p>Vui lòng chủ động liên hệ khách hàng và hướng dẫn đổi mật khẩu sau khi đăng nhập.</p>
      `;
    await this.sendMail(subject, html);
  }

  async sendFeedbackToStaff(customer: Customer, feedback: Feedback) {
    const subject = `Feedback mới từ khách hàng ${customer.memberNo}`;
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
        <p>Nhân viên thân mến,</p>
        <p>Khách hàng vừa gửi góp ý:</p>
        <ul>
          <li><strong>Mã thành viên:</strong> ${customer.memberNo}</li>
          <li><strong>Họ tên:</strong> ${customer.fullName ?? ''}</li>
          <li><strong>Số điện thoại:</strong> ${customer.phoneNumber ?? ''}</li>
          <li><strong>Địa chỉ:</strong> ${(customer.villageName ?? '')} ${(customer.groupName ?? '')}</li>
          <li><strong>Thời gian:</strong> ${feedback.createdAt.toISOString()}</li>
        </ul>
        <p><strong>Nội dung:</strong></p>
        <p>${feedback.content}</p>
      `;
    await this.sendMail(subject, html);
  }
}
