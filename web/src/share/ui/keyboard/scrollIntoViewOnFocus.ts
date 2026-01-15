import type { FocusEvent } from 'react';

export const scrollIntoViewOnFocus = (event: FocusEvent<HTMLElement>) => {
  const element = event.currentTarget;
  setTimeout(() => {
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      element.scrollIntoView();
    }
  }, 400);
};
