# Tool Spec 02 — Knowledge Graph & Practitioner Intelligence

> **Status:** Draft
> **Priority:** High — transforms flat name lists into a navigable knowledge network
> **Scope:** Curated practitioner registry, co-occurrence graph, rich cards,
>   relationship traversal
> **Dependencies:** Spec 01 (vector search) for semantic practitioner lookup
> **Affects:** `list_practitioners` tool, `PractitionerInteractor`, new
>   `get_practitioner` tool

---

## 1. Problem Statement

The current `list_practitioners` tool has fundamental quality issues:

- **Extraction is regex-based:** `/@([A-Z][a-z]+[A-Z][a-z]+)/g` only matches
  two-segment PascalCase names. "Don Norman" requires `@DonNorman` in the source.
  Three-word names (`@JeffreyZeldmanDesigner`) won't match. Single-word references
  won't match.
- **No metadata:** The tool returns "Name — appears in Book I, Book II" with zero
  context about who the person is, what they're known for, or why they matter.
- **No relationships:** Jakob Nielsen and Don Norman co-founded Nielsen Norman
  Group. Alan Cooper and Robert Reimann co-authored "About Face." These
  connections are invisible.
- **Flat output:** A markdown string of names — no structure for the LLM to
  reason about.
- **Name normalization bugs:** Lowercase grouping + re-capitalization produces
  incorrect names (e.g., "DieterRams" → "Dieterrams").

### Impact

The book series references ~100+ practitioners across design, engineering,
product management, and business. A knowledge graph makes the LLM a genuine
expert on "who said what" and "how ideas connect" — turning name-dropping into
rich contextual knowledge.

---

## 2. Target Architecture

### 2.1 Curated Practitioner Registry

Replace regex extraction with a **hand-curated YAML registry** that maps
practitioners to structured metadata. This is a one-time authoring effort that
produces dramatically better data quality.

```yaml
# data/practitioners.yaml
practitioners:
  - id: jakob-nielsen
    name: Jakob Nielsen
    aliases: ["Nielsen", "J. Nielsen"]
    field: UX Research
    era: 1990s–present
    bio: >
      Co-founder of Nielsen Norman Group. Pioneered discount usability
      engineering and the 10 usability heuristics. Author of "Designing
      Web Usability."
    keyContributions:
      - "10 Usability Heuristics"
      - "Discount Usability Engineering"
      - "F-Pattern Reading"
    relationships:
      - target: don-norman
        type: co-founded
        detail: "Nielsen Norman Group (1998)"
      - target: ben-shneiderman
        type: influenced-by
        detail: "Built on Shneiderman's 8 Golden Rules"
    wikipedia: "https://en.wikipedia.org/wiki/Jakob_Nielsen_(usability_consultant)"

  - id: don-norman
    name: Don Norman
    aliases: ["Norman", "Donald Norman", "D. Norman"]
    field: Cognitive Science / Design
    era: 1980s–present
    bio: >
      Author of "The Design of Everyday Things." Coined the term
      "user experience." Former VP of Apple's Advanced Technology Group.
    keyContributions:
      - "Affordances in Design"
      - "The Design of Everyday Things"
      - "Emotional Design"
      - "Coined 'User Experience'"
    relationships:
      - target: jakob-nielsen
        type: co-founded
        detail: "Nielsen Norman Group (1998)"
      - target: dieter-rams
        type: influenced-by
        detail: "Rams' functionalism influenced Norman's affordance theory"
```

### 2.2 Knowledge Graph Structure

```typescript
// src/core/knowledge-graph/types.ts

interface PractitionerNode {
  id: string;
  name: string;
  aliases: string[];
  field: string;
  era: string;
  bio: string;
  keyContributions: string[];
  mentions: PractitionerMention[];     // computed from content
  relationships: PractitionerEdge[];   // from YAML
  coOccurrences: CoOccurrence[];       // computed from content
}

interface PractitionerEdge {
  targetId: string;
  type: RelationshipType;
  detail: string;
}

type RelationshipType =
  | "co-founded"
  | "co-authored"
  | "influenced-by"
  | "influenced"
  | "mentored"
  | "collaborated"
  | "succeeded"
  | "competed-with";

interface PractitionerMention {
  bookSlug: string;
  bookTitle: string;
  chapterSlug: string;
  chapterTitle: string;
  context: string;        // ~200-char snippet around the mention
  count: number;          // times mentioned in this chapter
}

interface CoOccurrence {
  practitionerId: string;
  practitionerName: string;
  sharedChapters: number;
  sharedBooks: number;
  strength: number;       // normalized 0–1
}
```

