import React, { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { type TaskItem, saveTaskWithLevel } from "../services/firestore";
import { toast } from "react-toastify";
import "../styles/theme.css";

interface Props {
  open: boolean;
  onClose: () => void;
  edit?: TaskItem | null;
  onSaved: () => void;
  defaultStart?: Date;
  defaultEnd?: Date;
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
  defaultStart,
  defaultEnd,
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
      setStartTime(defaultStart ? defaultStart.toISOString().slice(0, 16) : "");
      setEndTime(defaultEnd ? defaultEnd.toISOString().slice(0, 16) : "");
    }
  }, [edit, defaultStart, defaultEnd]);

  // Thêm hàm validate
  const validateDates = (start: string, end: string): string | null => {
    const now = new Date();
    const startDate = start ? new Date(start) : null;

    if (!edit && startDate && startDate < now) {
      return "Thời gian bắt đầu không thể trong quá khứ";
    }

    if (start && end && new Date(start) > new Date(end)) {
      return "Thời gian bắt đầu phải trước thời gian kết thúc";
    }

    return null;
  };

  // Sửa hàm handleSave
  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Bạn chưa đăng nhập");
      return;
    }

    if (!taskName.trim()) {
      toast.error("Tên công việc không được để trống");
      return;
    }

    // Thêm validate dates
    const dateError = validateDates(startTime, endTime);
    if (dateError) {
      toast.error(dateError);
      return;
    }

    try {
      const taskData = {
        id: edit?.id,
        task_name: taskName.trim(),
        task_detail: taskDetail.trim(),
        start_time: startTime ? new Date(startTime) : null,
        end_time: endTime ? new Date(endTime) : null,
        level,
        user_id: currentUser.uid,
      };

      await saveTaskWithLevel(currentUser.uid, taskData);
      toast.success(edit ? "Cập nhật thành công" : "Thêm mới thành công");
      onClose();
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Lưu thất bại");
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay animate-fadeIn">
      <div className="modal-box animate-slideIn">
        <div className="modal-header">
          <h2 className="modal-title">
            {edit ? "Chỉnh sửa công việc" : "Thêm công việc mới"}
          </h2>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="taskName">Tên công việc:</label>
          <input
            id="taskName"
            type="text"
            className="input"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Nhập tên công việc..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="taskDetail">Chi tiết:</label>
          <textarea
            id="taskDetail"
            className="input"
            value={taskDetail}
            onChange={(e) => setTaskDetail(e.target.value)}
            placeholder="Nhập chi tiết công việc..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="level">Mức độ quan trọng:</label>
          <select
            id="level"
            className="input"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            {levels.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="startTime">Thời gian bắt đầu:</label>
          <input
            id="startTime"
            type="datetime-local"
            className="input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="endTime">Thời gian kết thúc:</label>
          <input
            id="endTime"
            type="datetime-local"
            className="input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Huỷ
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
