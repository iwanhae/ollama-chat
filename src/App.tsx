import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from "marked";
import "./App.css";

// Configure marked options for line breaks and GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  temperature: number;
  model: string;
  enableThinking?: boolean; // Toggle to show/hide thinking block
  forceJson?: boolean; // Force JSON output mode
}

interface OllamaModel {
  name: string;
  model: string;
}

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
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Fetch models and load chats on mount
  useEffect(() => {
    fetchModels();
    loadChatsFromServer();
  }, []);

  const loadChatsFromServer = async () => {
    try {
      const response = await fetch("/api/chats");
      if (response.ok) {
        const data = await response.json() as ChatSession[];
        if (data && data.length > 0) {
          setChats(data);
          setActiveChatId(data[0].id);
          return;
        }
      }
      createNewChat();
    } catch (err) {
      console.error("Failed to load chats from server, falling back to localStorage:", err);
      const savedChats = localStorage.getItem("ollama_chats");
      if (savedChats) {
        try {
          const parsed = JSON.parse(savedChats) as ChatSession[];
          setChats(parsed);
          if (parsed.length > 0) {
            setActiveChatId(parsed[0].id);
            return;
          }
        } catch (e) {
          console.error("Failed to parse local storage fallback:", e);
        }
      }
      createNewChat();
    }
  };

  // Save chats to localStorage and server (debounced to prevent multiple writes during stream generation)
  useEffect(() => {
    if (chats.length === 0) return;

    // Instant local backup
    localStorage.setItem("ollama_chats", JSON.stringify(chats));

    // Debounced server write
    const writeTimer = setTimeout(() => {
      saveChatsToServer(chats);
    }, 1500);

    return () => clearTimeout(writeTimer);
  }, [chats]);

  const saveChatsToServer = async (chatsList: ChatSession[]) => {
    try {
      await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatsList),
      });
    } catch (err) {
      console.error("Failed to save chats to server:", err);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChatId, isGenerating]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  // Sync model with current active chat when selectedModel changes
  useEffect(() => {
    if (activeChat && selectedModel && activeChat.model !== selectedModel) {
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, model: selectedModel } : c))
      );
    }
  }, [selectedModel, activeChatId]);

  // Sync selectedModel UI with activeChat model when switching chats
  useEffect(() => {
    if (activeChat?.model) {
      setSelectedModel(activeChat.model);
    }
  }, [activeChatId]);

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/models");
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      const modelsList = data.models || [];
      setModels(modelsList);
      setIsOnline(true);

      // Default to first model if available
      if (modelsList.length > 0 && !selectedModel) {
        setSelectedModel(modelsList[0].name);
      }
    } catch (err) {
      console.error("Failed to connect to backend/Ollama:", err);
      setIsOnline(false);
    }
  };

  const createNewChat = (initialModel?: string) => {
    const defaultModel = initialModel || selectedModel || (models.length > 0 ? models[0].name : "");
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: `New Chat (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      messages: [],
      systemPrompt: "You are a helpful and polite AI Assistant.",
      temperature: 0.7,
      model: defaultModel,
      enableThinking: false, // Default disabled (thinking off)
      forceJson: false, // Default disabled
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);

    if (activeChatId === id) {
      if (updated.length > 0) {
        setActiveChatId(updated[0].id);
      } else {
        createNewChat();
      }
    }
  };

  const clearCurrentChat = () => {
    if (!activeChat) return;
    if (window.confirm("현재 대화 내용을 모두 삭제하시겠습니까?")) {
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, messages: [] } : c))
      );
    }
  };

  const updateActiveChatSettings = (key: "systemPrompt" | "temperature" | "enableThinking" | "forceJson", value: any) => {
    if (!activeChat) return;
    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, [key]: value } : c))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim() || isGenerating || !activeChat) return;

    const userPrompt = inputText.trim();
    setInputText("");

    // 1. Add User Message
    const userMsg: Message = { role: "user", content: userPrompt, id: `msg-user-${Date.now()}` };
    const updatedMessages = [...activeChat.messages, userMsg];

    // Update active chat title if it's the first message
    const currentTitle = activeChat.title.startsWith("New Chat")
      ? (userPrompt.length > 15 ? userPrompt.substring(0, 15) + "..." : userPrompt)
      : activeChat.title;

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              title: currentTitle,
              messages: updatedMessages,
            }
          : c
      )
    );

    // 2. Prepare for Assistant Message Stream
    setIsGenerating(true);

    const assistantMsgIndex = updatedMessages.length;
    const initialAssistantMsg: Message = { role: "assistant", content: "", id: `msg-ai-${Date.now()}` };

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [...updatedMessages, initialAssistantMsg] }
          : c
      )
    );

    try {
      // Build message payload
      const messagesPayload: Message[] = [];
      
      // Inject System Prompt if present
      if (activeChat.systemPrompt.trim()) {
        messagesPayload.push({ role: "system", content: activeChat.systemPrompt });
      }

      // Add conversation history
      messagesPayload.push(...updatedMessages);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel || activeChat.model,
          messages: messagesPayload,
          think: activeChat.enableThinking ?? false,
          format: activeChat.forceJson ? "json" : undefined, // Force JSON mode at request level
          options: {
            temperature: activeChat.temperature,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream in response");

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

        let hasStartedThinking = false;
        let hasFinishedThinking = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              
              let chunk = "";
              const thinkingToken = parsed.message?.thinking || "";
              const contentToken = parsed.message?.content || "";

              if (thinkingToken) {
                if (!hasStartedThinking) {
                  chunk += "<think>";
                  hasStartedThinking = true;
                }
                chunk += thinkingToken;
              } else if (contentToken) {
                if (hasStartedThinking && !hasFinishedThinking) {
                  chunk += "</think>\n\n";
                  hasFinishedThinking = true;
                }
                chunk += contentToken;
              }

              if (!chunk) continue;

              setChats((prev) =>
                prev.map((c) => {
                  if (c.id !== activeChatId) return c;
                  const newMessages = [...c.messages];
                  if (newMessages[assistantMsgIndex]) {
                    newMessages[assistantMsgIndex] = {
                      ...newMessages[assistantMsgIndex],
                      content: newMessages[assistantMsgIndex].content + chunk,
                    };
                  }
                  return { ...c, messages: newMessages };
                })
              );
            } catch (e) {
              console.warn("Could not parse ndjson line:", line, e);
            }
          }
        }
    } catch (err: any) {
      console.error("Stream generation failed:", err);
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== activeChatId) return c;
          const newMessages = [...c.messages];
          if (newMessages[assistantMsgIndex]) {
            newMessages[assistantMsgIndex] = {
              ...newMessages[assistantMsgIndex],
              content: newMessages[assistantMsgIndex].content + `\n\n*[에러 발생: Ollama 모델 생성에 실패했습니다. (${err.message})]*`,
            };
          }
          return { ...c, messages: newMessages };
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Safe Markdown parser using marked library, with custom <think> block splitting
  const renderMessageContent = (content: string) => {
    if (!content) return null;

    const showThinking = activeChat?.enableThinking ?? true;

    // Check for thinking blocks enclosed in <think>...</think>
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const match = thinkRegex.exec(content);

    let thinkingText = "";
    let mainText = content;

    if (match) {
      thinkingText = match[1].trim();
      mainText = content.replace(thinkRegex, "").trim();
    } else {
      // Handle incomplete thinking tags during streaming (e.g. <think> without closing </think>)
      if (content.startsWith("<think>")) {
        const openedTagIndex = content.indexOf("<think>");
        const closedTagIndex = content.indexOf("</think>");
        if (closedTagIndex === -1 && openedTagIndex !== -1) {
          thinkingText = content.substring(openedTagIndex + 7).trim();
          mainText = "";
        }
      }
    }

    // Prettify JSON if forceJson is enabled
    let isFormattedJson = false;
    let formattedJsonHTML = "";

    if (activeChat?.forceJson && mainText.trim()) {
      try {
        // Try to parse clean JSON
        const jsonObj = JSON.parse(mainText);
        const prettyJson = JSON.stringify(jsonObj, null, 2);
        // Build a Markdown code block with 'json' syntax so that marked parses it with proper wrappers
        const markdownCodeBlock = "```json\n" + prettyJson + "\n```";
        formattedJsonHTML = marked.parse(markdownCodeBlock, { async: false }) as string;
        isFormattedJson = true;
      } catch (e) {
        // If parsing fails (e.g. streaming has not finished and the JSON is incomplete)
        // Render the raw stream inside a code block for temporary highlighting
        const incompleteCodeBlock = "```json\n" + mainText + "\n```";
        formattedJsonHTML = marked.parse(incompleteCodeBlock, { async: false }) as string;
        isFormattedJson = true;
      }
    }

    try {
      const parsedMainHTML = isFormattedJson ? formattedJsonHTML : (marked.parse(mainText, { async: false }) as string);
      
      return (
        <div>
          {/* Render thinking block if enabled and text exists */}
          {showThinking && thinkingText && (
            <div className="thinking-process-block">
              <div className="thinking-title">
                <span>💭 Thinking Process</span>
              </div>
              <div className="thinking-content">{thinkingText}</div>
            </div>
          )}
          {/* Render main response */}
          {parsedMainHTML && (
            <div 
              className="markdown-body" 
              dangerouslySetInnerHTML={{ __html: parsedMainHTML }} 
            />
          )}
        </div>
      );
    } catch (err) {
      console.error("Failed to parse markdown:", err);
      return (
        <div>
          {showThinking && thinkingText && (
            <div className="thinking-process-block">
              <div className="thinking-title">💭 Thinking Process</div>
              <div className="thinking-content">{thinkingText}</div>
            </div>
          )}
          <div className="markdown-body" style={{ whiteSpace: "pre-wrap" }}>{mainText}</div>
        </div>
      );
    }
  };

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

      {/* Sidebar Panel (translucent with blur) */}
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

      {/* Main Chat Container */}
      <div className="chat-container">
        {/* Top Header */}
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

        {/* Message Feed */}
        <div className="chat-messages">
          {activeChat && activeChat.messages.length === 0 ? (
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
                    onClick={() => setInputText(s.prompt)}
                  >
                    <div className="suggestion-header">{s.title}</div>
                    <div className="suggestion-body">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            activeChat?.messages.map((msg, index) => (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className={`message-row ${msg.role}`}
              >
                <div className="message-bubble">
                  {renderMessageContent(msg.content)}
                </div>
              </motion.div>
            ))
          )}

          {/* Typing Indicator */}
          <AnimatePresence>
            {isGenerating && (
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

        {/* Input Bar */}
        <div className="input-area">
          <div className="input-container">
            <textarea
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
      </div>
    </div>
  );
}

export default App;