### 2.3 Build-Time Processing

At build time (alongside the vector search index):

1. Load `data/practitioners.yaml`
2. Load all chapters
3. For each practitioner, scan all chapters for name/alias mentions
4. Compute mention counts, contexts, co-occurrences
5. Build the graph and write to `.data/knowledge-graph.json`

### 2.4 Co-Occurrence Algorithm

Two practitioners "co-occur" if they are both mentioned in the same chapter.
Co-occurrence strength is:

```text
strength(A, B) = shared_chapters(A, B) / min(total_chapters(A), total_chapters(B))
```

This normalizes for frequency — two practitioners mentioned in 3/4 of the same
chapters have a stronger connection than two mentioned in 3/20.

### 2.5 Graph Queries

The knowledge graph supports these query patterns:

| Query | Method | Example |
| --- | --- | --- |
| Get practitioner by name | Exact + alias + fuzzy match | "Nielsen" → Jakob Nielsen |
| Get practitioner relationships | Direct edges from YAML | Nielsen → co-founded NNG with Norman |
| Get co-occurring practitioners | Computed from content | Nielsen often appears with Norman, Shneiderman |
| Get practitioners by field | Filter by `field` | All UX Research practitioners |
| Get practitioners by book | Filter by mentions | All practitioners in Book VI (Accessibility) |
| Shortest path between two | BFS on relationship edges | How are A and B connected? |

---

## 3. New & Modified Tools

### 3.1 New Tool: `get_practitioner`

A dedicated tool for deep practitioner lookup. Replaces the shallow
`list_practitioners` for individual queries.

```typescript
// Schema
{
  name: "get_practitioner",
  description: "Get detailed information about a practitioner, author, or thought leader referenced in the books. Returns biography, key contributions, relationships, and all chapter mentions.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Practitioner name (full or partial)" },
    },
    required: ["name"],
  },
  roles: "ALL",  // everyone can look up who someone is
  category: "content",
}
```

**Returns for ANONYMOUS:** Name, field, era, bio, key contributions, book list
(no chapter slugs, no deep links).

**Returns for AUTHENTICATED+:** Full data including chapter mentions with slugs,
relationships, co-occurrences.

### 3.2 Modified Tool: `list_practitioners`

Upgraded to support richer queries:

```typescript
// Enhanced schema
{
  name: "list_practitioners",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search by name, field, or contribution" },
      book_slug: { type: "string", description: "Filter to a specific book" },
      field: { type: "string", description: "Filter by field (e.g., 'UX Research', 'Visual Design')" },
      related_to: { type: "string", description: "Find practitioners related to this person" },
    },
  },
  roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
  category: "content",
}
```

### 3.3 New Tool: `explore_connections` (STAFF+)

For advanced knowledge graph traversal:

```typescript
{
  name: "explore_connections",
  description: "Explore relationships between practitioners. Find how two people are connected, who influenced whom, or map the intellectual lineage of an idea.",
  input_schema: {
    type: "object",
    properties: {
      from: { type: "string", description: "Starting practitioner name" },
      to: { type: "string", description: "Target practitioner name (optional — omit to see all connections)" },
      depth: { type: "number", description: "How many hops to traverse (1-3, default 1)" },
    },
    required: ["from"],
  },
  roles: ["STAFF", "ADMIN"],
  category: "content",
}
```

---

## 4. File Plan

### New Files

| File | Layer | Purpose |
| --- | --- | --- |
| `data/practitioners.yaml` | Data | Curated practitioner registry |
| `src/core/knowledge-graph/types.ts` | Core | Graph node/edge types |
| `src/core/knowledge-graph/KnowledgeGraph.ts` | Core | In-memory graph: lookup, traverse, co-occurrence queries |
| `src/core/knowledge-graph/FuzzyNameMatcher.ts` | Core | Levenshtein + alias matching for practitioner lookup |
| `src/adapters/KnowledgeGraphRepository.ts` | Adapter | Loads `.data/knowledge-graph.json` |
| `src/core/use-cases/tools/get-practitioner.tool.ts` | Core | Descriptor for new tool |
| `src/core/use-cases/tools/explore-connections.tool.ts` | Core | Descriptor for new tool |
| `scripts/build-knowledge-graph.ts` | Script | Build-time graph construction |

