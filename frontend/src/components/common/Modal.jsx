import { useEffect } from 'react';
import { X } from 'lucide-react';
export const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = '650px' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="ops-modal-backdrop" onClick={onClose}>
      <div
        className="ops-modal-dialog"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ops-modal-header">
          <h3 className="ops-panel-title" style={{ margin: 0 }}>{title}</h3>
          <button className="btn-ops btn-ops-sm" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>
        <div className="ops-modal-body">
          {children}
        </div>
        {footer && (
          <div className="ops-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
export default Modal;
