import { useChatManager } from "../hooks/useChatManager";

interface TopControlBarProps {
  manager: ReturnType<typeof useChatManager>;
}

export function TopControlBar({ manager }: TopControlBarProps) {
  const {
    models,
    selectedModel,
    setSelectedModel,
    createNewChat,
    clearCurrentChat,
    isOnline,
  } = manager;

  return (
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
        
        <button className="icon-btn" onClick={clearCurrentChat} title="Clear Chat">
          🗑️
        </button>
        <button className="icon-btn" onClick={() => createNewChat()} title="New Chat">
          ＋
        </button>
      </div>
    </div>
  );
}
