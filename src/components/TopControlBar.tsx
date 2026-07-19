import { useState } from "react";
import { useChatManager } from "../hooks/useChatManager";

interface TopControlBarProps {
  manager: ReturnType<typeof useChatManager>;
}

export function TopControlBar({ manager }: TopControlBarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const {
    models,
    selectedModel,
    setSelectedModel,
    createNewChat,
    clearCurrentChat,
    isOnline,
    activeChat,
    updateActiveChatSettings
  } = manager;

  return (
    <div style={{ display: "flex", flexDirection: "column", zIndex: 10 }}>
      <div className="top-control-ribbon">
        <div className="brand-area">
          <span className="brand-logo">⌘</span>
          <span>Ollama</span>
          {!isOnline && <span style={{ color: "var(--accent-primary)", fontSize: "11px" }}>(Offline)</span>}
        </div>

        <div className="controls-area">
          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {models.length === 0 ? (
              <option value="">No models available</option>
            ) : (
              models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))
            )}
          </select>
          
          <button 
            className="icon-btn" 
            onClick={() => setShowSettings(!showSettings)} 
            title="Settings"
            style={{ color: showSettings ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            ⚙️
          </button>
          <button className="icon-btn" onClick={clearCurrentChat} title="Clear Chat">
            🗑️
          </button>
          <button className="icon-btn" onClick={() => createNewChat()} title="New Chat">
            ＋
          </button>
        </div>
      </div>
      
      {/* Expanded Settings Panel */}
      {showSettings && activeChat && (
        <div className="settings-ribbon">
          <div className="setting-group">
            <label>System Prompt</label>
            <input 
              type="text" 
              className="system-prompt-input"
              value={activeChat.systemPrompt}
              onChange={(e) => updateActiveChatSettings("systemPrompt", e.target.value)}
              placeholder="e.g. You are a helpful AI..."
            />
          </div>
          <div className="setting-group">
            <label>Temp: {activeChat.temperature}</label>
            <input
              type="range"
              min="0.1" max="1.5" step="0.1"
              style={{ accentColor: "var(--text-primary)" }}
              value={activeChat.temperature}
              onChange={(e) => updateActiveChatSettings("temperature", parseFloat(e.target.value))}
            />
          </div>
          <div className="setting-group checkbox-group">
            <label>
              <input
                type="checkbox"
                style={{ accentColor: "var(--text-primary)" }}
                checked={activeChat.enableThinking ?? false}
                onChange={(e) => updateActiveChatSettings("enableThinking", e.target.checked)}
              />
              Show Thinking
            </label>
            <label>
              <input
                type="checkbox"
                style={{ accentColor: "var(--text-primary)" }}
                checked={activeChat.forceJson ?? false}
                onChange={(e) => updateActiveChatSettings("forceJson", e.target.checked)}
              />
              Force JSON Mode
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
