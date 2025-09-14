import React, { useState, useEffect, useCallback, useMemo } from "react";
import { type TaskItem, LEVEL_LABELS } from "../services/firestore";
import "../styles/TaskList.css";
import TaskDetailModal from "./TaskDetailModal";
import {
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  updateTaskProgress,
  getTaskProgress,
} from "../services/taskProgress";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  tasks: TaskItem[];
  onEdit: (t: TaskItem) => void;
}

const TaskList: React.FC<Props> = ({ tasks, onEdit }) => {
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  const loadTaskStatuses = useCallback(async () => {
    try {
      const statuses = await Promise.all(
        tasks.map(async (task) => {
          const progress = await getTaskProgress(task.id);
          return [task.id, progress?.task_status || TaskStatus.NOT_STARTED];
        })
      );
      setTaskStatuses(Object.fromEntries(statuses));
    } catch (error) {
      console.error("Error loading task statuses:", error);
      toast.error("Unable to load task statuses");
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tasks.length > 0 ? loadTaskStatuses() : setLoading(false);
  }, [tasks, loadTaskStatuses]);

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        await updateTaskProgress(taskId, status);
        setTaskStatuses((prev) => ({ ...prev, [taskId]: status }));
        toast.success("Updated successfully");
      } catch (err) {
        console.error(err);
        toast.error("Unable to update status");
      }
    },
    []
  );

  const formatDate = useCallback((date: Date | null | undefined) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleString("en-GB", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getStatusColor = useCallback(
    (status: TaskStatus) =>
      TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS[TaskStatus.NOT_STARTED],
    []
  );

  const sortedTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            taskStatuses[task.id] !== TaskStatus.CANCELLED &&
            taskStatuses[task.id] !== TaskStatus.COMPLETED
        )
        .sort((a, b) => {
          if (a.level !== b.level) return (a.level || 5 ) - (b.level || 5);
          return (
            (a.end_time?.getTime() || Infinity) -
            (b.end_time?.getTime() || Infinity)
          );
        }),
    [tasks, taskStatuses]
  );

  const isTaskOverdue = (task: TaskItem): boolean => {
    return task.end_time ? new Date() > new Date(task.end_time) : false;
  };

  const TaskCard = useCallback(
    ({ task }: { task: TaskItem }) => (
      <motion.div
        key={task.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="task-card"
        layout
      >
        <div
          className="task-status-ribbon"
          style={{
            backgroundColor: getStatusColor(taskStatuses[task.id]),
          }}
        >
          {taskStatuses[task.id] !== TaskStatus.COMPLETED && isTaskOverdue(task)
            ? "Overdue"
            : TASK_STATUS_LABELS[
                taskStatuses[task.id] || TaskStatus.NOT_STARTED
              ]}
        </div>

        <div className="task-header">
          <div className="task-main-info">
            <h3 className="task-title">{task.task_name}</h3>
            {task.task_detail && (
              <p className="task-detail">{task.task_detail}</p>
            )}
          </div>

          <div className="task-time-section">
            <div className="time-item">
              <span className="time-label">Start:</span>
              <span className="time-value">{formatDate(task.start_time)}</span>
            </div>
            <div className="time-item">
              <span className="time-label">End:</span>
              <span className="time-value">{formatDate(task.end_time)}</span>
            </div>
          </div>
        </div>

        <div className="task-footer">
          <div className="task-info-section">
            <div className={`task-level level-${task.level || 0}`}>
              {task.level ? LEVEL_LABELS[task.level] : "Uncategorized"}
            </div>
          </div>

          <div className="task-actions">
            <button
              className="btn btn-view"
              onClick={() => {
                setSelectedTask(task);
                setShowDetail(true);
              }}
            >
              👁️ View Details
            </button>
            <button className="btn btn-edit" onClick={() => onEdit(task)}>
              ✏️ Edit
            </button>
            <select
              className="status-select"
              value={taskStatuses[task.id] || TaskStatus.NOT_STARTED}
              onChange={(e) =>
                handleStatusChange(
                  task.id,
                  Number(e.target.value) as TaskStatus
                )
              }
              style={{
                backgroundColor: getStatusColor(
                  taskStatuses[task.id] || TaskStatus.NOT_STARTED
                ),
                color: "white",
              }}
            >
              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>
    ),
    [taskStatuses, getStatusColor, formatDate, handleStatusChange, onEdit]
  );

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!sortedTasks.length) {
    return (
      <div className="empty-state">
        <h3>No tasks available</h3>
        <p>Create a new task to get started! ✨</p>
      </div>
    );
  }

  return (
    <>
      <div className="task-list-container">
        <AnimatePresence>
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </AnimatePresence>
      </div>

      <TaskDetailModal
        open={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
      />
    </>
  );
};

export default React.memo(TaskList);
