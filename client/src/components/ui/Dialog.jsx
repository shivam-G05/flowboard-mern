import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { cn } from '../../utils/cn.js';

const ease = [0.2, 0, 0, 1];

/** Modal dialog: focus trap, Escape to close, quick fade-and-rise entrance. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useFocusTrap(open, onClose);
  const titleId = useId();
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:px-6 sm:pt-[10vh]">
          <motion.div
            className="absolute inset-0 bg-ink-950/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease }}
            className={cn('relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-xl bg-paper-50 shadow-float outline-none sm:rounded-lg', widths[size])}
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
              <div>
                <h2 id={titleId} className="font-display text-[26px] leading-tight text-ink-900">
                  {title}
                </h2>
                {description && <p className="mt-1 text-[13px] text-ink-500">{description}</p>}
              </div>
              <button onClick={onClose} className="-mr-2 rounded-md p-1.5 text-ink-400 hover:bg-ink-900/5 hover:text-ink-800" aria-label="Close dialog">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-6 pb-6 pt-2">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-ink-200 px-6 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
