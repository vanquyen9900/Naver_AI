import { useState } from "react";
import { TaskStatus } from "../../services/taskProgress";
import type { AggregatedTask } from "../../services/task";
import "../../styles/analytics/AnalyticsProgress.css";

interface Props {
  tasks: AggregatedTask[];
}

const AnalyticsProgress = ({ tasks }: Props) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const calculateProgress = (task: AggregatedTask): number => {
    if (task.progress?.status === TaskStatus.COMPLETED) {
      return 100;
    }

    if (!task.children || task.children.length === 0) {
      return 0;
    }

    const totalChildren = task.children.length;
    const completedChildren = task.children.filter(
      (child) => child.progress?.status === TaskStatus.COMPLETED
    ).length;

    return Math.round((completedChildren / totalChildren) * 100);
  };

  const formatEndTime = (date: Date | undefined): string => {
    if (!date) return "No deadline";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="analytics-progress">
      <div className="progress-table-container">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Detail</th>
              <th>End Time</th>
              <th>Progress</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <>
                <tr
                  key={task.id}
                  className="task-row"
                  onClick={() => toggleTask(task.id)}
                >
                  <td className="task-name">
                    <span
                      className={`expand-icon ${
                        expandedTasks.has(task.id) ? "expanded" : ""
                      }`}
                    >
                      ▶
                    </span>
                    {task?.taskName}
                  </td>
                  <td className="task-detail">{task.taskDetail || "-"}</td>
                  <td className="task-deadline">
                    {formatEndTime(task?.endTime ?? undefined)}
                  </td>
                  <td className="task-progress">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${calculateProgress(task)}%`,
                          background:
                            task.progress?.status === TaskStatus.COMPLETED
                              ? "var(--success-gradient)"
                              : "var(--primary-gradient)",
                        }}
                      >
                        {calculateProgress(task)}%
                      </div>
                    </div>
                  </td>
                  <td className="task-priority">
                    <span
                      className={`priority-badge level-${
                        task.level || "normal"
                      }`}
                    >
                      {task.level || "Normal"}
                    </span>
                  </td>
                </tr>
                {expandedTasks.has(task.id) && task.children && (
                  <>
                    {task.children.map((child) => (
                      <tr key={child.id} className="subtask-row">
                        <td className="subtask-name">
                          <span className="subtask-indent">└─</span>
                          {child.taskName}
                        </td>
                        <td className="task-detail">
                          {child.taskDetail || "-"}
                        </td>
                        <td className="task-deadline">
                          {formatEndTime(child.endTime ?? undefined)}
                        </td>
                        <td className="task-progress">
                          <span
                            className={`status-badge ${
                              child.progress?.status === TaskStatus.COMPLETED
                                ? "completed"
                                : "in-progress"
                            }`}
                          >
                            {child.progress?.status === TaskStatus.COMPLETED
                              ? "Completed"
                              : "In Progress"}
                          </span>
                        </td>
                        <td className="task-priority">
                          <span
                            className={`priority-badge level-${
                              child.level || "normal"
                            }`}
                          >
                            {child.level || "Normal"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsProgress;
