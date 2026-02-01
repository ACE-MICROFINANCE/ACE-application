export const normalizeGroupName = (value?: string | null): string | null => {
  if (!value) return null;
  // replace tabs/newlines with space, trim, collapse multiple spaces
  return value.replace(/[\t\r\n]+/g, ' ').trim().replace(/\s+/g, ' ');
};

export const normalizeGroupNameKey = (value?: string | null): string | null => {
  const norm = normalizeGroupName(value);
  if (!norm) return null;
  return norm.toUpperCase();
};
