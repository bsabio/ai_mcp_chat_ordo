import { getChatStreamProvider } from "@/adapters/StreamProviderFactory";

const streamAdapter = getChatStreamProvider();

export function getChatStreamAdapter() {
  return streamAdapter;
}