import { useChatManager } from "../hooks/useChatManager";

interface ChatHeaderProps {
  manager: ReturnType<typeof useChatManager>;
}

export function ChatHeader({ manager }: ChatHeaderProps) {
  const { activeChat, isOnline, clearCurrentChat, createNewChat } = manager;

  return (
    <div className="chat-header">
      <div className="header-model-info">
        <div className="header-model-name">
          {activeChat ? activeChat.model || "Select Model" : "Select Model"}
        </div>
        <div className="header-model-desc">
          {isOnline ? "Local Endpoint Active" : "Endpoint Offline"}
        </div>
      </div>

      <div className="header-actions">
        <button className="icon-btn" onClick={clearCurrentChat} title="Clear Chat Messages">
          🗑️
        </button>
        <button className="icon-btn" onClick={() => createNewChat()} title="Start New Session">
          ＋
        </button>
      </div>
    </div>
  );
}
