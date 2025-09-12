import { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { getTasksWithLevelsByUser } from "../services/firestore";
import {
  type AggregatedTask,
  getMultipleAggregatedTasks,
} from "../services/task";
import {
  isApiKeyConfigured,
  setApiKey as setGeminiApiKey,
  isFallbackMode,
} from "../services/gemini";
import AnalyticsSummary from "../components/analytics/AnalyticsSummary";
import AnalyticsOverview from "../components/analytics/AnalyticsOverview";
import AnalyticsHabits from "../components/analytics/AnalyticsHabits";
import AnalyticsReport from "../components/analytics/AnalyticsReport";
import AnalyticsProgress from "../components/analytics/AnalyticsProgress";
import UserHeader from "../components/UserHeader";
import TaskActions from "../components/TaskActions";
import ApiKeyModal from "../components/ApiKeyModal";
import ChatBot from "../components/ChatBot";

import "../styles/DataAnalytics.css";

type AnalyticsTab = "overview" | "habits" | "report" | "progress";

const DataAnalyticsPage = () => {
  const [tasks, setTasks] = useState<AggregatedTask[]>([]);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isModalOpen, setModalOpen] = useState(false);
  const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isInFallbackMode, setIsInFallbackMode] = useState(false);

  // Check for API key on component mount
  useEffect(() => {
    setHasApiKey(isApiKeyConfigured() || isFallbackMode());
    setIsInFallbackMode(isFallbackMode());
  }, []);

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

  const handleTabClick = (tab: AnalyticsTab) => {
    if (tab === "habits" && !hasApiKey) {
      setApiKeyModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleApiKeySubmit = (apiKey: string) => {
    setGeminiApiKey(apiKey);
    setHasApiKey(true);
    setIsInFallbackMode(apiKey === "FALLBACK_MODE");
    setActiveTab("habits");
  };

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
        if (!hasApiKey) {
          return (
            <div className="ai-setup-prompt">
              <div className="setup-card">
                <h2>🤖 AI-Powered Habits Analysis</h2>
                <p>
                  Unlock intelligent insights about your productivity patterns
                  with Gemini AI. Get personalized recommendations based on your
                  task completion data.
                </p>
                <button
                  onClick={() => setApiKeyModalOpen(true)}
                  className="setup-ai-button"
                >
                  🔑 Setup Gemini AI
                </button>
              </div>
            </div>
          );
        }
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
            onClick={() => handleTabClick("overview")}
          >
            <span className="tab-icon">📊</span>
            Overview
          </button>
          <button
            className={`tab ${activeTab === "habits" ? "active" : ""} ${
              !hasApiKey
                ? "requires-setup"
                : isInFallbackMode
                ? "fallback-mode"
                : ""
            }`}
            onClick={() => handleTabClick("habits")}
          >
            <span className="tab-icon">🤖</span>
            AI Habits
            {!hasApiKey && <span className="setup-indicator">⚙️</span>}
            {isInFallbackMode && <span className="fallback-indicator">📊</span>}
          </button>
          <button
            className={`tab ${activeTab === "report" ? "active" : ""}`}
            onClick={() => handleTabClick("report")}
          >
            <span className="tab-icon">📈</span>
            Report
          </button>
          <button
            className={`tab ${activeTab === "progress" ? "active" : ""}`}
            onClick={() => handleTabClick("progress")}
          >
            <span className="tab-icon">✅</span>
            Progress
          </button>
        </div>

        <div className="analytics-content glass-effect">{renderContent()}</div>
      </div>

      {/* ChatBot - floating assistant for analytics insights */}
      <ChatBot />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onApiKeySubmit={handleApiKeySubmit}
        currentApiKey={hasApiKey ? "***configured***" : ""}
      />
    </div>
  );
};

export default DataAnalyticsPage;
