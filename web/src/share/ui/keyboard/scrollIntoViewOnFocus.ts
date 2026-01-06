import type { FocusEvent } from 'react';

export const scrollIntoViewOnFocus = (event: FocusEvent<HTMLElement>) => {
  const element = event.currentTarget;
  setTimeout(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 250);
};
