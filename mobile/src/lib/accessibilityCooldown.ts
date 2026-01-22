const spokenAt: Record<string, number> = {};
const DEFAULT_COOLDOWN_MS = 60_000;

export const shouldSpeak = (key: string, now: number = Date.now(), cooldownMs: number = DEFAULT_COOLDOWN_MS) => {
  const last = spokenAt[key];
  if (typeof last === 'number' && now - last < cooldownMs) {
    return false;
  }
  return true;
};

export const markSpoken = (key: string, now: number = Date.now()) => {
  spokenAt[key] = now;
};

export const resetCooldown = (key?: string) => {
  if (key) {
    delete spokenAt[key];
    return;
  }
  Object.keys(spokenAt).forEach((k) => delete spokenAt[k]);
};
