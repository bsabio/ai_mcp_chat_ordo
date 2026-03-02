"use client";

import { FormEvent } from "react";
import { useChatStream } from "@/hooks/useChatStream";

export default function Home() {
  const { messages, input, isSending, canSend, setInput, sendMessage } = useChatStream();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    await sendMessage(event);
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold">Claude Chat</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Math questions are forced through the calculator tool.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Ask anything. For arithmetic, the assistant must use the calculator tool.
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700"
                >
                  <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {message.role}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your message"
              className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
