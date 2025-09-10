import React, { useState, useEffect } from "react";
import {
  type TaskItem,
  type TaskChild,
  LEVEL_LABELS,
  getChildTasksByParentId,
  createChildTask,
} from "../services/firestore";
import {
  TaskStatus,
  updateTaskProgress,
  getTaskProgress,
} from "../services/taskProgress";
import { toast } from "react-toastify";
import "../styles/TaskDetailModal.css";
import CreateChildTaskModal from "./CreateChildTaskModal";
import { auth } from "../services/firebase";

interface Props {
  open: boolean;
  onClose: () => void;
  task: TaskItem | null;
}

const TaskDetailModal: React.FC<Props> = ({ open, onClose, task }) => {
  const [childTasks, setChildTasks] = useState<TaskChild[]>([]);
  const [childStatuses, setChildStatuses] = useState<
    Record<string, TaskStatus>
  >({});
  const [loading, setLoading] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedChildTask, setSelectedChildTask] = useState<TaskChild | null>(
    null
  );

  // Load child tasks and their statuses
  useEffect(() => {
    const loadChildTasksAndStatuses = async () => {
      if (!task?.id) return;

      setLoading(true);
      try {
        const children = await getChildTasksByParentId(task.id);
        setChildTasks(children);

        const statuses: Record<string, TaskStatus> = {};
        for (const child of children) {
          const progress = await getTaskProgress(child.id);
          statuses[child.id] = progress?.task_status || TaskStatus.NOT_STARTED;
        }
        setChildStatuses(statuses);
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải danh sách công việc con");
      } finally {
        setLoading(false);
      }
    };

    if (open && task) {
      loadChildTasksAndStatuses();
    }
  }, [open, task]);

  const handleStatusToggle = async (childId: string) => {
    const currentStatus = childStatuses[childId] || TaskStatus.NOT_STARTED;
    const newStatus =
      currentStatus === TaskStatus.COMPLETED
        ? TaskStatus.NOT_STARTED
        : TaskStatus.COMPLETED;

    try {
      await updateTaskProgress(childId, newStatus);
      setChildStatuses((prev) => ({ ...prev, [childId]: newStatus }));
      toast.success("Đã cập nhật trạng thái");
    } catch (err) {
      console.error(err);
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const handleCancelRestore = async (childId: string) => {
    const currentStatus = childStatuses[childId] || TaskStatus.NOT_STARTED;
    const newStatus =
      currentStatus === TaskStatus.CANCELLED
        ? TaskStatus.NOT_STARTED
        : TaskStatus.CANCELLED;

    try {
      await updateTaskProgress(childId, newStatus);
      setChildStatuses((prev) => ({ ...prev, [childId]: newStatus }));
      toast.success(
        newStatus === TaskStatus.CANCELLED
          ? "Đã huỷ công việc"
          : "Đã khôi phục công việc"
      );
    } catch (err) {
      console.error(err);
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const formatDate = (date: Date | null | undefined) => {
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
  };

  if (!open || !task) return null;

  return (
    <div className="detail-modal-overlay">
      <div className="detail-modal-content">
        <div className="detail-modal-header">
          <div className="task-info">
            <h2>{task.task_name}</h2>
            <div className="task-dates">
              {task.start_time && (
                <span>
                  Bắt đầu: {formatDate(task.start_time)?.date}
                  <br />
                  <span className="time-value">
                    ⏰ {formatDate(task.start_time)?.time}
                  </span>
                </span>
              )}
              {task.end_time && (
                <span>
                  Kết thúc: {formatDate(task.end_time)?.date}
                  <br />
                  <span className="time-value">
                    ⏰ {formatDate(task.end_time)?.time}
                  </span>
                </span>
              )}
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="detail-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowAddChildModal(true)}
          >
            ➕ Thêm công việc con
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Đang tải danh sách công việc con...</p>
          </div>
        ) : (
          <div className="notebook-tasks">
            {childTasks.length > 0 ? (
              childTasks.map((child) => (
                <div
                  key={child.id}
                  className={`child-task-item ${
                    childStatuses[child.id] === TaskStatus.CANCELLED
                      ? "child-task-cancelled"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    className="child-task-checkbox"
                    checked={childStatuses[child.id] === TaskStatus.COMPLETED}
                    onChange={() => handleStatusToggle(child.id)}
                    disabled={childStatuses[child.id] === TaskStatus.CANCELLED}
                  />
                  <div className="child-task-content">
                    <h4>{child.task_name}</h4>
                    {child.task_detail && <p>{child.task_detail}</p>}
                    <div className="child-task-meta">
                      <span className={`task-level level-${child.level}`}>
                        {child.level
                          ? LEVEL_LABELS[child.level]
                          : "Chưa phân loại"}
                      </span>
                      <div className="task-date">
                        {child.start_time && (
                          <span>
                            Bắt đầu: {formatDate(child.start_time)?.date}
                            <br />
                            <span className="time-value">
                              ⏰ {formatDate(child.start_time)?.time}
                            </span>
                          </span>
                        )}
                        {child.end_time && (
                          <span>
                            Kết thúc: {formatDate(child.end_time)?.date}
                            <br />
                            <span className="time-value">
                              ⏰ {formatDate(child.end_time)?.time}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    className={`status-toggle-btn ${
                      childStatuses[child.id] === TaskStatus.CANCELLED
                        ? "restore"
                        : "cancel"
                    }`}
                    onClick={() => handleCancelRestore(child.id)}
                    title={
                      childStatuses[child.id] === TaskStatus.CANCELLED
                        ? "Khôi phục"
                        : "Huỷ bỏ"
                    }
                  >
                    {childStatuses[child.id] === TaskStatus.CANCELLED
                      ? "🔄"
                      : "🗑️"}
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>Chưa có công việc con nào.</p>
                <p>Hãy thêm công việc con để bắt đầu! ✨</p>
              </div>
            )}
          </div>
        )}

        <CreateChildTaskModal
          open={showAddChildModal}
          onClose={() => {
            setShowAddChildModal(false);
            setSelectedChildTask(null);
          }}
          onSaved={async (newChild) => {
            if (!task?.id || !auth.currentUser) return;

            try {
              const childId = await createChildTask(
                auth.currentUser.uid,
                task.id,
                {
                  task_name: newChild.task_name,
                  task_detail: newChild.task_detail,
                  start_time: newChild.start_time,
                  end_time: newChild.end_time,
                  level: newChild.level,
                }
              );

              const updatedChildren = await getChildTasksByParentId(task.id);
              setChildTasks(updatedChildren);

              setChildStatuses((prev) => ({
                ...prev,
                [childId]: TaskStatus.NOT_STARTED,
              }));

              toast.success("Đã thêm công việc con");
              setShowAddChildModal(false);
            } catch (err) {
              console.error(err);
              toast.error("Không thể thêm công việc con");
            }
          }}
          parentStartTime={task.start_time?.toISOString().slice(0, 16)}
          parentEndTime={task.end_time?.toISOString().slice(0, 16)}
        />
      </div>
    </div>
  );
};

export default TaskDetailModal;
