import { Button } from './Button.jsx';
import { Dialog } from './Dialog.jsx';

/** Asks before destructive actions. The confirm button is the danger variant and shows a spinner while working. */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', loading, children }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-sm leading-relaxed text-ink-600">{description}</p>}
      {children}
    </Dialog>
  );
}
