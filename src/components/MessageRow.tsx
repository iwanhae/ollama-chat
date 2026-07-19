import { motion } from "framer-motion";
import { marked } from "marked";
import type { Message, ChatSession } from "../types/chat";

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

    if (activeChat?.forceJson && mainText.trim()) {
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
              <div className="thinking-title">
                <span>💭 Thinking Process</span>
              </div>
              <div className="thinking-content">{thinkingText}</div>
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
              <div className="thinking-title">💭 Thinking Process</div>
              <div className="thinking-content">{thinkingText}</div>
            </div>
          )}
          <div className="markdown-body" style={{ whiteSpace: "pre-wrap" }}>
            {mainText}
          </div>
        </div>
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className={`message-row ${msg.role}`}
    >
      <div className="message-bubble-wrapper">
        <div className="message-bubble">{renderMessageContent(msg.content)}</div>
        {!isGenerating && (
          <div className="message-actions">
            {msg.role === "user" && (
              <button
                className="msg-action-btn"
                onClick={() => handleEditMessage(index)}
                title="이전 대화로 분기 및 편집 (Edit & Branch)"
              >
                ✏️ 편집 및 분기
              </button>
            )}
            {msg.role === "assistant" && msg.content && (
              <button
                className="msg-action-btn"
                onClick={() => handleRegenerate(index)}
                title="이후 답변 재생성 (Regenerate)"
              >
                ↻ 답변 재생성
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
