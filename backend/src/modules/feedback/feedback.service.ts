import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  private map(feedback: any) {
    return {
      id: Number(feedback.id),
      customerId: Number(feedback.customerId),
      content: feedback.content,
      status: feedback.status,
      createdAt: feedback.createdAt,
    };
  }

  async create(customerId: string | bigint, dto: CreateFeedbackDto) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const feedback = await this.prisma.feedback.create({
      data: {
        customerId: id,
        content: dto.content,
      },
    });
    return this.map(feedback);
  }

  async list(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const feedbacks = await this.prisma.feedback.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
    });
    return feedbacks.map((fb) => this.map(fb));
  }
}
