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
  { value: 1, label: "Very Important" },
  { value: 2, label: "Important" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Routine" },
  { value: 5, label: "Leisure" },
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

  // Thêm hàm validate
  const validateDates = (start: string, end: string): string | null => {
    const now = new Date();
    const startDate = start ? new Date(start) : null;

    if (!editTask && startDate && startDate < now) {
      return "Start time cannot be in the past";
    }

    if (start && end && new Date(start) > new Date(end)) {
      return "Start time must be before end time";
    }

    return null;
  };

  // Sửa hàm handleSave
  const handleSave = async () => {
    if (!auth.currentUser) {
      toast.error("You are not logged in");
      return;
    }

    if (!childName.trim() || !childDetail.trim()) {
      toast.error("Task name and details cannot be empty");
      return;
    }

    // Thêm validate dates
    const dateError = validateDates(childStartTime, childEndTime);
    if (dateError) {
      toast.error(dateError);
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
        toast.success("Child task updated successfully");
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
        toast.success("Child task added successfully");
      }
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(editTask ? "Unable to update" : "Unable to add");
    }
  };

  return (
    <div className="modal-overlay animate-fadeIn">
      <div className="modal-box animate-slideIn">
        <div className="modal-header">
          <h3 className="modal-title">
            {editTask ? "Edit Child Task" : "Add Child Task"}
          </h3>
          <button className="btn-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="form-group">
          <label>Task Name *</label>
          <input
            type="text"
            className="input"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Enter child task name"
          />
        </div>
        <div className="form-group">
          <label>Details *</label>
          <textarea
            className="input"
            value={childDetail}
            onChange={(e) => setChildDetail(e.target.value)}
            placeholder="Enter child task details"
            rows={4}
          />
        </div>
        <div className="form-group">
          <label>Priority</label>
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
          <label>Start</label>
          <input
            type="datetime-local"
            className="input"
            value={childStartTime}
            onChange={(e) => setChildStartTime(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>End</label>
          <input
            type="datetime-local"
            className="input"
            value={childEndTime}
            onChange={(e) => setChildEndTime(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {editTask ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChildTaskModal;
