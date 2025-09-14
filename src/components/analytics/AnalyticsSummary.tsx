import { useState, useEffect } from "react";
import type { AggregatedTask } from "../../services/task";
import { TaskStatus } from "../../services/taskProgress";
import "../../styles/analytics/AnalyticsSummary.css";

interface Props {
  tasks: AggregatedTask[];
}

interface MonthlyStats {
  incomplete: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

const AnalyticsSummary = ({ tasks }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [currentMonthStats, setCurrentMonthStats] = useState<MonthlyStats>({
    incomplete: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0,
  });
  const [growthRate, setGrowthRate] = useState<number>(0);

  const getMonthlyStats = (
    date: Date,
    taskList: AggregatedTask[]
  ): MonthlyStats => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthTasks = taskList.filter((task) => {
      const taskDate = task.createdAt ? new Date(task.createdAt) : null;
      return taskDate && taskDate >= startOfMonth && taskDate <= endOfMonth;
    });

    const completed = monthTasks.filter(
      (task) => task.progress?.status === TaskStatus.COMPLETED
    ).length;

    const incomplete = monthTasks.filter(
      (task) => task.progress?.status !== TaskStatus.COMPLETED
    ).length;

    const overdue = monthTasks.filter((task) => {
      if (!task.endTime) return false;
      return (
        new Date() > task.endTime &&
        task.progress?.status !== TaskStatus.COMPLETED
      );
    }).length;

    const completionRate =
      monthTasks.length > 0 ? (completed / monthTasks.length) * 100 : 0;

    return {
      incomplete,
      completed,
      overdue,
      completionRate,
    };
  };

  useEffect(() => {
    // Calculate current month stats
    const currentStats = getMonthlyStats(selectedMonth, tasks);
    setCurrentMonthStats(currentStats);

    // Calculate previous month stats for growth rate
    const previousMonth = new Date(selectedMonth);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousStats = getMonthlyStats(previousMonth, tasks);

    // Calculate growth rate
    const growth =
      previousStats.completionRate > 0
        ? ((currentStats.completionRate - previousStats.completionRate) /
            previousStats.completionRate) *
          100
        : 0;

    setGrowthRate(growth);
  }, [tasks, selectedMonth]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month] = event.target.value.split("-");
    setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1));
  };

  return (
    <div className="monthly-summary">
      <div className="summary-header">
        <h2>Monthly Task Progress</h2>
        <input
          type="month"
          value={`${selectedMonth.getFullYear()}-${String(
            selectedMonth.getMonth() + 1
          ).padStart(2, "0")}`}
          onChange={handleMonthChange}
          className="month-picker"
        />
      </div>

      <div className="analytics-summary">
        <div className="summary-card incomplete">
          <h3>Incomplete Tasks</h3>
          <div className="count red">{currentMonthStats.incomplete}</div>
        </div>

        <div className="summary-card complete">
          <h3>Completion Rate</h3>
          <div className="count green">
            {currentMonthStats.completionRate.toFixed(1)}%
          </div>
        </div>

        <div className="summary-card overdue">
          <h3>Overdue Tasks</h3>
          <div className="count orange">{currentMonthStats.overdue}</div>
        </div>

        <div className="summary-card growth">
          <h3>Month-over-Month Growth</h3>
          <div className={`count ${growthRate >= 0 ? "green" : "red"}`}>
            {growthRate >= 0 ? "↑" : "↓"} {Math.abs(growthRate).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSummary;
