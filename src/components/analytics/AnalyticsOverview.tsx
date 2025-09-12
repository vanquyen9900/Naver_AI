import { useState } from "react";
import type { AggregatedTask } from "../../services/task";
import { calculateTaskProgress } from "../../services/task";
import Timer from "../Timer";
import "../../styles/analytics/AnalyticsOverview.css";
import { TaskStatus } from "../../services/taskProgress";

interface Props {
  tasks: AggregatedTask[];
}

const AnalyticsOverview = ({ tasks }: Props) => {
  const [activeTimer, setActiveTimer] = useState<{
    taskId: string;
    taskName: string;
    endTime: Date;
  } | null>(null);

  const upcomingDeadlines = tasks.filter((task) => {
    if (!task.endTime) return false;
    const hoursLeft = (task.endTime.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 12;
  });

    const importantTasks = tasks.filter((task) => {
      // Only get parent tasks with level 1
      return task.level === 1 ;
    });

  return (
    <div className="analytics-overview">
      <section className="upcoming-deadlines">
        <h2>Upcoming Deadlines</h2>
        <div className="deadline-list">
          {upcomingDeadlines.map((task) => (
            <div key={task.id} className="deadline-item">
              <div className="task-info">
                <h3>{task.taskName}</h3>
                <p>{task.taskDetail}</p>
              </div>
              {task.endTime && (
                <div className="deadline-actions">
                  <div className="time-remaining">
                    {Math.round(
                      (task.endTime.getTime() - Date.now()) / (1000 * 60 * 60)
                    )}
                    h remaining
                  </div>
                  <button
                    className="timer-button"
                    onClick={() =>
                      task.endTime &&
                      setActiveTimer({
                        taskId: task.id,
                        taskName: task.taskName,
                        endTime: task.endTime,
                      })
                    }
                  >
                    ⏰ Set Timer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="important-tasks">
        <h2>Important Tasks Progress</h2>
        <div className="important-list">
          {importantTasks.map((task) => (
            <div key={task.id} className="important-item">
              <div className="task-info">
                <h3>{task.taskName}</h3>
                <p>{task.taskDetail}</p>
              </div>
              <div className="progress-section">
                <label className="progress-label">Progress</label>
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${calculateTaskProgress(task)}%`,
                      background:
                        task.progress?.status === TaskStatus.COMPLETED
                          ? "var(--success-gradient)"
                          : "var(--primary-gradient)",
                    }}
                  >
                    {calculateTaskProgress(task)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {activeTimer && (
        <Timer
          taskName={activeTimer.taskName}
          endTime={activeTimer.endTime}
          onClose={() => setActiveTimer(null)}
        />
      )}
    </div>
  );
};

export default AnalyticsOverview;
