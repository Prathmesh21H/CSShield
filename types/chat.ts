export type ChatRole = "user" | "assistant";

export interface ChatSource {
  label: string;
  findingId?: string;
  assetId?: string;
  controlId?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
  createdAt: string;
}