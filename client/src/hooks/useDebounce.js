import { useEffect, useState } from 'react';

/** Returns `value` only after it has stopped changing for `delay` ms (used for search-as-you-type). */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // cleanup cancels the pending update on every keystroke
  }, [value, delay]);
  return debounced;
}
