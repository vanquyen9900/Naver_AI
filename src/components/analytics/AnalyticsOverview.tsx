import { useEffect, useState } from "react";
import type { AggregatedTask } from "../../services/task";
import "../../styles/analytics/AnalyticsOverview.css";

interface Props {
  tasks: AggregatedTask[];
}

interface TaskWithProgress {
  task: AggregatedTask;
  progressPercentage: number;
}

const AnalyticsOverview = ({ tasks }: Props) => {
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<AggregatedTask[]>(
    []
  );
  const [importantTasks, setImportantTasks] = useState<TaskWithProgress[]>([]);

  useEffect(() => {
    // Get tasks with deadlines within next 12 hours
    const now = new Date();
    const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const upcoming = tasks.filter((task) => {
      if (!task.endTime) return false;
      return task.endTime > now && task.endTime <= twelveHoursLater;
    });

    // Get very important tasks (level 1) with progress calculation
    const important = tasks
      .filter((task) => task.level === 1)
      .map((task) => {
        const progress = calculateTaskProgress(task);
        return { task, progressPercentage: progress };
      });

    setUpcomingDeadlines(upcoming);
    setImportantTasks(important);
  }, [tasks]);

  const calculateTaskProgress = (task: AggregatedTask): number => {
    if (!task.children?.length) {
      return task.progress?.status === 3 ? 100 : 0;
    }

    const completedChildren = task.children.filter(
      (child) => child.progress?.status === 3
    ).length;

    return Math.round((completedChildren / task.children.length) * 100);
  };

  const getTimeRemaining = (endTime: Date): string => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

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
                <div className="time-remaining">
                  {getTimeRemaining(task.endTime)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="important-tasks">
        <h2>Important Tasks Progress</h2>
        <div className="important-list">
          {importantTasks.map(({ task, progressPercentage }) => (
            <div key={task.id} className="important-item">
              <div className="task-info">
                <h3>{task.taskName}</h3>
                <p>{task.taskDetail}</p>
              </div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{ width: `${progressPercentage}%` }}
                >
                  {progressPercentage}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AnalyticsOverview;
