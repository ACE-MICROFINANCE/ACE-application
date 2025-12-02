import bcrypt from 'bcrypt';

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generates a random numeric password with length between minLength and maxLength.
 */
export const generateNumericPassword = (minLength = 6, maxLength = 8): string => {
  const length =
    minLength + Math.floor(Math.random() * (maxLength - minLength + 1));
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
};
