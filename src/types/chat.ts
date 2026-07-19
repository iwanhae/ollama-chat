export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
  metrics?: {
    ttftMs?: number;
    tps?: number;
    evalCount?: number;
    totalDurationMs?: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  temperature: number;
  model: string;
  enableThinking?: boolean; // Toggle to show/hide thinking block
  forceJson?: boolean; // Force JSON output mode
}

export interface OllamaModel {
  name: string;
  model: string;
}
