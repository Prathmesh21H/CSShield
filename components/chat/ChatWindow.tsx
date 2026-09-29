"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { StateMessage } from "@/components/ui/StateMessage";
import { useChat } from "@/hooks/useChat";

const SUGGESTED_QUESTIONS = [
  "What's our biggest risk today?",
  "What's our current compliance status?",
  "What would a ₹50 lakh budget fix?",
];

export function ChatWindow() {
  const { messages, status, errorMessage, sendMessage } = useChat();
  const [input, setInput] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || status === "sending") return;
    setInput("");
    sendMessage(trimmed);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col border border-line bg-surface">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-ink-soft">
              Ask about your current risk, budget, or compliance status. Every
              answer is grounded in numbers the platform has already calculated.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-accent hover:text-accent"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {status === "sending" && (
              <div className="flex justify-start">
                <div className="border border-line bg-surface px-4 py-3 text-sm text-ink-soft">
                  Thinking…
                </div>
              </div>
            )}
            {status === "error" && (
              <StateMessage
                tone="error"
                title="Assistant is temporarily unavailable"
                description={errorMessage ?? "The raw dashboard data is still accurate — try the Overview page."}
              />
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your risk…"
          className="flex-1 border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === "sending" || !input.trim()}
          className="flex items-center justify-center bg-ink px-4 text-white disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}