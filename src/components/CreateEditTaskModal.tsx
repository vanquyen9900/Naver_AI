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
  { value: 1, label: "Very Important" },
  { value: 2, label: "Important" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Routine" },
  { value: 5, label: "Leisure" },
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
      if (defaultStart) {
        setStartTime(new Date(defaultStart).toISOString().slice(0, 16));
      }
      if (defaultEnd) {
        setEndTime(new Date(defaultEnd).toISOString().slice(0, 16));
      }
    }
  }, [edit, defaultStart, defaultEnd]);

  // Thêm hàm validate
  const validateDates = (start: string, end: string): string | null => {
    const now = new Date();
    const startDate = start ? new Date(start) : null;

    if (!edit && startDate && startDate < now) {
      return "Start time cannot be in the past";
    }

    if (start && end && new Date(start) > new Date(end)) {
      return "Start time must be before end time";
    }

    return null;
  };

  // Sửa hàm handleSave
  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You are not logged in");
      return;
    }

    if (!taskName.trim()) {
      toast.error("Task name cannot be empty");
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
      toast.success(edit ? "Update successful" : "Added successfully");
      onClose();
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay animate-fadeIn">
      <div className="modal-box animate-slideIn">
        <div className="modal-header">
          <h2 className="modal-title">
            {edit ? "Edit Task" : "Add New Task"}
          </h2>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="taskName">Task Name:</label>
          <input
            id="taskName"
            type="text"
            className="input"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Enter task name..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="taskDetail">Details:</label>
          <textarea
            id="taskDetail"
            className="input"
            value={taskDetail}
            onChange={(e) => setTaskDetail(e.target.value)}
            placeholder="Enter task details..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="level">Priority Level:</label>
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
          <label htmlFor="startTime">Start Time:</label>
          <input
            id="startTime"
            type="datetime-local"
            className="input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="endTime">End Time:</label>
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
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {edit ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEditTaskModal;
