import { useState, useEffect } from "react";
import "../styles/ApiKeyModal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySubmit: (apiKey: string) => void;
  currentApiKey?: string;
}

const ApiKeyModal = ({ isOpen, onClose, onApiKeySubmit, currentApiKey }: Props) => {
  const [apiKey, setApiKey] = useState(currentApiKey || "");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && currentApiKey) {
      setApiKey(currentApiKey);
    }
  }, [isOpen, currentApiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }

    // Basic validation for Gemini API key format
    if (!apiKey.startsWith("AIza")) {
      setError("Invalid API key format. Gemini API keys should start with 'AIza'");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      // Test the API key by making a simple request
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Make a simple test request
      await model.generateContent("Hello");
      
      // If successful, save the API key
      onApiKeySubmit(apiKey);
      onClose();
    } catch (error: any) {
      console.error("API key validation failed:", error);
      
      // Handle specific error types
      if (error?.message?.includes("User location is not supported")) {
        setError(
          "❌ Gemini AI is not available in your region. The AI Habits feature will use local analysis instead of AI-powered insights. You can still use all other analytics features."
        );
        
        // Allow user to proceed with fallback mode
        setTimeout(() => {
          onApiKeySubmit("FALLBACK_MODE");
          onClose();
        }, 3000);
      } else if (error?.message?.includes("API key not valid")) {
        setError("❌ Invalid API key. Please check your key and try again.");
      } else if (error?.message?.includes("quota exceeded")) {
        setError("❌ API quota exceeded. Please check your usage limits or try again later.");
      } else {
        setError("❌ API validation failed. The system will use local analysis instead. Click 'Continue with Local Analysis' to proceed.");
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleFallbackMode = () => {
    onApiKeySubmit("FALLBACK_MODE");
    onClose();
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="api-key-modal-overlay" onClick={handleClose}>
      <div className="api-key-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Setup Gemini AI</h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="info-section">
            <div className="info-card">
              <h3>🔑 Get Your Free Gemini API Key</h3>
              <p>
                To use AI-powered insights in the Habits tab, you need a free Gemini API key from Google.
              </p>
              
              <div className="steps">
                <div className="step">
                  <span className="step-number">1</span>
                  <span>Visit Google AI Studio</span>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <span>Sign in with your Google account</span>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <span>Create a new API key</span>
                </div>
                <div className="step">
                  <span className="step-number">4</span>
                  <span>Copy and paste it below</span>
                </div>
              </div>

              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="get-api-key-button"
              >
                🔗 Get API Key from Google AI Studio
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="api-key-form">
            <div className="form-group">
              <label htmlFor="apiKey">Gemini API Key</label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className={error ? "error" : ""}
                disabled={isValidating}
              />
              {error && (
                <div className="error-container">
                  <span className="error-message">{error}</span>
                  {(error.includes("location is not supported") || error.includes("API validation failed")) && (
                    <button 
                      type="button"
                      onClick={handleFallbackMode}
                      className="fallback-button"
                    >
                      Continue with Local Analysis
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="security-note">
              <div className="security-icon">🔒</div>
              <div className="security-text">
                <strong>Privacy Notice:</strong> Your API key is only stored in your browser session 
                and is never sent to our servers. It's used directly to communicate with Google's AI services.
              </div>
            </div>

            <div className="region-info">
              <div className="info-icon">ℹ️</div>
              <div className="info-text">
                <strong>Note:</strong> Gemini AI is not available in all regions. If you're in an unsupported location, 
                the system will automatically use local analysis to provide insights based on your task data.
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleClose}
                className="cancel-button"
                disabled={isValidating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={isValidating || !apiKey.trim()}
              >
                {isValidating ? (
                  <>
                    <span className="loading-spinner"></span>
                    Validating...
                  </>
                ) : (
                  "Save & Continue"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;