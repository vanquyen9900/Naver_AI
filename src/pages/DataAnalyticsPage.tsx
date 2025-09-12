import { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { getTasksWithLevelsByUser } from "../services/firestore";
import {
  type AggregatedTask,
  getMultipleAggregatedTasks,
} from "../services/task";
import AnalyticsSummary from "../components/analytics/AnalyticsSummary";
import AnalyticsOverview from "../components/analytics/AnalyticsOverview";
import AnalyticsHabits from "../components/analytics/AnalyticsHabits";
import AnalyticsReport from "../components/analytics/AnalyticsReport";
import AnalyticsProgress from "../components/analytics/AnalyticsProgress";
import UserHeader from "../components/UserHeader";
import TaskActions from "../components/TaskActions";

import "../styles/DataAnalytics.css";

type AnalyticsTab = "overview" | "habits" | "report" | "progress";

const DataAnalyticsPage = () => {
  const [tasks, setTasks] = useState<AggregatedTask[]>([]);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
          console.error("No user logged in");
          setLoading(false);
          return;
        }

        // Get all tasks for user
        const userTasks = await getTasksWithLevelsByUser(user.uid);

        // Convert to aggregated tasks with progress
        const aggregatedTasks = await getMultipleAggregatedTasks(
          userTasks.map((task) => task.id)
        );

        setTasks(aggregatedTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchTasks();
      } else {
        setTasks([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (!auth.currentUser) {
    return <div className="error">Please login to view analytics</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="empty">
        No tasks found. Create some tasks to see analytics.
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <AnalyticsOverview tasks={tasks} />;
      case "habits":
        return <AnalyticsHabits tasks={tasks} />;
      case "report":
        return <AnalyticsReport tasks={tasks} />;
      case "progress":
        return <AnalyticsProgress tasks={tasks} />;
    }
  };
  const loadTasks = async () => {
    if (!auth.currentUser) return;
    const userTasks = await getTasksWithLevelsByUser(auth.currentUser.uid);
    const aggregatedTasks = await getMultipleAggregatedTasks(
      userTasks.map((task) => task.id)
    );
    setTasks(aggregatedTasks);
  };

    return (
      <div className="analytics-wrapper">
      <div className="analytics-header-section">
        <div className="header-content">
          <TaskActions 
            onCreate={() => setModalOpen(true)} 
            onReload={loadTasks} 
          />
          <UserHeader
            displayName={auth.currentUser?.displayName}
            photoURL={auth.currentUser?.photoURL}
          />
        </div>
      </div>
        

        <div className="analytics-container">
          <div className="analytics-header">
            <h1>Data Analytics Dashboard</h1>
            <p className="subtitle">
              Track your task performance and productivity insights
            </p>
          </div>

          <AnalyticsSummary tasks={tasks} />

          <div className="analytics-tabs">
            <button
              className={`tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <span className="tab-icon">📊</span>
              Overview
            </button>
            <button
              className={`tab ${activeTab === "habits" ? "active" : ""}`}
              onClick={() => setActiveTab("habits")}
            >
              <span className="tab-icon">🎯</span>
              Habits
            </button>
            <button
              className={`tab ${activeTab === "report" ? "active" : ""}`}
              onClick={() => setActiveTab("report")}
            >
              <span className="tab-icon">📈</span>
              Report
            </button>
            <button
              className={`tab ${activeTab === "progress" ? "active" : ""}`}
              onClick={() => setActiveTab("progress")}
            >
              <span className="tab-icon">✅</span>
              Progress
            </button>
          </div>

          <div className="analytics-content glass-effect">
            {renderContent()}
          </div>
        </div>
      </div>
    );
};

export default DataAnalyticsPage;
