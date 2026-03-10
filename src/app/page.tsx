import { ChatContainer } from "@/frameworks/ui/ChatContainer";

export default function Home() {
  return (
    <div className="flex-1 w-full bg-[var(--background)] flex flex-col min-h-0 overflow-hidden">
      <div className="mx-auto w-full flex-1 max-w-[var(--container-width)] px-[var(--container-padding)] flex flex-col min-h-0 overflow-hidden">
        <ChatContainer isFloating={false} />
      </div>
    </div>
  );
}
