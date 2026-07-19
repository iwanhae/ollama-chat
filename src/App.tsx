import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatManager } from "./hooks/useChatManager";
import { TopControlBar } from "./components/TopControlBar";
import { MessageRow } from "./components/MessageRow";
import { ChatInput } from "./components/ChatInput";
import "./App.css";

const SUGGESTIONS = [
  {
    title: "Draft an abstract",
    desc: "Write an abstract for a computer science paper.",
    prompt: "Write a 200-word abstract for a paper about the impact of large language models on local software development. Focus on latency and privacy."
  },
  {
    title: "Explain a concept",
    desc: "Break down quantum computing.",
    prompt: "Explain the concept of quantum entanglement as if you were explaining it to a high school physics student."
  },
  {
    title: "Debug code",
    desc: "Optimize a Javascript function.",
    prompt: "Find bugs and suggest optimization in this JavaScript function:\n\n```js\nfunction findMax(arr) {\n  let max = 0;\n  for(let i=0; i<arr.length; i++) {\n    if(arr[i] > max) max = arr[i];\n  }\n  return max;\n}\n```"
  },
  {
    title: "Write an email",
    desc: "Request a project update.",
    prompt: "Write a professional email template asking a client for an update on the project milestones we discussed last week."
  }
];

function App() {
  const manager = useChatManager();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [manager.chats, manager.activeChatId, manager.isGenerating]);

  return (
    <div className="app-layout">
      <TopControlBar manager={manager} />

      <div className="chat-container">
        <div className="chat-messages">
          {manager.activeChat && manager.activeChat.messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-logo">⌘</div>
              <h1 className="empty-title">Ollama Ledger</h1>
              <p className="empty-subtitle">
                A highly optimized, privacy-first local AI playground. Built with Bun and React. Try one of the suggestions below or start typing.
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
