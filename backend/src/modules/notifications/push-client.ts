export type PushPayload = {
  title: string;
  body: string;
  data: Record<string, any>;
};

export interface PushClient {
  send(tokens: string[], payload: PushPayload): Promise<void>;
}

export class StubPushClient implements PushClient {
  async send(tokens: string[], payload: PushPayload): Promise<void> {
    // noop stub for environments without FCM/APNs configured
    return;
  }
}
