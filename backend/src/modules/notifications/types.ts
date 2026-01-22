import { Prisma } from '@prisma/client';

export type NotificationType =
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_UPDATED'
  | 'SCHEDULE_CANCELED'
  | 'SCHEDULE_REMINDER'
  | 'LOAN_REMINDER';

export type NotificationToSend = {
  recipientActorKind: 'CUSTOMER' | 'STAFF';
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  notificationKey: string;
};

export type NotificationTemplateResult = {
  type: NotificationType;
  title: string;
  body: string;
  notificationKey: string;
  data: Prisma.JsonValue;
};
