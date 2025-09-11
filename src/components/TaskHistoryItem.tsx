import React, { useState, useCallback } from "react";
import {
  type TaskItem,
  type TaskChild,
  LEVEL_LABELS,
} from "../services/firestore";
import { TaskStatus, updateTaskProgress } from "../services/taskProgress";
import { toast } from "react-toastify";
import "../styles/TaskHistoryItem.css";

interface Props {
  task: TaskItem;
  childTasks: TaskChild[];
  taskStatus: TaskStatus;
  childStatuses: Record<string, TaskStatus>;
  onStatusUpdate?: () => void;
}

const TaskHistoryItem: React.FC<Props> = ({
  task,
  childTasks,
  taskStatus,
  childStatuses,
  onStatusUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const formatDate = useCallback((date: Date | null | undefined) => {
    if (!date) return null;
    return {
      date: new Date(date).toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      time: new Date(date).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }, []);

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      await updateTaskProgress(task.id, TaskStatus.NOT_STARTED);
      onStatusUpdate?.();
      toast.success("Đã khôi phục công việc thành công!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      toast.error("Không thể khôi phục công việc", {
        position: "top-right",
        autoClose: 3000,
      });
      console.error("Error restoring task:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  // Status label memoization
  const getStatusLabel = useCallback((status: TaskStatus) => {
    const labels = {
      [TaskStatus.COMPLETED]: { icon: "✅", text: "Đã hoàn thành" },
      [TaskStatus.IN_PROGRESS]: { icon: "⏳", text: "Đang thực hiện" },
      [TaskStatus.CANCELLED]: { icon: "❌", text: "Đã huỷ bỏ" },
      [TaskStatus.NOT_STARTED]: { icon: "⭕", text: "Chưa bắt đầu" },
    };
    return labels[status] || labels[TaskStatus.NOT_STARTED];
  }, []);

  const renderTimeInfo = useCallback(
    (startTime: Date | null | undefined, endTime: Date | null | undefined) => {
      const start = formatDate(startTime);
      const end = formatDate(endTime);

      return (
        <div className="time-info">
          {start && (
            <div className="time-item">
              <span className="time-label">Bắt đầu:</span>
              <div className="time-value">
                <div>{start.date}</div>
                <div className="time-detail">⏰ {start.time}</div>
              </div>
            </div>
          )}
          {end && (
            <div className="time-item">
              <span className="time-label">Kết thúc:</span>
              <div className="time-value">
                <div>{end.date}</div>
                <div className="time-detail">⏰ {end.time}</div>
              </div>
            </div>
          )}
        </div>
      );
    },
    [formatDate]
  );

  return (
    <div className={`history-item ${isExpanded ? "expanded" : ""}`}>
      <div className="history-item-header">
        <div
          className="header-content"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="task-main-info">
            <h3>{task.task_name}</h3>
            {task.task_detail && <p>{task.task_detail}</p>}
            <div className="task-meta">
              <span className={`task-level level-${task.level}`}>
                {task.level ? LEVEL_LABELS[task.level] : "Chưa phân loại"}
              </span>
              <span className={`task-status status-${taskStatus}`}>
                {getStatusLabel(taskStatus).icon}{" "}
                {getStatusLabel(taskStatus).text}
              </span>
            </div>
          </div>
          {renderTimeInfo(task.start_time, task.end_time)}
        </div>
        <div className="action-buttons">
          {taskStatus === TaskStatus.CANCELLED && (
            <button
              className="restore-btn"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? "Đang khôi phục..." : "🔄 Khôi phục"}
            </button>
          )}
          <button
            className={`expand-btn ${isExpanded ? "expanded" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Thu gọn" : "Mở rộng"}
          >
            ▼
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="child-tasks-container">
          {childTasks.length > 0 ? (
            childTasks.map((child) => (
              <div key={child.id} className="child-task-item">
                <div className="header-content">
                  <div className="task-main-info">
                    <h4>{child.task_name}</h4>
                    {child.task_detail && <p>{child.task_detail}</p>}
                    <div className="task-meta">
                      <span className={`task-level level-${child.level}`}>
                        {child.level
                          ? LEVEL_LABELS[child.level]
                          : "Chưa phân loại"}
                      </span>
                      <span
                        className={`task-status status-${
                          childStatuses[child.id]
                        }`}
                      >
                        {getStatusLabel(childStatuses[child.id]).icon}
                        {getStatusLabel(childStatuses[child.id]).text}
                      </span>
                    </div>
                  </div>
                  {renderTimeInfo(child.start_time, child.end_time)}
                </div>
              </div>
            ))
          ) : (
            <div className="no-children">
              <p>Chưa có công việc con nào.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(TaskHistoryItem);
