import { useRef, useEffect } from "react";
import { useChatManager } from "../hooks/useChatManager";

interface ChatInputProps {
  manager: ReturnType<typeof useChatManager>;
}

export function ChatInput({ manager }: ChatInputProps) {
  const { inputText, setInputText, isGenerating, isOnline, selectedModel, handleSubmit } = manager;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="input-area">
      <div className="input-container">
        <textarea
          id="main-chat-input"
          ref={textareaRef}
          rows={1}
          className="chat-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="무엇이든 물어보세요... (Shift+Enter로 줄바꿈, Enter로 전송)"
          disabled={isGenerating || !isOnline}
        />
        <button
          className="send-btn"
          onClick={handleSubmit}
          disabled={!inputText.trim() || isGenerating || !isOnline}
        >
          ↑
        </button>
      </div>
      <div className="input-meta">
        <span>Model: {selectedModel || "None"}</span>
        <span>Bun + Vite + React App</span>
      </div>
    </div>
  );
}
