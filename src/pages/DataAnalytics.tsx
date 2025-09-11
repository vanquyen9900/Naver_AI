import React, { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import { auth } from "../services/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  getTasksWithLevelsByUser,
  LEVEL_LABELS,
  type TaskItem,
} from "../services/firestore";
import UserHeader from "../components/UserHeader";
import TaskActions from "../components/TaskActions";
import { toast } from "react-toastify";
import { Loader2, TrendingUp, Clock, Target, BarChart3, AlertTriangle, CheckCircle } from "lucide-react";
import { format, differenceInDays, isAfter, isBefore, startOfWeek, endOfWeek, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  CartesianGrid,
  Legend,
  Cell
} from "recharts";
import "../styles/DataAnalytics.css";

// ================= Optimized UI Components =================
interface BasicProps { className?: string; children?: React.ReactNode }
const Card: React.FC<BasicProps> = ({ className = "", children }) => (
  <div className={`analytics-card rounded-xl border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow ${className}`}>{children}</div>
);
const CardHeader: React.FC<BasicProps> = ({ className = "", children }) => (
  <div className={`chart-header p-4 border-b border-gray-100 ${className}`}>{children}</div>
);
const CardContent: React.FC<BasicProps> = ({ className = "", children }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);
const CardTitle: React.FC<BasicProps> = ({ className = "", children }) => (
  <h3 className={`chart-title text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>
);

// ================= Performance-optimized Utils =================
const CURRENT_DATE = new Date();

function toDateSafe(d?: Date | string | null): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.valueOf()) ? null : d;
  const parsed = new Date(d);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function minutesBetweenMs(aMs: number | null, bMs: number | null): number {
  if (aMs == null || bMs == null) return 0;
  const ms = Math.max(0, bMs - aMs);
  return Math.round(ms / 60000);
}

function fmtHrs(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function readDeadline(t: TaskItem): Date | null {
  const maybe = (t as any).due_date ?? (t as any).deadline ?? (t as any).due_at ?? (t as any).dueDate ?? null;
  return toDateSafe(maybe);
}

// Task categorization based on task name and details
function categorizeTask(task: TaskItem): string {
  const text = `${task.task_name} ${task.task_detail || ''}`.toLowerCase();
  
  if (text.includes('meeting') || text.includes('họp') || text.includes('call') || text.includes('gọi')) return 'Meetings';
  if (text.includes('code') || text.includes('develop') || text.includes('bug') || text.includes('lập trình')) return 'Development';
  if (text.includes('design') || text.includes('ui') || text.includes('ux') || text.includes('thiết kế')) return 'Design';
  if (text.includes('email') || text.includes('report') || text.includes('báo cáo') || text.includes('document')) return 'Communication';
  if (text.includes('learn') || text.includes('study') || text.includes('research') || text.includes('học')) return 'Learning';
  if (text.includes('test') || text.includes('qa') || text.includes('kiểm tra')) return 'Testing';
  if (text.includes('review') || text.includes('đánh giá') || text.includes('feedback')) return 'Review';
  
  return 'Other';
}

// ================= Enhanced Task Interface =================
interface EnrichedTask extends TaskItem {
  st: Date | null;
  en: Date | null;
  ddl: Date | null;
  stMs: number | null;
  enMs: number | null;
  ddlMs: number | null;
  duration: number;
  category: string;
  daysUntilDeadline: number;
  isOverdue: boolean;
  isCompleted: boolean;
  urgencyScore: number;
}

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

// ================= Main Component =================
const DataAnalyticsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'habits' | 'productivity' | 'categories'>('overview');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ============ Authentication State Management ============
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (mountedRef.current) {
        setUser(user);
        setAuthLoading(false);
        console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
      }
    });

    return () => unsubscribe();
  }, []);

  // ============ Optimized Data Loading ============
  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }
    
    console.log('Loading tasks for user:', user.uid);
    setDataLoading(true);
    const startTime = performance.now();
    
    try {
      setError(null);
      const list = await getTasksWithLevelsByUser(user.uid);
      
      if (mountedRef.current) {
        setTasks(list);
        const loadTime = performance.now() - startTime;
        console.log(`Tasks loaded: ${list.length} tasks in ${loadTime.toFixed(2)}ms`);
        
        if (list.length === 0) {
          console.log('No tasks found for user');
        }
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
      if (mountedRef.current) {
        setError("Failed to load analytics data");
        toast.error("Failed to load analytics data");
      }
    } finally {
      if (mountedRef.current) {
        setDataLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      loadTasks();
    }
  }, [user, authLoading, loadTasks]);

  // ============ Optimized Data Processing ============
  const enriched = useMemo<EnrichedTask[]>(() => {
    if (!tasks || tasks.length === 0) return [];
    
    console.log('Processing tasks:', tasks.length);
    
    return tasks.map((t) => {
      const st = toDateSafe(t.start_time);
      const en = toDateSafe(t.end_time);
      const ddl = readDeadline(t);
      const stMs = st ? st.getTime() : null;
      const enMs = en ? en.getTime() : null;
      const ddlMs = ddl ? ddl.getTime() : null;
      const duration = minutesBetweenMs(stMs, enMs);
      const category = categorizeTask(t);
      const daysUntilDeadline = ddl ? differenceInDays(ddl, CURRENT_DATE) : Infinity;
      const isOverdue = ddl ? isAfter(CURRENT_DATE, ddl) && !en : false;
      const isCompleted = !!en;
      
      // Urgency score: closer deadline + higher level = higher urgency
      let urgencyScore = 0;
      if (ddl && !isCompleted) {
        const daysFactor = Math.max(0, 10 - daysUntilDeadline) / 10; // 0-1 scale
        const levelFactor = (6 - (t.level || 3)) / 5; // Higher level = more urgent
        urgencyScore = (daysFactor * 0.7) + (levelFactor * 0.3);
      }
      
      return { 
        ...t, st, en, ddl, stMs, enMs, ddlMs, duration, category, 
        daysUntilDeadline, isOverdue, isCompleted, urgencyScore 
      } as EnrichedTask;
    });
  }, [tasks]);

  // ============ Analytics Calculations ============
  const analytics = useMemo(() => {
    console.log('Calculating analytics for', enriched.length, 'enriched tasks');
    
    const currentWeekStart = startOfWeek(CURRENT_DATE);
    const currentWeekEnd = endOfWeek(CURRENT_DATE);
    const lastWeekStart = subDays(currentWeekStart, 7);
    
    // Task Recommendations (deadline proximity + level)
    const urgentTasks = enriched
      .filter(t => !t.isCompleted && !t.isOverdue)
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 8);

    const overdueTasks = enriched
      .filter(t => t.isOverdue)
      .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
      .slice(0, 5);

    // Habit Analysis
    const completedTasks = enriched.filter(t => t.isCompleted);
    const tasksWithDeadlines = enriched.filter(t => t.ddl);
    const onTimeCompletions = completedTasks.filter(t => 
      t.ddl && t.en && isBefore(t.en, t.ddl)
    ).length;
    const onTimeRate = tasksWithDeadlines.length > 0 ? 
      (onTimeCompletions / tasksWithDeadlines.length) * 100 : 0;

    // Working pattern analysis
    const workingHours: Record<number, number> = {};
    completedTasks.forEach(t => {
      if (t.st) {
        const hour = t.st.getHours();
        workingHours[hour] = (workingHours[hour] || 0) + 1;
      }
    });
    
    const peakHour = Object.entries(workingHours)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    // Weekly comparison
    const thisWeekTasks = completedTasks.filter(t => 
      t.en && t.en >= currentWeekStart && t.en <= currentWeekEnd
    ).length;
    
    const lastWeekTasks = completedTasks.filter(t => 
      t.en && t.en >= lastWeekStart && t.en < currentWeekStart
    ).length;

    // Productivity Insights
    const avgCompletionTime = completedTasks.length > 0 ? 
      completedTasks.reduce((sum, t) => sum + t.duration, 0) / completedTasks.length : 0;

    const productivityTrend = thisWeekTasks - lastWeekTasks;

    // Category Analysis
    const categoryStats: Record<string, { count: number; totalTime: number; completed: number }> = {};
    enriched.forEach(t => {
      if (!categoryStats[t.category]) {
        categoryStats[t.category] = { count: 0, totalTime: 0, completed: 0 };
      }
      categoryStats[t.category].count++;
      categoryStats[t.category].totalTime += t.duration;
      if (t.isCompleted) categoryStats[t.category].completed++;
    });

    const categoryData = Object.entries(categoryStats)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        totalTime: Math.round(stats.totalTime),
        completed: stats.completed,
        completionRate: stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0,
        avgTime: stats.completed > 0 ? Math.round(stats.totalTime / stats.completed) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Level distribution
    const levelStats: Record<number, number> = {};
    enriched.forEach(t => {
      const level = t.level || 0;
      levelStats[level] = (levelStats[level] || 0) + 1;
    });

    const levelData = Object.entries(levelStats)
      .map(([level, count]) => ({
        level: Number(level),
        label: LEVEL_LABELS[Number(level)] || `Level ${level}`,
        count,
      }))
      .sort((a, b) => a.level - b.level);

    const result = {
      totalTasks: enriched.length,
      completedTasks: completedTasks.length,
      overdueTasksCount: overdueTasks.length,
      completionRate: enriched.length > 0 ? Math.round((completedTasks.length / enriched.length) * 100) : 0,
      onTimeRate: Math.round(onTimeRate),
      avgCompletionTime: Math.round(avgCompletionTime),
      productivityTrend,
      peakHour: peakHour ? `${peakHour}:00` : 'N/A',
      urgentTasks,
      overdueTasks,
      categoryData,
      levelData,
      thisWeekTasks,
      lastWeekTasks,
    };
    
    console.log('Analytics calculated:', result);
    return result;
  }, [enriched]);

  // ============ Quick Stats Component ============
  const QuickStats = () => (
    <div className="quick-stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="stat-card p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="stat-icon p-2 bg-blue-500 rounded-lg shadow-md">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="stat-value text-2xl font-bold text-blue-900">{analytics.totalTasks}</div>
            <div className="stat-label text-sm text-blue-700">Total Tasks</div>
          </div>
        </div>
      </Card>
      
      <Card className="stat-card p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div className="flex items-center gap-3">
          <div className="stat-icon p-2 bg-green-500 rounded-lg shadow-md">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="stat-value text-2xl font-bold text-green-900">{analytics.completionRate}%</div>
            <div className="stat-label text-sm text-green-700">Completion Rate</div>
          </div>
        </div>
      </Card>
      
      <Card className="stat-card p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <div className="flex items-center gap-3">
          <div className="stat-icon p-2 bg-orange-500 rounded-lg shadow-md">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="stat-value text-2xl font-bold text-orange-900">{analytics.overdueTasksCount}</div>
            <div className="stat-label text-sm text-orange-700">Overdue</div>
          </div>
        </div>
      </Card>
      
      <Card className="stat-card p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <div className="flex items-center gap-3">
          <div className="stat-icon p-2 bg-purple-500 rounded-lg shadow-md">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="stat-value text-2xl font-bold text-purple-900">
              {analytics.productivityTrend > 0 ? '+' : ''}{analytics.productivityTrend}
            </div>
            <div className="stat-label text-sm text-purple-700">vs Last Week</div>
          </div>
        </div>
      </Card>
    </div>
  );

  // Show authentication loading
  if (authLoading) {
    return (
      <div className="analytics-container min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="loading-container flex flex-col items-center gap-4 text-gray-600">
          <Loader2 className="loading-spinner h-8 w-8 animate-spin" />
          <span className="loading-text text-lg">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="analytics-container min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="empty-state bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="empty-state-icon text-6xl mb-4">🔐</div>
          <h2 className="empty-state-title text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="empty-state-description text-gray-600 mb-6">Please sign in to view your task analytics.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="empty-state-button bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ============ Render ============
  return (
    <div className="analytics-container min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <UserHeader
          displayName={user.displayName}
          photoURL={user.photoURL ?? ""}
        />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">📊 Task Analytics</h2>
            <p className="text-gray-600">Insights into your productivity and task management</p>
          </div>
          <TaskActions onCreate={() => {}} onReload={loadTasks} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {error}
            </div>
          </div>
        )}

        {dataLoading && (
          <div className="loading-container flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4 text-gray-500">
              <Loader2 className="loading-spinner h-8 w-8 animate-spin" />
              <span className="loading-text text-lg">Loading your analytics...</span>
            </div>
          </div>
        )}

        {!dataLoading && tasks !== null && (
          <>
            {tasks.length === 0 ? (
              <div className="empty-state text-center py-20">
                <div className="empty-state-icon text-6xl mb-4">📝</div>
                <h3 className="empty-state-title text-2xl font-bold text-gray-900 mb-4">No Tasks Found</h3>
                <p className="empty-state-description text-gray-600 mb-6">Create some tasks to see your analytics here.</p>
                <button 
                  onClick={() => window.location.href = '/tasks'}
                  className="empty-state-button bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Your First Task
                </button>
              </div>
            ) : (
              <>
                <QuickStats />

                {/* Navigation Tabs */}
                <div className="tab-navigation flex space-x-1 bg-white p-1 rounded-xl shadow-sm border">
                  {[
                    { key: 'overview', label: 'Overview', icon: BarChart3 },
                    { key: 'habits', label: 'Habits', icon: Clock },
                    { key: 'productivity', label: 'Productivity', icon: TrendingUp },
                    { key: 'categories', label: 'Categories', icon: Target },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`tab-button flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                        activeTab === key
                          ? 'active bg-blue-500 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Urgent Tasks Recommendations */}
                      <Card className="chart-container shadow-md">
                        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-xl">
                          <CardTitle className="flex items-center gap-2 text-white">
                            <AlertTriangle className="h-5 w-5" />
                            🚨 Urgent Tasks (By Deadline)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {analytics.urgentTasks.length === 0 ? (
                            <div className="empty-state text-center py-12">
                              <div className="empty-state-icon text-6xl mb-4">🎉</div>
                              <div className="empty-state-title text-lg font-medium text-gray-700 mb-2">All caught up!</div>
                              <div className="empty-state-description text-gray-500">No urgent tasks at the moment</div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {analytics.urgentTasks.map((task) => (
                                <div key={task.id} className="task-card flex items-start justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-l-4 border-orange-400 hover:shadow-md transition-shadow">
                                  <div className="flex-1">
                                    <div className="task-title font-semibold text-gray-900 mb-1">{task.task_name}</div>
                                    <div className="task-description text-sm text-gray-600 mb-3">
                                      {task.task_detail && task.task_detail.length > 60 ? 
                                        `${task.task_detail.slice(0, 60)}...` : task.task_detail}
                                    </div>
                                    <div className="task-tags flex items-center gap-2 text-xs">
                                      {task.level && (
                                        <span className="task-tag priority px-3 py-1 bg-blue-500 text-white rounded-full font-medium">
                                          {LEVEL_LABELS[task.level]}
                                        </span>
                                      )}
                                      <span className="task-tag category px-3 py-1 bg-gray-200 text-gray-700 rounded-full">
                                        {task.category}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <div className="text-sm font-semibold text-gray-900 mb-1">
                                      {task.ddl ? format(task.ddl, 'MMM dd, yyyy') : 'No deadline'}
                                    </div>
                                    <div className="text-xs text-orange-600 font-medium">
                                      {task.daysUntilDeadline !== Infinity ? 
                                        `${task.daysUntilDeadline} days left` : ''}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Overdue Tasks */}
                      <Card className="chart-container shadow-md">
                        <CardHeader className="bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-t-xl">
                          <CardTitle className="flex items-center gap-2 text-white">
                            <Clock className="h-5 w-5" />
                            ⏰ Overdue Tasks
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {analytics.overdueTasks.length === 0 ? (
                            <div className="empty-state text-center py-12">
                              <div className="empty-state-icon text-6xl mb-4">✨</div>
                              <div className="empty-state-title text-lg font-medium text-gray-700 mb-2">Perfect timing!</div>
                              <div className="empty-state-description text-gray-500">No overdue tasks</div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {analytics.overdueTasks.map((task) => (
                                <div key={task.id} className="task-card flex items-start justify-between p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border-l-4 border-red-400 hover:shadow-md transition-shadow">
                                  <div className="flex-1">
                                    <div className="task-title font-semibold text-gray-900 mb-1">{task.task_name}</div>
                                    <div className="task-description text-sm text-gray-600">
                                      {task.task_detail && task.task_detail.length > 50 ? 
                                        `${task.task_detail.slice(0, 50)}...` : task.task_detail}
                                    </div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <div className="text-sm font-semibold text-red-600">
                                      {Math.abs(task.daysUntilDeadline)} days overdue
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {activeTab === 'habits' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="chart-container shadow-md">
                      <CardHeader className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-t-xl">
                        <CardTitle className="text-white">⏱️ On-Time Completion</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center py-8">
                        <div className="stat-value text-5xl font-bold text-green-600 mb-4">
                          {analytics.onTimeRate}%
                        </div>
                        <div className="text-gray-600 mb-4">
                          Tasks completed before deadline
                        </div>
                        <div className="text-sm px-4 py-2 rounded-lg bg-gray-50">
                          {analytics.onTimeRate >= 80 && "🌟 Excellent time management!"}
                          {analytics.onTimeRate >= 60 && analytics.onTimeRate < 80 && "👍 Good habits, room for improvement"}
                          {analytics.onTimeRate < 60 && "⚠️ Consider better deadline planning"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="chart-container shadow-md">
                      <CardHeader className="bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-t-xl">
                        <CardTitle className="text-white">🕐 Peak Working Hour</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center py-8">
                        <div className="stat-value text-5xl font-bold text-blue-600 mb-4">
                          {analytics.peakHour}
                        </div>
                        <div className="text-gray-600">
                          Your most productive time
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="chart-container shadow-md">
                      <CardHeader className="bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-t-xl">
                        <CardTitle className="text-white">📈 Weekly Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center py-8">
                        <div className="stat-value text-5xl font-bold text-purple-600 mb-4">
                          {analytics.thisWeekTasks}
                        </div>
                        <div className="text-gray-600 mb-4">
                          Tasks completed this week
                        </div>
                        <div className="text-sm px-4 py-2 rounded-lg bg-gray-50">
                          {analytics.productivityTrend > 0 && `📈 +${analytics.productivityTrend} vs last week`}
                          {analytics.productivityTrend === 0 && "➡️ Same as last week"}
                          {analytics.productivityTrend < 0 && `📉 ${analytics.productivityTrend} vs last week`}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'productivity' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="chart-container shadow-md">
                      <CardHeader className="bg-gradient-to-r from-indigo-400 to-indigo-600 text-white rounded-t-xl">
                        <CardTitle className="text-white">⚡ Average Completion Time</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center py-8">
                        <div className="stat-value text-5xl font-bold text-indigo-600 mb-4">
                          {fmtHrs(analytics.avgCompletionTime)}
                        </div>
                        <div className="text-gray-600">
                          Per task average
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="chart-container shadow-md">
                      <CardHeader>
                        <CardTitle>📊 Task Distribution by Level</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <Suspense fallback={<div className="loading-container flex items-center justify-center h-full"><Loader2 className="loading-spinner animate-spin" /></div>}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.levelData}
                                dataKey="count"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                              >
                                {analytics.levelData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Suspense>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'categories' && (
                  <div className="space-y-6">
                    <Card className="chart-container shadow-md">
                      <CardHeader>
                        <CardTitle>🎯 Task Categories Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="analytics-table w-full text-sm">
                            <thead>
                              <tr className="border-b-2 border-gray-200">
                                <th className="text-left py-4 px-4 font-semibold text-gray-900">Category</th>
                                <th className="text-left py-4 px-4 font-semibold text-gray-900">Total Tasks</th>
                                <th className="text-left py-4 px-4 font-semibold text-gray-900">Completed</th>
                                <th className="text-left py-4 px-4 font-semibold text-gray-900">Completion Rate</th>
                                <th className="text-left py-4 px-4 font-semibold text-gray-900">Total Time</th>
                                <th className="text-left py-4 px-4 font-semibold text-gray-900">Avg Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.categoryData.map((cat, idx) => (
                                <tr key={cat.name} className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                                  <td className="py-4 px-4 font-medium text-gray-900">{cat.name}</td>
                                  <td className="py-4 px-4 text-gray-700">{cat.count}</td>
                                  <td className="py-4 px-4 text-gray-700">{cat.completed}</td>
                                  <td className="py-4 px-4">
                                    <div className="progress-bar-container flex items-center gap-3">
                                      <div className="progress-bar flex-1 bg-gray-200 rounded-full h-3">
                                        <div 
                                          className="progress-fill bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all" 
                                          style={{ width: `${cat.completionRate}%` }}
                                        />
                                      </div>
                                      <span className="progress-percentage text-sm font-semibold text-gray-900 min-w-[3rem]">{cat.completionRate}%</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-gray-700">{fmtHrs(cat.totalTime)}</td>
                                  <td className="py-4 px-4 text-gray-700">{fmtHrs(cat.avgTime)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="chart-container shadow-md">
                      <CardHeader>
                        <CardTitle>📈 Category Performance Chart</CardTitle>
                      </CardHeader>
                      <CardContent className="h-96">
                        <Suspense fallback={<div className="loading-container flex items-center justify-center h-full"><Loader2 className="loading-spinner animate-spin" /></div>}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend />
                              <Bar dataKey="count" name="Total Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Suspense>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Productivity Tips */}
                <Card className="tips-section shadow-lg border-2 border-green-200">
                  <CardHeader className="tips-header bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-t-xl">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Target className="h-6 w-6" />
                      💡 Productivity Insights & Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="tips-content bg-gradient-to-br from-green-50 to-teal-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">📊 Based on Your Data:</h4>
                        <ul className="space-y-3 text-sm text-gray-700">
                          <li className="tip-item flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                            <div className="tip-bullet w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <span>Your peak productivity is at <strong>{analytics.peakHour}</strong>. Schedule important tasks during this time.</span>
                          </li>
                          <li className="tip-item flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                            <div className="tip-bullet w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            <span>You complete <strong>{analytics.onTimeRate}%</strong> of tasks on time. 
                            {analytics.onTimeRate < 70 && " Consider adding buffer time to deadlines."}</span>
                          </li>
                          <li className="tip-item flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                            <div className="tip-bullet w-3 h-3 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                            <span>Most of your tasks are in <strong>{analytics.categoryData[0]?.name || 'various categories'}</strong>. 
                            Consider time-blocking for better focus.</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">🚀 Quick Tips:</h4>
                        <ul className="space-y-3 text-sm text-gray-700">
                          <li className="tip-item flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                            <div className="tip-bullet w-3 h-3 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                            <span>Focus on the urgent tasks list - they're sorted by deadline proximity and importance.</span>
                          </li>
                          <li className="tip-item flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                            <div className="tip-bullet w-3 h-3 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                            <span>Address overdue tasks immediately to prevent workflow disruption.</span>
                          </li>
                          <li className="tip-item flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                            <div className="tip-bullet w-3 h-3 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                            <span>Use the 2-minute rule: if a task takes less than 2 minutes, do it immediately.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DataAnalyticsPage;
