export interface QrPayload {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  description: string;
  amount?: number;
}
