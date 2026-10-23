import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * Accessible menu button: Enter/Space/ArrowDown opens, arrow keys move between items,
 * Escape or clicking outside closes, and focus returns to the trigger.
 *
 * items: [{ label, icon, onSelect, danger, disabled }] — use { divider: true } for a separator.
 */
export function Dropdown({ trigger, items, align = 'right', side = 'bottom', label = 'Open menu', className, triggerClassName }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    // Focus the first item once the menu is rendered.
    requestAnimationFrame(() => rootRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus());
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  function onMenuKeyDown(e) {
    const entries = [...rootRef.current.querySelectorAll('[role="menuitem"]:not([disabled])')];
    const index = entries.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      close();
    }
  }

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === 'ArrowDown' && (e.preventDefault(), setOpen(true))}
        className={cn('rounded-md', triggerClassName)}
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
            className={cn(
              'absolute z-40 min-w-[184px] rounded-md bg-paper-50 p-1 shadow-float',
              side === 'top' ? 'bottom-full mb-1' : 'mt-1',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, i) =>
              item.divider ? (
                <div key={`divider-${i}`} className="mx-1 my-1 h-px bg-ink-200" role="separator" />
              ) : (
                <button
                  key={item.label}
                  role="menuitem"
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    close();
                    item.onSelect?.();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left text-[13px] outline-none transition-colors',
                    'disabled:opacity-40',
                    item.danger ? 'text-bad-600 hover:bg-bad-50 focus:bg-bad-50' : 'text-ink-800 hover:bg-ink-900/[0.05] focus:bg-ink-900/[0.05]',
                  )}
                >
                  {item.icon && <item.icon className="h-[15px] w-[15px] text-current opacity-60" strokeWidth={1.75} aria-hidden />}
                  {item.label}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
