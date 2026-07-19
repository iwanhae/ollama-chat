import { motion } from "framer-motion";
import { useChatManager } from "../hooks/useChatManager";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  manager: ReturnType<typeof useChatManager>;
}

export function Sidebar({ mobileMenuOpen, setMobileMenuOpen, manager }: SidebarProps) {
  const {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    models,
    selectedModel,
    setSelectedModel,
    createNewChat,
    deleteChat,
    updateActiveChatSettings,
    fetchModels,
    isOnline,
  } = manager;

  return (
    <div className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
      <div className="brand-section">
        <div className="brand-logo">⌘</div>
        <span className="brand-title">Ollama Console</span>
        <span className="brand-version">v1.2</span>
      </div>

      <div className="sidebar-content">
        {/* New Chat Button */}
        <button className="new-chat-btn" onClick={() => createNewChat()}>
          + New Chat
        </button>

        {/* Model Selector */}
        <div className="config-section">
          <span className="section-label">Select Model</span>
          <div className="select-wrapper">
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
          </div>
        </div>

        {/* Parameters Panel */}
        {activeChat && (
          <div className="config-section">
            <span className="section-label">Parameters</span>
            <div className="parameter-panel">
              <div className="parameter-row">
                <div className="parameter-header">
                  <span>Temperature</span>
                  <span>{activeChat.temperature}</span>
                </div>
                <input
                  type="range"
                  className="parameter-input-range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={activeChat.temperature}
                  onChange={(e) => updateActiveChatSettings("temperature", parseFloat(e.target.value))}
                />
              </div>
              <div className="parameter-row">
                <div className="parameter-header">
                  <span>System Prompt</span>
                </div>
                <textarea
                  className="system-prompt-textarea"
                  value={activeChat.systemPrompt}
                  onChange={(e) => updateActiveChatSettings("systemPrompt", e.target.value)}
                  placeholder="System prompt instructions..."
                />
              </div>
              <div className="parameter-row" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-secondary)" }}>Show Thinking</span>
                <input
                  type="checkbox"
                  checked={activeChat.enableThinking ?? false}
                  onChange={(e) => updateActiveChatSettings("enableThinking", e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: "var(--accent-blue)",
                    cursor: "pointer",
                  }}
                />
              </div>
              <div className="parameter-row" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-secondary)" }}>Force JSON Mode</span>
                <input
                  type="checkbox"
                  checked={activeChat.forceJson ?? false}
                  onChange={(e) => updateActiveChatSettings("forceJson", e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: "var(--accent-blue)",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Chat History Sessions */}
        <div className="history-section">
          <span className="section-label">Chat History</span>
          <div className="history-list">
            {chats.map((chat) => (
              <button
                key={chat.id}
                className={`history-item ${chat.id === activeChatId ? "active" : ""}`}
                onClick={() => {
                  setActiveChatId(chat.id);
                  setMobileMenuOpen(false);
                }}
              >
                {/* Shared layout active highlight pill */}
                {chat.id === activeChatId && (
                  <motion.div
                    layoutId="activeHighlight"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      background: "var(--bg-card)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-light)",
                      zIndex: 1,
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                  />
                )}
                
                <span className="history-title">{chat.title}</span>
                <button
                  className="delete-history-btn"
                  onClick={(e) => deleteChat(chat.id, e)}
                >
                  ✕
                </button>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Footer with Ollama Status */}
      <div className="sidebar-footer">
        <div className={`status-dot ${isOnline ? "" : "offline"}`}></div>
        <span className="status-text">
          {isOnline ? "Ollama Connected" : "Ollama Offline"}
        </span>
        <button
          className="icon-btn"
          style={{ marginLeft: "auto", width: "24px", height: "24px", borderRadius: "50%" }}
          onClick={fetchModels}
          title="Refresh Ollama Connection"
        >
          ↻
        </button>
      </div>
    </div>
  );
}
