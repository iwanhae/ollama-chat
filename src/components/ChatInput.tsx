import { useRef, useEffect } from "react";
import { useChatManager } from "../hooks/useChatManager";

interface ChatInputProps {
  manager: ReturnType<typeof useChatManager>;
}

export function ChatInput({ manager }: ChatInputProps) {
  const { inputText, setInputText, isGenerating, isOnline, handleSubmit } = manager;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    if (!isGenerating && isOnline && textareaRef.current) {
      // Small timeout to ensure the disabled state has been fully removed from DOM
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isGenerating, isOnline]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="input-area">
      <textarea
        id="main-chat-input"
        ref={textareaRef}
        rows={1}
        className="chat-input"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Shift+Enter for new line)"
        disabled={isGenerating || !isOnline}
      />
      
      <div className="input-footer">
        <div className="input-meta">
          Local Engine Active
        </div>
        <button
          className="send-btn"
          onClick={handleSubmit}
          disabled={!inputText.trim() || isGenerating || !isOnline}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
