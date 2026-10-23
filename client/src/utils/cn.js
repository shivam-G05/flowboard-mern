import clsx from 'clsx';

/** Joins class names, skipping falsy values: cn('a', isActive && 'b'). */
export const cn = (...inputs) => clsx(inputs);
