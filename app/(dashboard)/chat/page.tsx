import { ChatWindow } from "@/components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Ask CyRO</h1>
        <p className="text-sm text-ink-soft">
          A grounded assistant — it only phrases numbers the risk engine has
          already calculated, and cites its source every time.
        </p>
      </div>

      <ChatWindow />
    </div>
  );
}