let promptSeq = 0;
const activePromptIds = new Set<number>();
let externalBypassUntil = 0;

export const isPermissionPrompting = () => activePromptIds.size > 0;
export const isSoftLockBypassed = () => isPermissionPrompting() || Date.now() < externalBypassUntil;

export const markShortSoftLockBypass = (durationMs = 12000) => {
  const until = Date.now() + Math.max(1000, durationMs);
  if (until > externalBypassUntil) {
    externalBypassUntil = until;
  }
};

export const withPermissionPromptGuard = async <T>(
  task: () => Promise<T>,
  timeoutMs = 15000,
): Promise<T> => {
  const id = ++promptSeq;
  activePromptIds.add(id);
  const timer = setTimeout(() => {
    activePromptIds.delete(id);
  }, timeoutMs);

  try {
    return await task();
  } finally {
    clearTimeout(timer);
    activePromptIds.delete(id);
  }
};

export const withExternalOpenGuard = async <T>(
  task: () => Promise<T>,
  bypassMs = 12000,
): Promise<T> => {
  markShortSoftLockBypass(bypassMs);
  return task();
};
