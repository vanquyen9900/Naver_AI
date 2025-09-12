import { useState, useEffect, useRef } from "react";
import { auth } from "../services/firebase";
import { getTasksWithLevelsByUser } from "../services/firestore";
import { generateTaskInsights, isApiKeyConfigured, isFallbackMode } from "../services/gemini";
import type { AggregatedTask } from "../services/task";
import { getMultipleAggregatedTasks } from "../services/task";
import { TaskStatus } from "../services/taskProgress";
import "../styles/ChatBot.css";

interface ChatMessage {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface TaskInsightData {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  urgentTasks: number;
  completionRate: number;
  averageLevel: number;
  busyDays: string[];
  topPriorities: AggregatedTask[];
}

const ChatBot = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [tasks, setTasks] = useState<AggregatedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const predefinedQuestions = [
    "How am I doing with my tasks?",
    "What should I focus on today?",
    "How can I improve my productivity?",
    "Show me my overdue tasks",
    "What's my completion rate?",
    "Which tasks are most urgent?",
  ];

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const userTasks = await getTasksWithLevelsByUser(user.uid);
        const aggregatedTasks = await getMultipleAggregatedTasks(
          userTasks.map((task) => task.id)
        );
        setTasks(aggregatedTasks);

        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          type: "bot",
          content: "Hello! I'm your task assistant. I can help you analyze your productivity and provide insights about your tasks. What would you like to know?",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      } catch (error) {
        console.error("Error loading tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const analyzeTaskData = (): TaskInsightData => {
    const now = new Date();
    const completed = tasks.filter(t => t.progress?.status === TaskStatus.COMPLETED);
    const overdue = tasks.filter(t => 
      t.endTime && 
      t.endTime < now && 
      t.progress?.status !== TaskStatus.COMPLETED
    );
    
    // Tasks due within 3 days
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const urgent = tasks.filter(t => 
      t.endTime && 
      t.endTime > now && 
      t.endTime <= threeDaysFromNow &&
      t.progress?.status !== TaskStatus.COMPLETED
    );

    // Calculate average level
    const levelsSum = tasks.reduce((sum, task) => sum + (task.level || 5), 0);
    const averageLevel = tasks.length > 0 ? levelsSum / tasks.length : 0;

    // Find busy days (days with most tasks)
    const dayCount: Record<string, number> = {};
    tasks.forEach(task => {
      if (task.startTime) {
        const day = task.startTime.toLocaleDateString('en-US', { weekday: 'long' });
        dayCount[day] = (dayCount[day] || 0) + 1;
      }
    });
    
    const busyDays = Object.entries(dayCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    // Top priority tasks (level 1-2, not completed)
    const topPriorities = tasks
      .filter(t => (t.level || 5) <= 2 && t.progress?.status !== TaskStatus.COMPLETED)
      .sort((a, b) => (a.level || 5) - (b.level || 5))
      .slice(0, 5);

    return {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      overdueTasks: overdue.length,
      urgentTasks: urgent.length,
      completionRate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
      averageLevel,
      busyDays,
      topPriorities,
    };
  };

  const generateResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();
    const insights = analyzeTaskData();

    // Basic keyword matching for common questions
    if (lowerMessage.includes("how am i doing") || lowerMessage.includes("progress")) {
      return `Here's your current progress:\n\n📊 **Overall Statistics:**\n• Total tasks: ${insights.totalTasks}\n• Completed: ${insights.completedTasks}\n• Completion rate: ${insights.completionRate.toFixed(1)}%\n• Overdue tasks: ${insights.overdueTasks}\n\n${insights.completionRate >= 70 ? "🎉 Great job! You're doing really well!" : insights.completionRate >= 40 ? "👍 You're making progress, but there's room for improvement." : "⚠️ Consider reviewing your task management strategy."}`;
    }

    if (lowerMessage.includes("focus") || lowerMessage.includes("today") || lowerMessage.includes("priority")) {
      const urgentList = insights.topPriorities.slice(0, 3).map(task => 
        `• ${task.taskName} (Level ${task.level}) ${task.endTime ? `- Due: ${task.endTime.toLocaleDateString()}` : ''}`
      ).join('\n');
      
      return `🎯 **Here's what you should focus on:**\n\n${urgentList || "No high-priority tasks found. Great job staying on top of things!"}\n\n💡 **Tip:** Start with the highest priority (lowest level number) tasks first.`;
    }

    if (lowerMessage.includes("overdue")) {
      if (insights.overdueTasks === 0) {
        return "🎉 Excellent! You have no overdue tasks. Keep up the great work!";
      }
      
      const overdueList = tasks
        .filter(t => {
          const now = new Date();
          return t.endTime && t.endTime < now && t.progress?.status !== TaskStatus.COMPLETED;
        })
        .slice(0, 5)
        .map(task => `• ${task.taskName} - Due: ${task.endTime?.toLocaleDateString()}`)
        .join('\n');
      
      return `⚠️ **You have ${insights.overdueTasks} overdue task(s):**\n\n${overdueList}\n\n💪 **Suggestion:** Try to tackle these as soon as possible to get back on track!`;
    }

    if (lowerMessage.includes("completion rate") || lowerMessage.includes("rate")) {
      const rateEmoji = insights.completionRate >= 80 ? "🏆" : insights.completionRate >= 60 ? "👍" : "⚠️";
      return `${rateEmoji} **Your completion rate is ${insights.completionRate.toFixed(1)}%**\n\nYou've completed ${insights.completedTasks} out of ${insights.totalTasks} tasks.\n\n${insights.completionRate < 50 ? "💡 Consider breaking down large tasks into smaller, manageable pieces." : "Keep up the momentum!"}`;
    }

    if (lowerMessage.includes("urgent") || lowerMessage.includes("deadline")) {
      const urgentList = tasks
        .filter(t => {
          const now = new Date();
          const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          return t.endTime && t.endTime > now && t.endTime <= threeDays && t.progress?.status !== TaskStatus.COMPLETED;
        })
        .slice(0, 5)
        .map(task => {
          const daysLeft = Math.ceil((task.endTime!.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
          return `• ${task.taskName} - ${daysLeft} day(s) left`;
        })
        .join('\n');

      return `⏰ **Urgent tasks (due within 3 days):**\n\n${urgentList || "No urgent deadlines coming up!"}\n\n${insights.urgentTasks > 0 ? "🚨 Consider prioritizing these tasks to avoid missing deadlines." : "🎉 You're all caught up with upcoming deadlines!"}`;
    }

    if (lowerMessage.includes("improve") || lowerMessage.includes("productivity") || lowerMessage.includes("tips")) {
      return `💡 **Productivity Tips Based on Your Data:**\n\n📈 **Current Status:** ${insights.completionRate.toFixed(1)}% completion rate\n\n🎯 **Recommendations:**\n• ${insights.overdueTasks > 0 ? "Focus on clearing overdue tasks first" : "Great job staying current!"}\n• ${insights.averageLevel > 3 ? "Consider adding more high-priority tasks" : "Good balance of task priorities"}\n• ${insights.busyDays.length > 0 ? `Your busiest days are ${insights.busyDays.join(', ')} - plan accordingly` : "Even workload distribution"}\n\n⚡ **Quick wins:** Start with 15-minute tasks to build momentum!`;
    }

    // Use AI if available, otherwise provide general response
    if (isApiKeyConfigured() && !isFallbackMode()) {
      try {
        // Prepare data for AI analysis
        const analysisData = {
          totalTasks: insights.totalTasks,
          completedTasks: insights.completedTasks,
          overdueTasks: insights.overdueTasks,
          tasksByLevel: {},
          tasksByMonth: {},
          urgentTasks: tasks.filter(t => {
            const now = new Date();
            const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            return t.endTime && t.endTime > now && t.endTime <= threeDays;
          }).map(task => ({
            name: task.taskName,
            deadline: task.endTime?.toLocaleDateString() || '',
            level: task.level || 5,
            daysRemaining: task.endTime ? Math.ceil((task.endTime.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : 0
          })),
          completionRatesByLevel: {},
          averageCompletionTime: {},
        };

        const aiInsights = await generateTaskInsights(analysisData);
        return `🤖 **AI Analysis:**\n\n${aiInsights.productivityTrends.overallTrend}\n\n💪 **Strengths:** ${aiInsights.productivityTrends.strengths.slice(0, 2).join(', ')}\n\n🎯 **Areas to improve:** ${aiInsights.productivityTrends.improvementAreas.slice(0, 2).join(', ')}`;
      } catch (error) {
        console.error("Error getting AI insights:", error);
      }
    }

    // Fallback general response
    return `I understand you're asking about "${userMessage}". Based on your current tasks:\n\n📊 You have ${insights.totalTasks} total tasks with a ${insights.completionRate.toFixed(1)}% completion rate.\n\n💡 Try asking me about:\n• Your progress or completion rate\n• What to focus on today\n• Overdue or urgent tasks\n• Productivity tips\n\nI'm here to help you stay organized! 🚀`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      const response = await generateResponse(userMessage.content);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "Sorry, I encountered an error. Please try asking again!",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setInputValue(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
      .replace(/•/g, '•');
  };

  if (loading) {
    return (
      <div className="chatbot-loading">
        <div className="loading-spinner"></div>
        <p>Loading your task data...</p>
      </div>
    );
  }

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      <button 
        className="chatbot-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        title="Task Assistant"
      >
        🤖
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="header-info">
              <span className="bot-avatar">🤖</span>
              <div>
                <h3>Task Assistant</h3>
                <p className="status">
                  {isApiKeyConfigured() && !isFallbackMode() ? "AI-Powered" : "Smart Analytics"}
                </p>
              </div>
            </div>
            <button 
              className="close-button" 
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'bot' ? '🤖' : '👤'}
                </div>
                <div className="message-content">
                  <div 
                    className="message-text"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessage(message.content) 
                    }}
                  />
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot typing">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="quick-questions">
            {predefinedQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                className="quick-question"
                onClick={() => handleQuestionClick(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <div className="chatbot-input">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your tasks, productivity, or what to focus on..."
              rows={1}
              disabled={isTyping}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="send-button"
            >
              📤
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;