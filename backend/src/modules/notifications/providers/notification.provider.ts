import { NotificationToSend } from '../types';

export interface NotificationProvider {
  sendMany(items: NotificationToSend[]): Promise<void>;
}
