import apiClient from '@lib/apiClient';

type TtsResponse = { ok: boolean; audioUrl?: string; cached?: boolean };

export const requestTts = async (text: string): Promise<TtsResponse> => {
  const res = await apiClient.post<TtsResponse>('/tts', { text });
  return res.data;
};
