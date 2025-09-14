import React, { useState, useEffect } from "react";
import {
  type TaskItem,
  type TaskChild,
  LEVEL_LABELS,
  getChildTasksByParentId,
  createChildTask,
  // updateChildTask,
} from "../services/firestore";
import {
  TaskStatus,
  updateTaskProgress,
  getTaskProgress,
} from "../services/taskProgress";
import { toast } from "react-toastify";
import { auth } from "../services/firebase";
import CreateChildTaskModal from "./CreateChildTaskModal";
import "../styles/TaskDetailModal.css";

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
  const [editingTask, setEditingTask] = useState<TaskChild | null>(null);

  useEffect(() => {
    const loadChildTasks = async () => {
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
        toast.error("Unable to load subtasks");
      } finally {
        setLoading(false);
      }
    };

    if (open && task) {
      loadChildTasks();
    }
  }, [open, task]);

  const handleStatusToggle = async (childId: string) => {
    const currentStatus = childStatuses[childId];
    const newStatus =
      currentStatus === TaskStatus.COMPLETED
        ? TaskStatus.NOT_STARTED
        : TaskStatus.COMPLETED;

    try {
      await updateTaskProgress(childId, newStatus);
      setChildStatuses((prev) => ({ ...prev, [childId]: newStatus }));
    } catch (err) {
      console.error(err);
      toast.error("Unable to update status");
    }
  };

  const handleCancelRestore = async (childId: string) => {
    const currentStatus = childStatuses[childId];
    const newStatus =
      currentStatus === TaskStatus.CANCELLED
        ? TaskStatus.NOT_STARTED
        : TaskStatus.CANCELLED;

    try {
      await updateTaskProgress(childId, newStatus);
      setChildStatuses((prev) => ({ ...prev, [childId]: newStatus }));
      toast.success(
        newStatus === TaskStatus.CANCELLED
          ? "Task cancelled"
          : "Task restored"
      );
    } catch (err) {
      console.error(err);
      toast.error("Unable to update status");
    }
  };

  const handleEditTask = (childTask: TaskChild) => {
    setEditingTask(childTask);
    setShowAddChildModal(true);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Sort tasks: active first, then cancelled
  const sortedChildTasks = [...childTasks].sort((a, b) => {
    const statusA = childStatuses[a.id] === TaskStatus.CANCELLED ? 1 : 0;
    const statusB = childStatuses[b.id] === TaskStatus.CANCELLED ? 1 : 0;
    if (statusA !== statusB) return statusA - statusB;
    // If same status, sort by level then by end time
    if (a.level !== b.level) return (a.level || 5) - (b.level || 5);
    return (a.end_time?.getTime() || 0) - (b.end_time?.getTime() || 0);
  });

  if (!open || !task) return null;

  return (
    <div className="detail-modal-overlay">
      <div className="detail-modal-content">
        <div className="detail-modal-header">
          <h2>{task.task_name}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="task-parent-info">
          <div className="task-meta">
            <span className={`task-level level-${task.level}`}>
              {task.level ? LEVEL_LABELS[task.level] : "Uncategorized"}
            </span>
          </div>
          <div className="task-dates">
            <div className="date-item">
              <span className="date-label">Start:</span>
              <span className="date-value">{formatDate(task.start_time)}</span>
            </div>
            <div className="date-item">
              <span className="date-label">End:</span>
              <span className="date-value">{formatDate(task.end_time)}</span>
            </div>
          </div>
        </div>

        <div className="child-tasks-section">
          <div className="section-header">
            <h3>Subtasks</h3>
            <button
              className="add-child-btn"
              onClick={() => {
                setEditingTask(null);
                setShowAddChildModal(true);
              }}
            >
              ➕ Add Subtask
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Loading subtasks...</p>
            </div>
          ) : sortedChildTasks.length > 0 ? (
            <div className="child-tasks-list">
              {sortedChildTasks.map((child, index) => (
                <div
                  key={child.id}
                  className={`child-task-item ${
                    childStatuses[child.id] === TaskStatus.CANCELLED
                      ? "cancelled"
                      : ""
                  }`}
                  style={{ "--index": index } as React.CSSProperties}
                >
                  <div className="task-checkbox">
                    <input
                      type="checkbox"
                      checked={childStatuses[child.id] === TaskStatus.COMPLETED}
                      onChange={() => handleStatusToggle(child.id)}
                      disabled={
                        childStatuses[child.id] === TaskStatus.CANCELLED
                      }
                    />
                  </div>

                  <div className="task-content">
                    <div className="task-main">
                      <h4>{child.task_name}</h4>
                      {child.task_detail && <p>{child.task_detail}</p>}
                    </div>
                  </div>

                  <div className="task-metadata">
                    <div className="level-container">
                      <span className={`task-level level-${child.level}`}>
                        {child.level
                          ? LEVEL_LABELS[child.level]
                          : "Uncategorized"}
                      </span>
                    </div>
                    <div className="task-times">
                      <div className="time-item">
                        <i className="far fa-calendar-alt"></i>
                        <span>{formatDate(child.start_time)}</span>
                      </div>
                      <div className="time-item">
                        <i className="far fa-calendar-check"></i>
                        <span>{formatDate(child.end_time)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="task-actions">
                    {childStatuses[child.id] !== TaskStatus.CANCELLED && (
                      <button
                        className="action-btn edit"
                        onClick={() => handleEditTask(child)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      className={`action-btn ${
                        childStatuses[child.id] === TaskStatus.CANCELLED
                          ? "restore"
                          : "cancel"
                      }`}
                      onClick={() => handleCancelRestore(child.id)}
                      title={
                        childStatuses[child.id] === TaskStatus.CANCELLED
                          ? "Restore"
                          : "Cancel"
                      }
                    >
                      {childStatuses[child.id] === TaskStatus.CANCELLED
                        ? "🔄"
                        : "🗑️"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No subtasks yet</p>
              <p>Add a subtask to get started! ✨</p>
            </div>
          )}
        </div>

        <CreateChildTaskModal
          open={showAddChildModal}
          onClose={() => {
            setShowAddChildModal(false);
            setEditingTask(null);
          }}
          editTask={editingTask}
          onSaved={async (newChild) => {
            if (!task?.id || !auth.currentUser) return;

            try {
              const childId = await createChildTask(
                auth.currentUser.uid,
                task.id,
                newChild
              );

              const updatedChildren = await getChildTasksByParentId(task.id);
              setChildTasks(updatedChildren);

              setChildStatuses((prev) => ({
                ...prev,
                [childId]: TaskStatus.NOT_STARTED,
              }));

              toast.success(
                editingTask ? "Subtask updated" : "Subtask added"
              );
              setShowAddChildModal(false);
              setEditingTask(null);
            } catch (err) {
              console.error(err);
              toast.error(
                editingTask
                  ? "Unable to update subtask"
                  : "Unable to add subtask"
              );
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
