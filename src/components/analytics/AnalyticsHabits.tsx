import { useEffect, useState } from "react";
import type { AggregatedTask } from "../../services/task";
import { TaskStatus } from "../../services/taskProgress";
import "../../styles/analytics/AnalyticsHabits.css";

interface TaskPattern {
  category: string;
  completionRate: number;
  averageTime: number; // in hours
  recommendation: string;
}

interface Props {
  tasks: AggregatedTask[];
}

const AnalyticsHabits = ({ tasks }: Props) => {
  const [patterns, setPatterns] = useState<TaskPattern[]>([]);

  useEffect(() => {
    const analyzeTasks = () => {
      // Group tasks by importance level
      const tasksByLevel: Record<number, AggregatedTask[]> = {};
      tasks.forEach((task) => {
        const level = task.level || 5;
        tasksByLevel[level] = [...(tasksByLevel[level] || []), task];
      });

      const patterns: TaskPattern[] = [];

      Object.entries(tasksByLevel).forEach(([level, levelTasks]) => {
        const completed = levelTasks.filter(
          (t) => t.progress?.status === TaskStatus.COMPLETED
        );

        const completionRate = (completed.length / levelTasks.length) * 100;

        const avgTime =
          completed.reduce((sum, task) => {
            if (task.startTime && task.endTime) {
              return sum + (task.endTime.getTime() - task.startTime.getTime());
            }
            return sum;
          }, 0) /
          (completed.length * 3600000); // Convert to hours

        let recommendation = "";
        if (completionRate < 50) {
          recommendation = `Consider breaking down level ${level} tasks into smaller subtasks`;
        } else if (avgTime > 8) {
          recommendation = `Try allocating specific time blocks for level ${level} tasks`;
        } else {
          recommendation = `Good progress on level ${level} tasks! Keep up the momentum`;
        }

        patterns.push({
          category: `Priority Level ${level}`,
          completionRate: Math.round(completionRate),
          averageTime: Math.round(avgTime * 10) / 10,
          recommendation,
        });
      });

      setPatterns(patterns);
    };

    analyzeTasks();
  }, [tasks]);

  return (
    <div className="analytics-habits">
      <h2>Work Habits Analysis</h2>

      <div className="patterns-grid">
        {patterns.map((pattern, index) => (
          <div key={index} className="pattern-card">
            <h3>{pattern.category}</h3>

            <div className="metrics">
              <div className="metric">
                <label>Completion Rate</label>
                <div className="value">{pattern.completionRate}%</div>
              </div>

              <div className="metric">
                <label>Average Time</label>
                <div className="value">{pattern.averageTime}h</div>
              </div>
            </div>

            <div className="recommendation">
              <h4>AI Suggestion:</h4>
              <p>{pattern.recommendation}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="habits-summary">
        <h3>Overall Productivity Insights</h3>
        <ul>
          {patterns.length > 0 && (
            <>
              <li>
                Most efficient with:{" "}
                {
                  patterns.reduce((a, b) =>
                    a.completionRate > b.completionRate ? a : b
                  ).category
                }
              </li>
              <li>
                Needs improvement in:{" "}
                {
                  patterns.reduce((a, b) =>
                    a.completionRate < b.completionRate ? a : b
                  ).category
                }
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsHabits;
