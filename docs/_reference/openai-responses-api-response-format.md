# Search Results: OpenAI Responses API web search response format citations annotations

**Date:** 2026-03-12 03:38:40

## Answer

Here’s the compact “what you need to know” for using web search with the OpenAI Responses API, and how citations/annotations show up in the response.

Enable web search
- In Responses, add a tool: tools: [{ "type": "web_search" }]. Optional knobs: filters.allowed_domains (limit to certain sites), user_location (approximate geo), and external_web_access (true/false for live vs cached). ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
- In Chat Completions, use the search-capable models (e.g., gpt-5-search-api, gpt-4o-search-preview). ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))

What the API returns (shape and where citations live)
- The response’s output array will contain:
  - A web_search_call item describing the search actions (action can be search, open_page, find_in_page). ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
  - A message item with content[0].type = "output_text". The text will include inline citations, and content[0].annotations will list each citation. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
- Each web citation annotation is type = "url_citation" and includes url, title, start_index, end_index (character offsets into the model’s text). ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
- If you also want the full set of URLs the model looked at (not just those cited inline), request include: ["web_search_call.action.sources"]. ([platform.openai.com](https://platform.openai.com/docs/api-reference/responses/object))

Rendering requirements
- When you show any web-derived info to users, the inline citations must be clearly visible and clickable. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))

Related annotations you might see
- File citations from the File Search tool appear as type = "file_citation" in output_text.annotations (separate from web URL citations). ([platform.openai.com](https://platform.openai.com/docs/api-reference/responses/object))

Common options you’ll use
- Domain filtering: tools: [{ "type": "web_search", "filters": { "allowed_domains": ["example.com", "gov"] } }]. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
- Live internet toggle: tools: [{ "type": "web_search", "external_web_access": false }] to run in cache-only mode. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))
- User location: tools: [{ "type": "web_search", "user_location": { "type": "approximate", "country": "US", "city": "Austin", "region": "Texas" } }]. ([platform.openai.com](https://platform.openai.com/docs/guides/tools-web-search))

Want a minimal request/response sample (JS or curl) showing the annotations block and sources field? If you tell me your preferred language, I’ll paste a ready-to-run example.
