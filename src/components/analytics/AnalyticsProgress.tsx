import { useState } from "react";
import type { AggregatedTask } from "../../services/task";
import { TaskStatus } from "../../services/taskProgress";
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
    if (!task.children?.length) {
      return task.progress?.status === TaskStatus.COMPLETED ? 100 : 0;
    }

    const completedChildren = task.children.filter(
      (child) => child.progress?.status === TaskStatus.COMPLETED
    ).length;

    return Math.round((completedChildren / task.children.length) * 100);
  };

  return (
    <div className="analytics-progress">
      <div className="progress-list">
        {tasks.map((task) => (
          <div key={task.id} className="task-item">
            <div className="task-header" onClick={() => toggleTask(task.id)}>
              <div className="task-info">
                <span
                  className={`expand-icon ${
                    expandedTasks.has(task.id) ? "expanded" : ""
                  }`}
                >
                  ▶
                </span>
                <h3>{task.taskName}</h3>
                <span className="level-badge">Level {task.level}</span>
              </div>

              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${calculateProgress(task)}%` }}
                >
                  {calculateProgress(task)}%
                </div>
              </div>
            </div>

            {expandedTasks.has(task.id) && task.children && (
              <div className="subtasks">
                {task.children.map((child) => (
                  <div key={child.id} className="subtask-item">
                    <div className="subtask-info">
                      <h4>{child.taskName}</h4>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor:
                            child.progress?.status === TaskStatus.COMPLETED
                              ? "#00b894"
                              : "#ffc107",
                        }}
                      >
                        {child.progress?.status === TaskStatus.COMPLETED
                          ? "Completed"
                          : "In Progress"}
                      </span>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar"
                        style={{
                          width:
                            child.progress?.status === TaskStatus.COMPLETED
                              ? "100%"
                              : "0%",
                        }}
                      >
                        {child.progress?.status === TaskStatus.COMPLETED
                          ? "100%"
                          : "0%"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsProgress;
