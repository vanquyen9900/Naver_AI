import React, { useState, useEffect, useCallback } from "react";
import { type TaskChild } from "../services/firestore";
import { auth } from "../services/firebase";
import { toast } from "react-toastify";
import "../styles/ChildTaskModal.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (newChild: Omit<TaskChild, "id" | "parent_id">) => void;
  parentStartTime?: string;
  parentEndTime?: string;
  editTask?: TaskChild | null;
  onEdit?: (task: TaskChild) => void;
}

const levels = [
  { value: 1, label: "Rất quan trọng" },
  { value: 2, label: "Quan trọng" },
  { value: 3, label: "Bình thường" },
  { value: 4, label: "Thường ngày" },
  { value: 5, label: "Rảnh rỗi" },
];

const CreateChildTaskModal: React.FC<Props> = ({
  open,
  onClose,
  onSaved,
  parentStartTime,
  parentEndTime,
  editTask,
  onEdit,
}) => {
  const [childName, setChildName] = useState("");
  const [childDetail, setChildDetail] = useState("");
  const [childLevel, setChildLevel] = useState(3);
  const [childStartTime, setChildStartTime] = useState("");
  const [childEndTime, setChildEndTime] = useState("");

  const resetForm = useCallback(() => {
    setChildName("");
    setChildDetail("");
    setChildLevel(3);
    setChildStartTime(parentStartTime || "");
    setChildEndTime(parentEndTime || "");
  }, [parentStartTime, parentEndTime]);

  useEffect(() => {
    if (editTask) {
      setChildName(editTask.task_name);
      setChildDetail(editTask.task_detail);
      setChildLevel(editTask.level || 3);
      setChildStartTime(editTask.start_time?.toISOString().slice(0, 16) || "");
      setChildEndTime(editTask.end_time?.toISOString().slice(0, 16) || "");
    } else {
      resetForm();
    }
  }, [editTask, resetForm]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  const handleSave = async () => {
    if (!auth.currentUser) {
      toast.error("Bạn chưa đăng nhập");
      return;
    }
    if (!childName.trim() || !childDetail.trim()) {
      toast.error("Tên và chi tiết công việc con không được để trống");
      return;
    }

    try {
      if (editTask && onEdit) {
        const updatedTask: TaskChild = {
          ...editTask,
          task_name: childName,
          task_detail: childDetail,
          level: childLevel,
          start_time: childStartTime ? new Date(childStartTime) : null,
          end_time: childEndTime ? new Date(childEndTime) : null,
        };
        onEdit(updatedTask);
        toast.success("Đã cập nhật công việc con");
      } else {
        const newChild: Omit<TaskChild, "id" | "parent_id"> = {
          task_name: childName,
          task_detail: childDetail,
          user_id: auth.currentUser.uid,
          level: childLevel,
          start_time: childStartTime ? new Date(childStartTime) : null,
          end_time: childEndTime ? new Date(childEndTime) : null,
          createdAt: new Date(),
        };
        onSaved(newChild);
        toast.success("Đã thêm công việc con");
      }
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(editTask ? "Không thể cập nhật" : "Không thể thêm");
    }
  };

  return (
    <div className="modal-overlay animate-fadeIn">
      <div className="modal-box animate-slideIn">
        <div className="modal-header">
          <h3 className="modal-title">
            {editTask ? "Sửa công việc con" : "Thêm công việc con"}
          </h3>
          <button className="btn-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="form-group">
          <label>Tên công việc *</label>
          <input
            type="text"
            className="input"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Nhập tên công việc con"
          />
        </div>
        <div className="form-group">
          <label>Chi tiết *</label>
          <textarea
            className="input"
            value={childDetail}
            onChange={(e) => setChildDetail(e.target.value)}
            placeholder="Nhập chi tiết công việc con"
            rows={4}
          />
        </div>
        <div className="form-group">
          <label>Mức độ</label>
          <select
            className="input"
            value={childLevel}
            onChange={(e) => setChildLevel(Number(e.target.value))}
          >
            {levels.map((lv) => (
              <option key={lv.value} value={lv.value}>
                {lv.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Bắt đầu</label>
          <input
            type="datetime-local"
            className="input"
            value={childStartTime}
            onChange={(e) => setChildStartTime(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Kết thúc</label>
          <input
            type="datetime-local"
            className="input"
            value={childEndTime}
            onChange={(e) => setChildEndTime(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleClose}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {editTask ? "Cập nhật" : "Thêm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChildTaskModal;
