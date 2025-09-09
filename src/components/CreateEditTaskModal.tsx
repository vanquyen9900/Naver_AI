// src/components/CreateEditTaskModal.tsx
import React, { useState, useEffect } from "react";
import "../styles/theme.css";
import { saveTaskWithLevel, type TaskItem } from "../services/firestore";
import { auth } from "../services/firebase";
import { toast } from "react-toastify";

interface Props {
  open: boolean;
  onClose: () => void;
  edit: TaskItem | null;
  onSaved: () => void;
  defaultStart?: Date | null;
  defaultEnd?: Date | null;
}

const levels = [
  { value: 1, label: "Rất quan trọng" },
  { value: 2, label: "Quan trọng" },
  { value: 3, label: "Bình thường" },
  { value: 4, label: "Thường ngày" },
  { value: 5, label: "Rảnh rỗi" },
];

const CreateEditTaskModal: React.FC<Props> = ({
  open,
  onClose,
  edit,
  onSaved,
}) => {
  const [taskName, setTaskName] = useState("");
  const [taskDetail, setTaskDetail] = useState("");
  const [level, setLevel] = useState(3);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  useEffect(() => {
    if (edit) {
      setTaskName(edit.task_name);
      setTaskDetail(edit.task_detail || "");
      setLevel(edit.level || 3);
      setStartTime(
        edit.start_time
          ? new Date(edit.start_time).toISOString().slice(0, 16)
          : ""
      );
      setEndTime(
        edit.end_time ? new Date(edit.end_time).toISOString().slice(0, 16) : ""
      );
    } else {
      setTaskName("");
      setTaskDetail("");
      setLevel(3);
      setStartTime("");
      setEndTime("");
    }
  }, [edit]);

  if (!open) return null;

  const handleSave = async () => {
    if (!auth.currentUser) {
      toast.error("Bạn chưa đăng nhập");
      return;
    }
    if (!taskName.trim()) {
      toast.error("Tên lịch không được để trống");
      return;
    }
    try {
      await saveTaskWithLevel(auth.currentUser.uid, {
        id: edit?.id,
        task_name: taskName,
        task_detail: taskDetail,
        start_time: startTime ? new Date(startTime) : null,
        end_time: endTime ? new Date(endTime) : null,
        level,
      });
      toast.success(edit ? "Cập nhật thành công" : "Thêm mới thành công");
      onClose();
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Lưu thất bại");
    }
  };

  return (
    <div className="modal-overlay animate-fadeIn">
      <div className="modal-box animate-slideIn">
        <h2 className="modal-title">
          {edit ? "Chỉnh sửa lịch" : "Thêm lịch mới"}
        </h2>

        <div className="form-group">
          <label>Tên lịch</label>
          <input
            type="text"
            className="input"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Chi tiết</label>
          <textarea
            className="input"
            value={taskDetail}
            onChange={(e) => setTaskDetail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Bắt đầu</label>
          <input
            type="datetime-local"
            className="input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Kết thúc</label>
          <input
            type="datetime-local"
            className="input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Mức độ</label>
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            {levels.map((lv) => (
              <option key={lv.value} value={lv.value}>
                {lv.label}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {edit ? "Cập nhật" : "Thêm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEditTaskModal;
