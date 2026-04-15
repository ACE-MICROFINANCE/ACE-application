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

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, any>;
  sound: 'default';
  priority: 'high';
  channelId?: string;
};

const EXPO_PUSH_SEND_LIMIT = 100;

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const isExpoPushToken = (token: string) => /^ExponentPushToken\[[^\]]+\]$/.test(token);

export class ExpoPushClient implements PushClient {
  constructor(
    private readonly endpoint = 'https://exp.host/--/api/v2/push/send',
    private readonly accessToken?: string,
  ) {}

  async send(tokens: string[], payload: PushPayload): Promise<void> {
    const validTokens = tokens.filter((token) => isExpoPushToken(token));
    if (!validTokens.length) return;

    const batches = chunk(validTokens, EXPO_PUSH_SEND_LIMIT);
    for (const batch of batches) {
      const messages: ExpoPushMessage[] = batch.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Expo push send failed: ${response.status} ${response.statusText} - ${text}`);
      }
    }
  }
}
