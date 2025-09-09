import React from "react";
import "../styles/theme.css"; // dùng theme chung

interface ConfirmModalProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="modal-overlay animate-fadeIn">
      <div className="modal-box animate-slideIn">
        <h2 className="modal-title">Xác nhận</h2>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Hủy
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
