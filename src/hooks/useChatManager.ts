import { useState, useEffect } from "react";
import type { ChatSession, Message, OllamaModel } from "../types/chat";

export function useChatManager() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const activeChat = chats.find((c) => c.id === activeChatId);

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

  useEffect(() => {
    if (chats.length === 0) return;

    localStorage.setItem("ollama_chats", JSON.stringify(chats));

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

  useEffect(() => {
    if (activeChat && selectedModel && activeChat.model !== selectedModel) {
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, model: selectedModel } : c))
      );
    }
  }, [selectedModel, activeChatId]);

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

      if (modelsList.length > 0 && !selectedModel) {
        setSelectedModel(modelsList[0].name);
      }
    } catch (err) {
      console.error("Failed to connect to backend/Ollama:", err);
      setIsOnline(false);
    }
  };

  const createNewChat = (initialModel?: string) => {
    setChats((prev) => {
      const currentActive = prev.find((c) => c.id === activeChatId);
      const defaultModel = initialModel || selectedModel || (models.length > 0 ? models[0].name : "");
      const defaultSystemPrompt = currentActive?.systemPrompt ?? "You are a helpful and polite AI Assistant.";
      const defaultTemperature = currentActive?.temperature ?? 0.7;
      const defaultEnableThinking = currentActive?.enableThinking ?? false;
      const defaultForceJson = currentActive?.forceJson ?? false;

      const newChat: ChatSession = {
        id: Date.now().toString(),
        title: `New Chat (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        messages: [],
        systemPrompt: defaultSystemPrompt,
        temperature: defaultTemperature,
        model: defaultModel,
        enableThinking: defaultEnableThinking,
        forceJson: defaultForceJson,
      };
      setActiveChatId(newChat.id);
      return [newChat, ...prev];
    });
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

  const updateActiveChatSettings = (key: keyof ChatSession, value: any) => {
    if (!activeChat) return;
    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, [key]: value } : c))
    );
  };

  const sendStreamRequest = async (history: Message[], assistantMsgIndex: number) => {
    if (!activeChat) return;
    
    const startTime = performance.now();
    let ttftMs = 0;

    setIsGenerating(true);
    try {
      const messagesPayload: Message[] = [];
      if (activeChat.systemPrompt.trim()) {
        messagesPayload.push({ role: "system", content: activeChat.systemPrompt });
      }
      messagesPayload.push(...history);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel || activeChat.model,
          messages: messagesPayload,
          think: activeChat.enableThinking ?? false,
          format: activeChat.forceJson ? "json" : undefined,
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
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            let chunk = "";
            const thinkingToken = parsed.message?.thinking || "";
            const contentToken = parsed.message?.content || "";

            if (ttftMs === 0 && (thinkingToken || contentToken)) {
              ttftMs = performance.now() - startTime;
            }

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

            let metricsObj = undefined;
            if (parsed.done && parsed.eval_count && parsed.eval_duration) {
              const evalDurationMs = parsed.eval_duration / 1e6;
              const tps = parsed.eval_count / (evalDurationMs / 1000);
              metricsObj = {
                ttftMs,
                tps: parseFloat(tps.toFixed(2)),
                evalCount: parsed.eval_count,
                totalDurationMs: parsed.total_duration ? parsed.total_duration / 1e6 : evalDurationMs,
              };
            }

            if (!chunk && !metricsObj) continue;

            setChats((prev) =>
              prev.map((c) => {
                if (c.id !== activeChatId) return c;
                const newMessages = [...c.messages];
                if (newMessages[assistantMsgIndex]) {
                  newMessages[assistantMsgIndex] = {
                    ...newMessages[assistantMsgIndex],
                    content: newMessages[assistantMsgIndex].content + chunk,
                    ...(metricsObj ? { metrics: metricsObj } : {}),
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

  const sendMessage = async (text: string) => {
    if (!text.trim() || isGenerating || !activeChat) return;

    const userMsg: Message = { role: "user", content: text.trim(), id: `msg-user-${Date.now()}` };
    const assistantMsg: Message = { role: "assistant", content: "", id: `msg-ai-${Date.now()}` };
    
    const updatedMessages = [...activeChat.messages, userMsg, assistantMsg];
    const assistantMsgIndex = updatedMessages.length - 1;

    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, messages: updatedMessages } : c))
    );

    await sendStreamRequest(updatedMessages.slice(0, -1), assistantMsgIndex);
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    const userPrompt = inputText.trim();
    setInputText("");
    await sendMessage(userPrompt);
  };

  const handleEditMessage = (index: number) => {
    if (!activeChat || isGenerating) return;
    const targetMessage = activeChat.messages[index];
    if (targetMessage.role !== "user") return;

    setInputText(targetMessage.content);

    const updatedMessages = activeChat.messages.slice(0, index);
    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, messages: updatedMessages } : c))
    );

    setTimeout(() => {
      document.getElementById("main-chat-input")?.focus();
    }, 50);
  };

  const handleRegenerate = async (index: number) => {
    if (!activeChat || isGenerating) return;

    const history = activeChat.messages.slice(0, index);
    if (history.length === 0 || history[history.length - 1].role !== "user") {
      alert("재생성할 이전 질문(User)을 찾을 수 없습니다.");
      return;
    }

    const assistantMsgIndex = history.length;
    const initialAssistantMsg: Message = { role: "assistant", content: "", id: `msg-ai-${Date.now()}` };
    const updatedMessages = [...history, initialAssistantMsg];

    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, messages: updatedMessages } : c))
    );

    await sendStreamRequest(history, assistantMsgIndex);
  };

  return {
    models,
    selectedModel,
    setSelectedModel,
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    inputText,
    setInputText,
    isGenerating,
    isOnline,
    fetchModels,
    createNewChat,
    deleteChat,
    clearCurrentChat,
    updateActiveChatSettings,
    handleSubmit,
    handleEditMessage,
    handleRegenerate,
    sendMessage
  };
}
