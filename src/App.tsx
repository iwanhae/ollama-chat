import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatManager } from "./hooks/useChatManager";
import { Sidebar } from "./components/Sidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageRow } from "./components/MessageRow";
import { ChatInput } from "./components/ChatInput";
import "./App.css";

const SUGGESTIONS = [
  {
    title: "Write a script",
    desc: "Create a Python script that calculates Fibonacci numbers.",
    prompt: "Python으로 피보나치 수열을 구하는 스크립트를 작성해줘."
  },
  {
    title: "Explain a concept",
    desc: "Explain the concept of quantum computing in simple terms.",
    prompt: "양자 컴퓨터(Quantum Computing)의 핵심 개념을 아주 쉽게 설명해줘."
  },
  {
    title: "Debug code",
    desc: "Find bugs and suggest optimization in my Javascript function.",
    prompt: "다음 JavaScript 함수의 버그를 찾고 최적화하는 방법을 알려줘:\n\n```js\nfunction findMax(arr) {\n  let max = 0;\n  for(let i=0; i<arr.length; i++) {\n    if(arr[i] > max) max = arr[i];\n  }\n  return max;\n}\n```"
  },
  {
    title: "Help me write",
    desc: "Write an email template asking for a project update.",
    prompt: "협력사에 프로젝트 진행 상황(업데이트)을 정중하게 요청하는 이메일 템플릿을 작성해줘."
  }
];

function App() {
  const manager = useChatManager();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [manager.chats, manager.activeChatId, manager.isGenerating]);

  return (
    <div className="app-layout">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <button
          className="menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
        <span className="brand-title" style={{ fontSize: "14px", marginLeft: "10px" }}>
          Ollama Playground
        </span>
      </div>

      <Sidebar 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        manager={manager} 
      />

      <div className="chat-container">
        <ChatHeader manager={manager} />

        {/* Message Feed */}
        <div className="chat-messages">
          {manager.activeChat && manager.activeChat.messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-logo">⌘</div>
              <h1 className="empty-title">Ollama Playground</h1>
              <p className="empty-subtitle">
                Bun과 React로 구동되는 로컬 AI 플레이그라운드입니다. 아래 제안들을 시험해 보거나 직접 프롬프트를 작성해 보세요.
              </p>
              <div className="suggestions-grid">
                {SUGGESTIONS.map((s, idx) => (
                  <div
                    key={idx}
                    className="suggestion-card"
                    onClick={() => manager.setInputText(s.prompt)}
                  >
                    <div className="suggestion-header">{s.title}</div>
                    <div className="suggestion-body">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            manager.activeChat?.messages.map((msg, index) => (
              <MessageRow
                key={msg.id || index}
                msg={msg}
                index={index}
                activeChat={manager.activeChat!}
                isGenerating={manager.isGenerating}
                handleEditMessage={manager.handleEditMessage}
                handleRegenerate={manager.handleRegenerate}
              />
            ))
          )}

          {/* Typing Indicator */}
          <AnimatePresence>
            {manager.isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="typing-indicator"
              >
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <ChatInput manager={manager} />
      </div>
    </div>
  );
}

export default App;
