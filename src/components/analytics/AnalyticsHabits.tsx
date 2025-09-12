import { useEffect, useState, useMemo } from "react";
import type { AggregatedTask } from "../../services/task";
import { TaskStatus } from "../../services/taskProgress";
import { generateTaskInsights, type AIInsights, type TaskAnalysisData } from "../../services/gemini";
import "../../styles/analytics/AnalyticsHabits.css";

interface Props {
  tasks: AggregatedTask[];
}

const AnalyticsHabits = ({ tasks }: Props) => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prepare analysis data with useMemo for performance
  const analysisData = useMemo((): TaskAnalysisData => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Basic stats
    const completedTasks = tasks.filter(t => t.progress?.status === TaskStatus.COMPLETED);
    const overdueTasks = tasks.filter(t => 
      t.endTime && 
      t.endTime < now && 
      t.progress?.status !== TaskStatus.COMPLETED
    );

    // Tasks by priority level
    const tasksByLevel: Record<number, { total: number; completed: number }> = {};
    tasks.forEach(task => {
      const level = task.level || 5;
      if (!tasksByLevel[level]) {
        tasksByLevel[level] = { total: 0, completed: 0 };
      }
      tasksByLevel[level].total++;
      if (task.progress?.status === TaskStatus.COMPLETED) {
        tasksByLevel[level].completed++;
      }
    });

    // Tasks by month
    const tasksByMonth: Record<string, number> = {};
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Initialize all months
    monthNames.forEach(month => {
      tasksByMonth[month] = 0;
    });
    
    tasks.forEach(task => {
      if (task.createdAt) {
        const month = monthNames[task.createdAt.getMonth()];
        tasksByMonth[month]++;
      }
    });

    // Urgent tasks (due within 7 days)
    const urgentTasks = tasks
      .filter(task => 
        task.endTime && 
        task.endTime > now && 
        task.endTime <= sevenDaysFromNow &&
        task.progress?.status !== TaskStatus.COMPLETED
      )
      .map(task => ({
        name: task.taskName,
        deadline: task.endTime!.toLocaleDateString(),
        level: task.level || 5,
        daysRemaining: Math.ceil((task.endTime!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Completion rates by level
    const completionRatesByLevel: Record<number, number> = {};
    Object.entries(tasksByLevel).forEach(([level, stats]) => {
      completionRatesByLevel[parseInt(level)] = stats.total > 0 ? 
        (stats.completed / stats.total) * 100 : 0;
    });

    // Average completion time by level
    const averageCompletionTime: Record<number, number> = {};
    Object.keys(tasksByLevel).forEach(level => {
      const levelNum = parseInt(level);
      const levelTasks = completedTasks.filter(task => (task.level || 5) === levelNum);
      
      if (levelTasks.length > 0) {
        const totalTime = levelTasks.reduce((sum, task) => {
          if (task.startTime && task.endTime) {
            return sum + (task.endTime.getTime() - task.startTime.getTime());
          }
          return sum;
        }, 0);
        averageCompletionTime[levelNum] = totalTime / (levelTasks.length * 3600000); // Convert to hours
      } else {
        averageCompletionTime[levelNum] = 0;
      }
    });

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      tasksByLevel,
      tasksByMonth,
      urgentTasks,
      completionRatesByLevel,
      averageCompletionTime,
    };
  }, [tasks]);

  // Generate AI insights when tasks change
  useEffect(() => {
    if (tasks.length === 0) return;

    const generateInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const aiInsights = await generateTaskInsights(analysisData);
        setInsights(aiInsights);
      } catch (err) {
        setError("Failed to generate AI insights. Please try again.");
        console.error("Error generating insights:", err);
      } finally {
        setLoading(false);
      }
    };

    generateInsights();
  }, [analysisData]);

  const getUrgencyColor = (daysRemaining: number): string => {
    if (daysRemaining <= 1) return 'critical';
    if (daysRemaining <= 3) return 'warning';
    return 'normal';
  };

  const getLevelBadgeClass = (level: number): string => {
    if (level <= 2) return 'high-priority';
    if (level <= 3) return 'medium-priority';
    return 'low-priority';
  };

  if (tasks.length === 0) {
    return (
      <div className="analytics-habits">
        <div className="empty-state">
          <h2>🤖 AI Habits Analysis</h2>
          <p>No tasks available for analysis. Create some tasks to see AI-powered insights!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-habits">
      <div className="habits-header">
        <h2>🤖 AI-Powered Habits Analysis</h2>
        <p className="subtitle">Intelligent insights powered by Gemini AI</p>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Generating AI insights...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry Analysis
          </button>
        </div>
      )}

      {insights && (
        <>
          {/* Completion Rate Analysis */}
          <div className="insight-section">
            <div className="section-header">
              <h3>🏆 Highest Completion Rate</h3>
              <div className="completion-badge">
                Level {insights.highestCompletionRate.level}: {insights.highestCompletionRate.rate.toFixed(1)}%
              </div>
            </div>
            <div className="insight-card">
              <p className="ai-analysis">{insights.highestCompletionRate.analysis}</p>
              <div className="level-breakdown">
                {Object.entries(analysisData.completionRatesByLevel).map(([level, rate]) => (
                  <div key={level} className={`level-bar ${getLevelBadgeClass(parseInt(level))}`}>
                    <span className="level-label">Level {level}</span>
                    <div className="progress-container">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${rate}%` }}
                      ></div>
                      <span className="rate-text">{rate.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Time Patterns Analysis */}
          <div className="insight-section">
            <div className="section-header">
              <h3>📅 Time Distribution Patterns</h3>
              <div className="time-badges">
                <span className="busiest-badge">Busiest: {insights.timePatterns.busiestMonth}</span>
                <span className="quietest-badge">Quietest: {insights.timePatterns.quietestMonth}</span>
              </div>
            </div>
            <div className="insight-card">
              <p className="ai-analysis">{insights.timePatterns.analysis}</p>
              <div className="monthly-chart">
                {Object.entries(analysisData.tasksByMonth).map(([month, count]) => (
                  <div key={month} className="month-bar">
                    <div 
                      className={`bar ${month === insights.timePatterns.busiestMonth ? 'busiest' : 
                                        month === insights.timePatterns.quietestMonth ? 'quietest' : 'normal'}`}
                      style={{ height: `${(count / Math.max(...Object.values(analysisData.tasksByMonth))) * 100}%` }}
                    ></div>
                    <span className="month-label">{month.slice(0, 3)}</span>
                    <span className="count-label">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Urgency Analysis */}
          <div className="insight-section">
            <div className="section-header">
              <h3>⚠️ Urgency Analysis</h3>
              <div className="urgency-badge">
                {insights.urgencyAnalysis.criticalTasks} Critical Tasks
              </div>
            </div>
            <div className="insight-card">
              <p className="ai-analysis">{insights.urgencyAnalysis.priorityInsights}</p>
              
              {analysisData.urgentTasks.length > 0 && (
                <div className="urgent-tasks-list">
                  <h4>Tasks Requiring Immediate Attention:</h4>
                  {analysisData.urgentTasks.map((task, index) => (
                    <div key={index} className={`urgent-task ${getUrgencyColor(task.daysRemaining)}`}>
                      <div className="task-info">
                        <span className="task-name">{task.name}</span>
                        <span className={`level-badge ${getLevelBadgeClass(task.level)}`}>
                          Level {task.level}
                        </span>
                      </div>
                      <div className="urgency-info">
                        <span className="days-remaining">{task.daysRemaining}d left</span>
                        <span className="deadline">{task.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="recommendations">
                <h4>AI Recommendations:</h4>
                <ul>
                  {insights.urgencyAnalysis.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Productivity Trends */}
          <div className="insight-section">
            <div className="section-header">
              <h3>📈 Productivity Trends</h3>
              <div className="trend-badge">
                {insights.productivityTrends.overallTrend.includes('positive') ? '📈' : 
                 insights.productivityTrends.overallTrend.includes('negative') ? '📉' : '📊'} 
                Overall Trend
              </div>
            </div>
            <div className="insight-card">
              <p className="ai-analysis">{insights.productivityTrends.overallTrend}</p>
              
              <div className="trends-grid">
                <div className="strengths-section">
                  <h4>💪 Strengths</h4>
                  <ul className="strengths-list">
                    {insights.productivityTrends.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="improvements-section">
                  <h4>🎯 Areas for Improvement</h4>
                  <ul className="improvements-list">
                    {insights.productivityTrends.improvementAreas.map((area, index) => (
                      <li key={index}>{area}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-label">Total Tasks</span>
              <span className="stat-value">{analysisData.totalTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed</span>
              <span className="stat-value completed">{analysisData.completedTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Overdue</span>
              <span className="stat-value overdue">{analysisData.overdueTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completion Rate</span>
              <span className="stat-value rate">
                {((analysisData.completedTasks / analysisData.totalTasks) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsHabits;
