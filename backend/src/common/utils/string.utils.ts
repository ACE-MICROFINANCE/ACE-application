/**
 * Removes Vietnamese diacritics for consistent encoding in payment descriptions.
 */
export const removeVietnameseAccents = (input: string): string => {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export const formatVietnameseName = (input: string): string => {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (!normalized) return input;
  return normalized
    .toLocaleLowerCase('vi-VN')
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) =>
          part ? part.charAt(0).toLocaleUpperCase('vi-VN') + part.slice(1) : part,
        )
        .join('-'),
    )
    .join(' ');
};
