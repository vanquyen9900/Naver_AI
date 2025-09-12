import { useEffect, useState } from "react";
import type { AggregatedTask } from "../../services/task";
import { TaskStatus } from "../../services/taskProgress";
import "../../styles/analytics/AnalyticsReport.css";

interface TimeFrameStats {
  total: number;
  completed: number;
  incomplete: number;
  percentage: number;
}

interface Props {
  tasks: AggregatedTask[];
}

const AnalyticsReport = ({ tasks }: Props) => {
  const [dailyStats, setDailyStats] = useState<TimeFrameStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<TimeFrameStats>();
  const [monthlyStats, setMonthlyStats] = useState<TimeFrameStats>();
  const [yearlyStats, setYearlyStats] = useState<TimeFrameStats>();

  useEffect(() => {
    const calculateStats = (
      filteredTasks: AggregatedTask[]
    ): TimeFrameStats => {
      const completed = filteredTasks.filter(
        (t) => t.progress?.status === TaskStatus.COMPLETED
      ).length;

      return {
        total: filteredTasks.length,
        completed,
        incomplete: filteredTasks.length - completed,
        percentage: filteredTasks.length
          ? Math.round((completed / filteredTasks.length) * 100)
          : 0,
      };
    };

    // Calculate daily stats for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    });

    const dailyStats = last7Days.map((date) => {
      const dayTasks = tasks.filter(
        (task) => task.createdAt?.toDateString() === date.toDateString()
      );
      return calculateStats(dayTasks);
    });

    // Weekly stats
    const weekTasks = tasks.filter((task) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return task.createdAt && task.createdAt >= weekAgo;
    });

    // Monthly stats
    const monthTasks = tasks.filter((task) => {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return task.createdAt && task.createdAt >= monthAgo;
    });

    // Yearly stats
    const yearTasks = tasks.filter((task) => {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return task.createdAt && task.createdAt >= yearAgo;
    });

    setDailyStats(dailyStats);
    setWeeklyStats(calculateStats(weekTasks));
    setMonthlyStats(calculateStats(monthTasks));
    setYearlyStats(calculateStats(yearTasks));
  }, [tasks]);

  return (
    <div className="analytics-report">
      <div className="report-summary">
        <div className="summary-card">
          <h3>Weekly Overview</h3>
          <div className="stat-grid">
            <div className="stat">
              <span>Total</span>
              <strong>{weeklyStats?.total}</strong>
            </div>
            <div className="stat">
              <span>Completed</span>
              <strong className="completed">{weeklyStats?.completed}</strong>
            </div>
            <div className="stat">
              <span>Success Rate</span>
              <strong>{weeklyStats?.percentage}%</strong>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Monthly Overview</h3>
          <div className="stat-grid">
            <div className="stat">
              <span>Total</span>
              <strong>{monthlyStats?.total}</strong>
            </div>
            <div className="stat">
              <span>Completed</span>
              <strong className="completed">{monthlyStats?.completed}</strong>
            </div>
            <div className="stat">
              <span>Success Rate</span>
              <strong>{monthlyStats?.percentage}%</strong>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Yearly Overview</h3>
          <div className="stat-grid">
            <div className="stat">
              <span>Total</span>
              <strong>{yearlyStats?.total}</strong>
            </div>
            <div className="stat">
              <span>Completed</span>
              <strong className="completed">{yearlyStats?.completed}</strong>
            </div>
            <div className="stat">
              <span>Success Rate</span>
              <strong>{yearlyStats?.percentage}%</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="daily-chart">
        <h3>Last 7 Days Performance</h3>
        <div className="chart">
          {dailyStats.map((stat, index) => (
            <div key={index} className="chart-bar">
              <div className="bar" style={{ height: `${stat.percentage}%` }}>
                <span className="percentage">{stat.percentage}%</span>
              </div>
              <span className="day">
                {new Date(
                  Date.now() - index * 24 * 60 * 60 * 1000
                ).toLocaleDateString("en-US", { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReport;
