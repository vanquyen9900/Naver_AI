import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AggregatedTask } from "../../services/task";
import { TaskStatus } from "../../services/taskProgress";
import "../../styles/analytics/AnalyticsReport.css";

interface WeeklyWorkload {
  day: string;
  totalTasks: number;
  completedTasks: number;
}

interface TimeFrameStats {
  total: number;
  completed: number;
  incomplete: number;
  percentage: number;
}

interface TaskTrend {
  date: string;
  total: number;
  completed: number;
  progress: number;
}

interface Props {
  tasks: AggregatedTask[];
}

const AnalyticsReport = ({ tasks }: Props) => {
  const [dailyStats, setDailyStats] = useState<TimeFrameStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<TimeFrameStats>();
  const [monthlyStats, setMonthlyStats] = useState<TimeFrameStats>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [yearlyStats, setYearlyStats] = useState<TimeFrameStats>();
  const [taskTrends, setTaskTrends] = useState<TaskTrend[]>([]);
  const [weeklyWorkload, setWeeklyWorkload] = useState<WeeklyWorkload[]>([]);
  const [todayStats, setTodayStats] = useState<TimeFrameStats>();

  useEffect(() => {
    console.log("Input tasks:", tasks);

    // Lọc task cha
    const parentTasks = tasks.filter((task) => Array.isArray(task.children));
    console.log("Parent tasks:", parentTasks);

    const calculateStats = (
      filteredTasks: AggregatedTask[]
    ): TimeFrameStats => {
      const completed = filteredTasks.filter(
        (task) => task.progress?.status === TaskStatus.COMPLETED
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

    const calculateTodayStats = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTasks = parentTasks.filter((task) => {
        if (!task.startTime) return false;
        const taskDate = new Date(task.startTime);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });

      setTodayStats(calculateStats(todayTasks));
    };

    // Weekly Workload - Sử dụng updatedAt và status
    const calculateWeeklyWorkload = () => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      // Initialize workload array
      const workload = days.map((day) => ({
        day,
        totalTasks: 0,
        completedTasks: 0,
      }));

      // Get start and end of current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Process each parent task
      parentTasks.forEach((task) => {
        if (task.startTime && task.endTime) {
          const taskStart = new Date(task.startTime);
          const taskEnd = new Date(task.endTime);

          // Check if task falls within this week
          if (taskStart <= endOfWeek && taskEnd >= startOfWeek) {
            // Get all days this task spans
            const currentDay = new Date(
              Math.max(taskStart.getTime(), startOfWeek.getTime())
            );
            const lastDay = new Date(
              Math.min(taskEnd.getTime(), endOfWeek.getTime())
            );

            while (currentDay <= lastDay) {
              const dayIndex = currentDay.getDay();
              workload[dayIndex].totalTasks += 1;
              currentDay.setDate(currentDay.getDate() + 1);
            }
          }

          // Check completed tasks using completedAt instead of updatedAt
          if (task.progress?.status === TaskStatus.COMPLETED) {
            const completedDate = new Date(task.progress.completedAt!);
            if (completedDate >= startOfWeek && completedDate <= endOfWeek) {
              const completedDayIndex = completedDate.getDay();
              workload[completedDayIndex].completedTasks += 1;
            }
          }
        }
      });

      console.log("Weekly workload calculated:", {
        startOfWeek,
        endOfWeek,
        workload,
      });
      setWeeklyWorkload(workload);
    };
    // Daily Performance Stats - Sử dụng updatedAt và status
    const calculateDailyStats = () => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        return date;
      });

      const stats = last7Days.map((date) => {
        const dayTasks = parentTasks.filter((task) => {
          if (!task.progress?.updatedAt) return false;
          const taskDate = new Date(task.progress.updatedAt);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() === date.getTime();
        });
        return calculateStats(dayTasks);
      });

      setDailyStats(stats);
    };

    // Weekly Stats - Không sử dụng updatedAt
    const calculateWeeklyStats = () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weekTasks = parentTasks.filter(
        (task) => task.startTime && new Date(task.startTime) >= weekAgo
      );
      setWeeklyStats(calculateStats(weekTasks));
    };

    // Monthly Stats - Không sử dụng updatedAt
    const calculateMonthlyStats = () => {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const monthTasks = parentTasks.filter(
        (task) => task.startTime && new Date(task.startTime) >= monthAgo
      );
      setMonthlyStats(calculateStats(monthTasks));
    };

    // Task Trends - Không sử dụng updatedAt
    const calculateTaskTrends = () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trends: TaskTrend[] = [];
      for (let i = 0; i < 6; i++) {
        const startDate = new Date(thirtyDaysAgo);
        startDate.setDate(startDate.getDate() + i * 5);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 4);

        const periodTasks = parentTasks.filter(
          (task) =>
            task.startTime &&
            new Date(task.startTime) >= startDate &&
            new Date(task.startTime) <= endDate
        );

        trends.push({
          date: startDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          total: periodTasks.length,
          completed: periodTasks.filter(
            (task) => task.progress?.status === TaskStatus.COMPLETED
          ).length,
          progress: periodTasks.length
            ? Math.round(
                (periodTasks.filter(
                  (task) => task.progress?.status === TaskStatus.COMPLETED
                ).length /
                  periodTasks.length) *
                  100
              )
            : 0,
        });
      }
      setTaskTrends(trends);
    };

    calculateWeeklyWorkload();
    calculateDailyStats();
    calculateWeeklyStats();
    calculateMonthlyStats();
    calculateTaskTrends();
    calculateTodayStats();
  }, [tasks]);

  return (
    <div className="analytics-report">
      <div className="report-summary">
        {/* Weekly Overview Card */}
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

        {/* Monthly Overview Card */}
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

        {/* Yearly Overview Card */}
        <div className="summary-card">
          <h3>Today's Overview</h3>
          <div className="stat-grid">
            <div className="stat">
              <span>Total</span>
              <strong>{todayStats?.total}</strong>
            </div>
            <div className="stat">
              <span>Completed</span>
              <strong className="completed">{todayStats?.completed}</strong>
            </div>
            <div className="stat">
              <span>Success Rate</span>
              <strong>{todayStats?.percentage}%</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-container">
        {/* Task Progress Trends Chart */}
        <div className="chart-section">
          <h3>Task Progress Trends</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={taskTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Total Tasks"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="completed"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="Completed Tasks"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="progress"
                  stroke="#ff7300"
                  name="Progress %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Workload Distribution Chart */}
        <div className="chart-section">
          <h3>Weekly Workload Distribution</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={weeklyWorkload}
                margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis
                  label={{
                    value: "Number of Tasks",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  content={({ payload, label }) => (
                    <div className="custom-tooltip">
                      <p className="time-slot">{label}</p>
                      <p>Total Tasks: {payload?.[0]?.payload.totalTasks}</p>
                      <p>Completed: {payload?.[0]?.payload.completedTasks}</p>
                      <p>
                        Completion Rate:{" "}
                        {payload?.[0]?.payload.totalTasks > 0
                          ? Math.round(
                              (payload?.[0]?.payload.completedTasks /
                                payload?.[0]?.payload.totalTasks) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  )}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalTasks"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                  name="Total Tasks"
                />
                <Area
                  type="monotone"
                  dataKey="completedTasks"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                  name="Completed Tasks"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Performance Chart */}
      <div className="daily-chart">
        <h3>Last 7 Days Performance</h3>
        <div className="chart">
          {dailyStats.map((stat, index) => (
            <div key={index} className="chart-bar">
              <div
                className="bar"
                data-value={
                  stat.percentage >= 67
                    ? "high"
                    : stat.percentage >= 34
                    ? "medium"
                    : "low"
                }
                style={{ height: `${stat.percentage}%` }}
              >
                <span
                  className="percentage"
                  data-value={
                    stat.percentage >= 67
                      ? "high"
                      : stat.percentage >= 34
                      ? "medium"
                      : "low"
                  }
                >
                  {stat.percentage}%
                </span>
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
