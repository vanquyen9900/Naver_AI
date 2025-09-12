import type { AggregatedTask } from "../../services/task";
import { TaskStatus } from "../../services/taskProgress";
import "../../styles/analytics/AnalyticsSummary.css";

interface Props {
  tasks: AggregatedTask[];
}

const AnalyticsSummary = ({ tasks }: Props) => {
  const incompleteTasks = tasks.filter(
    (task) => task.progress?.status !== TaskStatus.COMPLETED
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.progress?.status === TaskStatus.COMPLETED
  ).length;

  const overdueTasks = tasks.filter((task) => {
    if (!task.endTime) return false;
    return (
      new Date() > task.endTime &&
      task.progress?.status !== TaskStatus.COMPLETED
    );
  }).length;

  return (
    <div className="analytics-summary">
      <div className="summary-card incomplete">
        <h3>Incomplete Tasks</h3>
        <div className="count">{incompleteTasks}</div>
      </div>

      <div className="summary-card complete">
        <h3>Completed Tasks</h3>
        <div className="count">{completedTasks}</div>
      </div>

      <div className="summary-card overdue">
        <h3>Overdue Tasks</h3>
        <div className="count">{overdueTasks}</div>
      </div>
    </div>
  );
};

export default AnalyticsSummary;
