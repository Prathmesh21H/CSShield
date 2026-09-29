import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[80%] border px-4 py-3 text-sm",
          isAssistant
            ? "border-line bg-surface text-ink"
            : "border-accent bg-accent text-white"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
            {message.sources.map((source, i) => (
              <Badge key={i} tone="accent">
                {source.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}