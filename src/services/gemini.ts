import { GoogleGenerativeAI } from "@google/generative-ai";

// Get API key from session storage
const getApiKey = (): string | null => {
  return sessionStorage.getItem('gemini_api_key');
};

// Initialize Gemini AI with session-stored key
const getModel = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key found. Please configure your Gemini API key.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // Updated model name - gemini-1.5-flash is the current model
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

export interface TaskAnalysisData {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksByLevel: Record<number, { total: number; completed: number }>;
  tasksByMonth: Record<string, number>;
  urgentTasks: Array<{
    name: string;
    deadline: string;
    level: number;
    daysRemaining: number;
  }>;
  completionRatesByLevel: Record<number, number>;
  averageCompletionTime: Record<number, number>;
}

export interface AIInsights {
  highestCompletionRate: {
    level: number;
    rate: number;
    analysis: string;
  };
  timePatterns: {
    busiestMonth: string;
    quietestMonth: string;
    analysis: string;
  };
  urgencyAnalysis: {
    criticalTasks: number;
    recommendations: string[];
    priorityInsights: string;
  };
  productivityTrends: {
    overallTrend: string;
    improvementAreas: string[];
    strengths: string[];
  };
}

// Check if API key is available
export const isApiKeyConfigured = (): boolean => {
  const key = getApiKey();
  return !!(key && key !== "FALLBACK_MODE");
};

// Check if using fallback mode
export const isFallbackMode = (): boolean => {
  return getApiKey() === "FALLBACK_MODE";
};

// Set API key in session storage
export const setApiKey = (apiKey: string): void => {
  sessionStorage.setItem('gemini_api_key', apiKey);
};

// Remove API key from session storage
export const clearApiKey = (): void => {
  sessionStorage.removeItem('gemini_api_key');
};

export const generateTaskInsights = async (data: TaskAnalysisData): Promise<AIInsights> => {
  // If in fallback mode, skip API call and use local analysis
  if (isFallbackMode()) {
    console.log("Using fallback mode - generating local insights");
    return generateFallbackInsights(data);
  }

  try {
    const model = getModel();
    
    const prompt = `
    Analyze the following task management data and provide detailed insights:

    Task Overview:
    - Total Tasks: ${data.totalTasks}
    - Completed Tasks: ${data.completedTasks}
    - Overdue Tasks: ${data.overdueTasks}
    - Overall Completion Rate: ${((data.completedTasks / data.totalTasks) * 100).toFixed(1)}%

    Tasks by Priority Level:
    ${Object.entries(data.tasksByLevel).map(([level, stats]) => 
      `Level ${level}: ${stats.completed}/${stats.total} completed (${((stats.completed / stats.total) * 100).toFixed(1)}%)`
    ).join('\n')}

    Task Distribution by Month:
    ${Object.entries(data.tasksByMonth).map(([month, count]) => `${month}: ${count} tasks`).join('\n')}

    Urgent Tasks (due within 7 days):
    ${data.urgentTasks.map(task => 
      `- ${task.name} (Level ${task.level}, ${task.daysRemaining} days remaining)`
    ).join('\n')}

    Average Completion Time by Level:
    ${Object.entries(data.averageCompletionTime).map(([level, time]) => 
      `Level ${level}: ${time.toFixed(1)} hours`
    ).join('\n')}

    Please provide a JSON response with the following structure:
    {
      "highestCompletionRate": {
        "level": number,
        "rate": number,
        "analysis": "detailed analysis of why this level performs best"
      },
      "timePatterns": {
        "busiestMonth": "month name",
        "quietestMonth": "month name", 
        "analysis": "insights about workload distribution throughout the year"
      },
      "urgencyAnalysis": {
        "criticalTasks": number,
        "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
        "priorityInsights": "analysis of current urgent tasks and priority management"
      },
      "productivityTrends": {
        "overallTrend": "positive/negative/stable with explanation",
        "improvementAreas": ["area 1", "area 2"],
        "strengths": ["strength 1", "strength 2"]
      }
    }

    Focus on actionable insights and productivity improvement suggestions based on the data patterns.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback if AI doesn't return proper JSON
    return generateFallbackInsights(data);
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return generateFallbackInsights(data);
  }
};

const generateFallbackInsights = (data: TaskAnalysisData): AIInsights => {
  // Find highest completion rate level
  const completionRates = Object.entries(data.tasksByLevel).map(([level, stats]) => ({
    level: parseInt(level),
    rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
  }));
  const highest = completionRates.reduce((max, current) => 
    current.rate > max.rate ? current : max, completionRates[0] || { level: 1, rate: 0 }
  );

  // Find busiest and quietest months
  const monthEntries = Object.entries(data.tasksByMonth);
  const busiestMonth = monthEntries.reduce((max, current) => 
    current[1] > max[1] ? current : max, monthEntries[0] || ["January", 0]
  );
  const quietestMonth = monthEntries.reduce((min, current) => 
    current[1] < min[1] ? current : min, monthEntries[0] || ["January", 0]
  );

  return {
    highestCompletionRate: {
      level: highest.level,
      rate: highest.rate,
      analysis: `Level ${highest.level} tasks have the highest completion rate at ${highest.rate.toFixed(1)}%. This suggests good task scoping at this priority level.`
    },
    timePatterns: {
      busiestMonth: busiestMonth[0],
      quietestMonth: quietestMonth[0],
      analysis: `${busiestMonth[0]} is your busiest month with ${busiestMonth[1]} tasks, while ${quietestMonth[0]} is quieter with ${quietestMonth[1]} tasks. Consider balancing workload distribution.`
    },
    urgencyAnalysis: {
      criticalTasks: data.urgentTasks.length,
      recommendations: [
        "Focus on high-priority urgent tasks first",
        "Break down large urgent tasks into smaller components",
        "Set earlier internal deadlines to avoid last-minute pressure"
      ],
      priorityInsights: `You have ${data.urgentTasks.length} urgent tasks requiring immediate attention. Consider reassessing your priority management strategy.`
    },
    productivityTrends: {
      overallTrend: data.completedTasks > data.overdueTasks ? "positive - more tasks completed than overdue" : "needs improvement - high overdue task count",
      improvementAreas: ["Time estimation", "Priority management", "Deadline planning"],
      strengths: ["Task organization", "Progress tracking", "Data-driven insights"]
    }
  };
};