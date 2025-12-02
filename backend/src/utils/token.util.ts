import crypto from 'crypto';
import ms from 'ms';

/**
 * Hashes a token using SHA-256 for storage in DB.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Converts a JWT expiresIn string/number to an absolute Date for persistence.
 */
export const computeExpiryDate = (expiresIn: string | number): Date => {
  if (typeof expiresIn === 'number') {
    return new Date(Date.now() + expiresIn * 1000);
  }

  const durationMs = ms(expiresIn as any);
  if (typeof durationMs !== 'number') {
    throw new Error('Invalid expiresIn format');
  }
  return new Date(Date.now() + durationMs);
};
