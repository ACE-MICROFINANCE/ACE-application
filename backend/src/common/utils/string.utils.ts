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