### Modified Files

| File | Change |
| --- | --- |
| `src/core/use-cases/PractitionerInteractor.ts` | Delegate to `KnowledgeGraph` instead of regex scanning |
| `src/core/use-cases/tools/list-practitioners.tool.ts` | Enhanced schema with new filter parameters |
| `src/lib/chat/tool-composition-root.ts` | Register new tools, wire graph repository |
| `src/core/tool-registry/ToolResultFormatter.ts` | Add ANONYMOUS formatting rules for practitioner data |

---

## 5. Requirement IDs

### Functional

| ID | Requirement |
| --- | --- |
| KGRAPH-1 | Practitioner lookup by full name returns structured card (bio, field, contributions) |
| KGRAPH-2 | Practitioner lookup by alias returns correct match ("Nielsen" → Jakob Nielsen) |
| KGRAPH-3 | Fuzzy matching handles typos within edit distance 2 |
| KGRAPH-4 | Relationship traversal returns typed edges (co-founded, influenced-by, etc.) |
| KGRAPH-5 | Co-occurrence data identifies practitioners who appear in the same chapters |
| KGRAPH-6 | `explore_connections` finds shortest path between two practitioners |
| KGRAPH-7 | ANONYMOUS gets bio + contributions but not chapter slugs or deep links |
| KGRAPH-8 | `list_practitioners` accepts `field`, `book_slug`, and `related_to` filters |
| KGRAPH-9 | All practitioner mentions include chapter context (excerpt around the mention) |
| KGRAPH-10 | Build script generates knowledge graph from YAML + content scan |

### Data Quality

| ID | Requirement |
| --- | --- |
| KGRAPH-DATA-1 | Registry covers ≥80% of practitioners mentioned across all 104 chapters |
| KGRAPH-DATA-2 | Each entry has name, field, era, bio (≥50 words), and ≥1 key contribution |
| KGRAPH-DATA-3 | Relationship types are bidirectional-consistent (if A influenced B, B has influenced-by A) |
| KGRAPH-DATA-4 | Aliases cover common short forms and name variants |

---

## 6. Test Scenarios

```text
TEST-KG-01: get_practitioner("Jakob Nielsen") → full card with bio, contributions, mentions
TEST-KG-02: get_practitioner("Nielsen") → resolves alias to Jakob Nielsen
TEST-KG-03: get_practitioner("Nielson") → fuzzy match to Jakob Nielsen (edit distance 1)
TEST-KG-04: list_practitioners({field: "UX Research"}) → Nielsen, Norman, etc.
TEST-KG-05: list_practitioners({related_to: "Don Norman"}) → Nielsen, Rams, etc.
TEST-KG-06: explore_connections({from: "Nielsen", to: "Norman"}) → co-founded NNG
TEST-KG-07: explore_connections({from: "Nielsen", depth: 2}) → all within 2 hops
TEST-KG-08: Co-occurrence: Nielsen and Norman have sharedChapters > 0
TEST-KG-09: ANONYMOUS get_practitioner → no chapterSlug in response
TEST-KG-10: Build script processes YAML + chapters → valid graph JSON
TEST-KG-11: FuzzyNameMatcher with edit distance 0 (exact) is fastest path
TEST-KG-12: Graph with no path between two nodes → returns empty path, not error
```

---

## 7. Practitioner Registry Bootstrap

The initial YAML registry will be bootstrapped by:

1. Extracting all `@PascalCase` mentions from the 104 chapters (existing regex)
2. Deduplicating and normalizing names
3. Enriching each entry with field, era, bio, and contributions
4. Adding known relationships from the book content
5. Manual QA pass for accuracy

Estimated effort: ~100 practitioners × ~5 minutes each = ~8 hours of curation.
This is a one-time investment that produces a reusable knowledge base.

---

## 8. Open Questions

1. **Should `get_practitioner` be available to ANONYMOUS?** The bio and
   contributions are educational — there's an argument for public access with
   reduced detail (no deep links).
2. **Should co-occurrence be weighted by mention count?** Two practitioners
   mentioned 10 times each in the same chapter have a stronger signal than
   two mentioned once each.
3. **Should we embed practitioner bios for vector search?** "Who talks about
   affordances?" could match Don Norman's bio even if the query doesn't
   mention his name.
4. **External links:** Should the YAML include Wikipedia/personal site URLs?
   The LLM could cite them. Privacy and link rot are concerns.
