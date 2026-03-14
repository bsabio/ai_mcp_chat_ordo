# Search Results: OpenAI Responses API web_search tool supported models gpt-5 gpt-4o-search-preview 2025 2026

**Date:** 2026-03-12 03:47:43

## Answer

Short answer
- Yes—using the Responses API, GPT‑5 family models support the web_search tool. Exception: GPT‑5 with reasoning.effort set to minimal does not support it. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
- gpt‑4o‑search‑preview is a specialized “always search” model. It’s primarily documented for Chat Completions, but it’s also callable from the Responses API and will perform web search by default. Latest listed snapshot is gpt-4o-search-preview-2025-03-11. ([developers.openai.com](https://developers.openai.com/api/docs/models/gpt-4o-search-preview?utm_source=openai))

What’s supported (Responses API)
- Tool-capable models (e.g., GPT‑5 and newer variants) can use the web_search tool by adding { "type": "web_search" } in tools. Limitation: not available with GPT‑5 at reasoning.effort = "minimal"; also not supported on gpt‑4.1‑nano. Example in docs uses model: "gpt-5". ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
- Specialized search models can also be called via Responses if you want “always-on” search: gpt‑4o‑search‑preview and gpt‑4o‑mini‑search‑preview. They carry an extra per‑search tool‑call fee and have a 128k context window. ([platform.openai.com](https://platform.openai.com/docs/models/gpt-4o-search-preview?utm_source=openai))

What’s supported (Chat Completions)
- If you use Chat Completions instead of Responses, you should pick a specialized search model: gpt‑5‑search‑api, gpt‑4o‑search‑preview, or gpt‑4o‑mini‑search‑preview. These models always perform web retrieval. To make web search optional, switch to the Responses API and add the web_search tool. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))

Dates and context
- Web search as a first‑party tool shipped with the Responses API in March 2025 and remains supported as of March 12, 2026. ([openai.com](https://openai.com/index/new-tools-and-features-in-the-responses-api/?utm_source=openai))

Minimal usage example (Responses API)
- JSON body: { "model": "gpt-5", "tools": [{ "type": "web_search" }], "input": "Your question" }. This configuration lets GPT‑5 decide when to call web_search and returns sources/citations. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))

Notes
- Rate limits and pricing for web_search tool calls are tied to the underlying model; search calls incur an additional per‑tool‑call fee. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
- Deep/agentic research behaviors (open_page, find_in_page) are available with reasoning models (e.g., GPT‑5 with non‑minimal effort). ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))

If you want, tell me your endpoint (Responses or Chat Completions) and your target model(s), and I’ll give you a ready-to-run request.
