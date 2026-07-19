import { motion } from "framer-motion";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import markedKatex from "marked-katex-extension";
import type { Message, ChatSession } from "../types/chat";

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

marked.use(markedKatex({
  throwOnError: false
}));

interface MessageRowProps {
  msg: Message;
  index: number;
  activeChat: ChatSession;
  isGenerating: boolean;
  handleEditMessage: (index: number) => void;
  handleRegenerate: (index: number) => void;
}

export function MessageRow({
  msg,
  index,
  activeChat,
  isGenerating,
  handleEditMessage,
  handleRegenerate,
}: MessageRowProps) {
  const renderMessageContent = (content: string) => {
    if (!content) return null;

    const showThinking = activeChat?.enableThinking ?? true;

    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const match = thinkRegex.exec(content);

    let thinkingText = "";
    let mainText = content;

    if (match) {
      thinkingText = match[1].trim();
      mainText = content.replace(thinkRegex, "").trim();
    } else {
      if (content.startsWith("<think>")) {
        const openedTagIndex = content.indexOf("<think>");
        const closedTagIndex = content.indexOf("</think>");
        if (closedTagIndex === -1 && openedTagIndex !== -1) {
          thinkingText = content.substring(openedTagIndex + 7).trim();
          mainText = "";
        }
      }
    }

    let isFormattedJson = false;
    let formattedJsonHTML = "";

    if (msg.role === "assistant" && activeChat?.forceJson && mainText.trim()) {
      try {
        const jsonObj = JSON.parse(mainText);
        const prettyJson = JSON.stringify(jsonObj, null, 2);
        const markdownCodeBlock = "```json\n" + prettyJson + "\n```";
        formattedJsonHTML = marked.parse(markdownCodeBlock, { async: false }) as string;
        isFormattedJson = true;
      } catch (e) {
        const incompleteCodeBlock = "```json\n" + mainText + "\n```";
        formattedJsonHTML = marked.parse(incompleteCodeBlock, { async: false }) as string;
        isFormattedJson = true;
      }
    }

    try {
      const parsedMainHTML = isFormattedJson
        ? formattedJsonHTML
        : (marked.parse(mainText, { async: false }) as string);

      return (
        <div>
          {showThinking && thinkingText && (
            <div className="thinking-process-block">
              <div className="thinking-title">THINKING PROCESS</div>
              <div 
                className="thinking-content markdown-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(thinkingText, { async: false }) as string }}
              />
            </div>
          )}
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
              <div className="thinking-title">THINKING PROCESS</div>
              <div 
                className="thinking-content markdown-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(thinkingText, { async: false }) as string }}
              />
            </div>
          )}
          <div className="markdown-body" style={{ whiteSpace: "pre-wrap" }}>
            {mainText}
          </div>
        </div>
      );
    }
  };

  const isLastMessage = index === activeChat.messages.length - 1;
  const showGeneratingCursor = isGenerating && isLastMessage && msg.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.6 }}
      className={`message-row ${msg.role} ${showGeneratingCursor ? "is-generating" : ""}`}
    >
      <div className="message-header">
        {msg.role === "user" ? "User" : "Assistant"}
      </div>
      
      <div className="message-content">
        {renderMessageContent(msg.content)}
      </div>

      {!isGenerating && (
        <div className="message-footer">
          <div className="message-actions">
            {msg.role === "user" && (
              <button
                className="msg-action-btn"
                onClick={() => handleEditMessage(index)}
                title="이전 대화로 분기 및 편집 (Edit & Branch)"
              >
                EDIT
              </button>
            )}
            {msg.role === "assistant" && msg.content && (
              <button
                className="msg-action-btn"
                onClick={() => handleRegenerate(index)}
                title="이후 답변 재생성 (Regenerate)"
              >
                REGENERATE
              </button>
            )}
          </div>
          
          {msg.role === "assistant" && msg.metrics && (
            <div className="msg-metrics">
              [ TTFT: {(msg.metrics.ttftMs! / 1000).toFixed(2)}s ] [ TPS: {msg.metrics.tps} ] [ Total: {msg.metrics.evalCount} ]
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
