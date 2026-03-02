export function extractTextFromSseBlock(block: string): string {
  const lines = block.split("\n");
  let eventName = "";
  const dataParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).trim());
    }
  }

  const dataValue = dataParts.join("\n");
  if (!dataValue || dataValue === "[DONE]") {
    return "";
  }

  try {
    const payload = JSON.parse(dataValue) as {
      delta?: { text?: string };
      content_block?: { text?: string };
    };

    if (eventName === "content_block_delta" && payload.delta?.text) {
      return payload.delta.text;
    }

    if (eventName === "content_block_start" && payload.content_block?.text) {
      return payload.content_block.text;
    }
  } catch {
    return "";
  }

  return "";
}

export class SseTextParser {
  private buffer = "";

  feed(chunk: string): string[] {
    this.buffer += chunk;
    const blocks = this.buffer.split("\n\n");
    this.buffer = blocks.pop() ?? "";

    const texts: string[] = [];
    for (const block of blocks) {
      const text = extractTextFromSseBlock(block);
      if (text) {
        texts.push(text);
      }
    }

    return texts;
  }
}
