import { useCallback, useState } from 'react';

/** useState that remembers its value in localStorage (used for UI preferences like the collapsed sidebar). */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : JSON.parse(stored);
    } catch {
      return initialValue;
    }
  });

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* private mode or storage full — keep the in-memory value */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
