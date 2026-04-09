import { runDefaultConversationRetentionSweep } from "../src/lib/chat/conversation-retention-worker";

async function main() {
  const report = await runDefaultConversationRetentionSweep();
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

void main();