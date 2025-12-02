/**
 * Checks whether a string contains digits only.
 */
export const isNumericString = (value: string): boolean => /^[0-9]+$/.test(value);
