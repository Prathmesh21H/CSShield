"use client";

import { useCallback, useState } from "react";
import type { ChatMessage } from "@/types/chat";

interface ChatState {
  messages: ChatMessage[];
  status: "idle" | "sending" | "error";
  errorMessage: string | null;
  sendMessage: (content: string) => Promise<void>;
}

export function useChat(): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatState["status"]>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStatus("sending");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error?.message ??
            "Assistant is temporarily unavailable — the raw dashboard data is still accurate."
        );
      }

      const data: { answer: string; sources: ChatMessage["sources"] } =
        await response.json();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatus("idle");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not reach the assistant."
      );
      setStatus("error");
    }
  }, []);

  return { messages, status, errorMessage, sendMessage };
}