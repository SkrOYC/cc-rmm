# Tasks.md — Claude Code RMM Memory Plugin

## 1. Executive Summary

| Metric                     | Value      |
| -------------------------- | ---------- |
| **Total Story Points**     | 40         |
| **Critical Path Length**   | 16 tickets |
| **MVP Estimated Duration** | 3-4 weeks  |

### Critical Path Sequence

```
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008
   → T-009 → T-010 → T-011 → T-012 → T-013 → T-014 → T-015 → T-016
```

---

## 2. Project Phasing

### Phase 1: MVP (Story Points: 30)

- **Goal:** Working end-to-end memory system
- **Outcome:** Memories persist across sessions, retrieval works

### Phase 2: Post-MVP (Story Points: 10)

- **Goal:** Adaptive learning and polish
- **Outcome:** Reranker improves over time, `/rmm:*` slash commands

---

## 3. Build Order

```mermaid
flowchart LR
    subgraph INFRA[Epic 1: Infrastructure]
        T001[T-001 Setup]
        T002[T-002 Hooks]
        T003[T-003 Plugin Manifest]
        T004[T-004 Storage Interface]
    end

    subgraph PERSIST[Epic 2: Persistence]
        T005[T-005 Storage]
    end

    subgraph EMBED[Epic 3: Embeddings]
        T006[T-006 Embedding Service]
        T007[T-007 Similarity Search]
    end

    subgraph CORE[Epic 4: Core Algorithms]
        T008[T-008 Matrix Utils]
        T009[T-009 Memory Types]
        T010[T-010 Reranking]
        T011[T-011 Extraction and Update]
        T012[T-012 Turn Ref Tracking]
    end

    subgraph INTEGRATE[Epic 5: Integration]
        T013[T-013 Claude CLI]
        T014[T-014 Hook Handlers]
    end

    subgraph LEARN[Epic 6: Learning]
        T015[T-015 Citation Extraction]
        T016[T-016 REINFORCE Weight Updates]
    end

    T001 --> T002 --> T003 --> T004 --> T005 --> T006 --> T007
    T007 --> T008 --> T009 --> T010 --> T011 --> T012 --> T013 --> T014
    T014 --> T015 --> T016
```

---

## 4. Ticket List

---

## Epic 1: Infrastructure Foundation

> **[T-001] Initialize Project Structure**
>
> - **Type:** Chore
> - **Effort:** 2
> - **Dependencies:** None
> - **Description:** Set up the project directory structure, configuration files, Bun build scripts, and linting setup.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a clean directory
> When I run "bun install"
> And I run "bun run build"
> And I run "bun x ultracite check"
> Then dependencies install without errors
> And executable scripts are produced
> And linting passes
> ```
>
> - **Tests:**
>   - `package.json`: valid JSON, all dependencies resolve, and `build`/`check`/`test` scripts exist
>   - `biome.jsonc`: configuration is valid for Ultracite/Biome
>   - `bun run build`: produces executable scripts for the plugin entrypoints

> **[T-002] Configure Claude Code Hooks**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-001
> - **Description:** Create `hooks/hooks.json` with `UserPromptSubmit`, `SessionStart`, `SessionEnd`, and `PreCompact` configured as command hooks.
> - **Reference:** Claude Code documents `UserPromptSubmit` and `SessionStart` as context-injection surfaces, with `SessionStart` matcher `compact` used for post-compaction reinjection. `PreCompact` and `SessionEnd` are command-only side-effect hooks. See [Hooks reference](https://code.claude.com/docs/en/hooks.md) and [Hooks guide](https://code.claude.com/docs/en/hooks-guide.md).
> - **Acceptance Criteria:**
>
> ```gherkin
> Given hooks.json configuration
> When Claude Code loads the plugin hooks
> Then UserPromptSubmit, SessionStart, SessionEnd, and PreCompact hooks are registered
> And SessionStart includes a compact matcher for post-compaction reinjection
> And PreCompact supports both manual and auto matchers
> And the configured commands point to the correct executables
> And the associated handlers consume the stdin contract defined in the TechSpec
> ```
>
> - **Tests:**
>   - `hooks/hooks.json`: valid JSON, all hook types present
>   - `hooks/hooks.json`: SessionStart includes the `compact` matcher
>   - `hooks/hooks.json`: PreCompact includes both `manual` and `auto` matchers
>   - Hook commands point to correct executables
>   - Hook fixture coverage includes `cwd` and `session_id` for all hooks, `source` for SessionStart, `reason` for SessionEnd, and `trigger` / `custom_instructions` for PreCompact

> **[T-003] Create Plugin Manifest**
>
> - **Type:** Chore
> - **Effort:** 1
> - **Dependencies:** T-001
> - **Description:** Create `.claude-plugin/plugin.json` with proper metadata, including the plugin name that defines the `/rmm:*` skill namespace.
> - **Reference:** Claude Code plugin skills use the `plugin-name:skill-name` namespace, and plugin components live at the plugin root with `plugin.json` inside `.claude-plugin/`. See [Skills](https://code.claude.com/docs/en/skills.md), [Plugins](https://code.claude.com/docs/en/plugins.md), and [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md).
> - **Acceptance Criteria:**
>
> ```gherkin
> Given the plugin directory structure
> When Claude Code loads the plugin
> Then plugin.json is valid and recognized
> And the plugin namespace is `rmm`
> ```
>
> - **Tests:**
>   - `.claude-plugin/plugin.json`: valid JSON, correct schema, points to `hooks/hooks.json`
>   - `.claude-plugin/plugin.json`: `name` is `rmm`, enabling `/rmm:*` plugin skill namespacing

> **[T-004] Implement Storage Interface**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-003
> - **Description:** Define the final TypeScript interfaces for project-scoped memory, weights, citations, and similarity search operations.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given the IStorage interface
> When I implement the interface
> Then all memory, weights, citation, and similarity-search methods are typed explicitly
> And project scoping is part of the contract for all persistence and retrieval operations
> And merge semantics define how updated summaries and referenced turns are persisted
> And helper result types used by the storage layer are documented and used consistently
> ```
>
> - **Tests:**
>   - `src/storage/__tests__/interfaces.test.ts`
>   - Interface contract tests cover memory retrieval, scored similarity search, merge/update semantics, weight persistence, and citation persistence

---

## Epic 2: Persistence Layer

> **[T-005] Implement Storage Layer**
>
> - **Type:** Feature
> - **Effort:** 3
> - **Dependencies:** T-004
> - **Description:** Implement database storage with schema migrations.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a new project directory
> When I initialize the database
> Then memories, weights, and citations tables are created
> And running initialization multiple times is safe
> When I save a memory
> Then it persists to the database
> When I query memories by project
> Then results are returned correctly
> And memories from another project are not returned
> ```
>
> - **Tests:**
>   - `src/storage/__tests__/sqlite.test.ts`
>   - `initDatabase`: creates all tables per TechSpec schema
>   - `initDatabase`: is idempotent across repeated initialization
>   - `saveMemory` / `getMemories`: round-trip persistence
>   - `getMemories`: enforces project isolation
>   - `saveWeights` / `getWeights`: W_q, W_m matrix persistence (768×768)
>   - `saveCitation` / `getCitations`: citation record persistence
>   - `mergeMemory`: persists updated summary and the merged turn reference set

---

## Epic 3: Embeddings

> **[T-006] Implement Embedding Service**
>
> - **Type:** Spike
> - **Effort:** 3
> - **Dependencies:** T-005
> - **Description:** Integrate local embedding model for semantic search.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given embedding library installed
> When I call embedDocument("hello world")
> Then I receive a 768-dimensional number array
> And the embedding is normalized
> ```
>
> - **Tests:**
>   - `src/embeddings/__tests__/nomic.test.ts`
>   - `embedQuery`: returns 768-dim vector (constitutional requirement)
>   - `embedDocument`: returns 768-dim vector
>   - Output is normalized (L2 norm = 1)

> **[T-007] Implement Similarity Search**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-006
> - **Description:** Implement cosine similarity search over stored embeddings.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given memories with embeddings in database
> When I search similar to a query embedding
> Then memories are ranked by cosine similarity
> And top-K results are returned
> ```
>
> - **Tests:**
>   - `src/embeddings/__tests__/similarity.test.ts`
>   - `cosineSimilarity`: correct computation
>   - `searchSimilar`: returns top-K by similarity
>   - `searchSimilar`: handles empty database

---

## Epic 4: Core Algorithms

> **[T-008] Adapt Matrix Utilities**
>
> - **Type:** Chore
> - **Effort:** 1
> - **Dependencies:** T-007
> - **Description:** Copy and verify matrix utilities from rmm-middleware (dimensions already agnostic).
> - **Acceptance Criteria:**
>
> ```gherkin
> Given matrix utility functions
> When I perform matmulVector on 768x768 matrix and vector
> Then result is computed correctly
> And residualAdd produces expected output
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/matrix.test.ts`
>   - `matmulVector`: 768×768 matrix × 768-vector = 768-vector (verify against numpy)
>   - `residualAdd`: (I + λW)·v computation verification
>   - `transpose`, `add`, `scale` operations on 768×768 matrices

> **[T-009] Define 768-Dim Memory Types**
>
> - **Type:** Chore
> - **Effort:** 1
> - **Dependencies:** T-008
> - **Description:** Create TypeScript types for MemoryEntry, RerankerState with 768-dim embeddings.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given the type definitions
> When I create a MemoryEntry
> Then embedding must be exactly 768 numbers
> And RerankerState requires 768x768 matrices
> ```
>
> - **Tests:**
>   - `src/core/types/__tests__/memory.test.ts`
>   - Type guard tests: `isMemoryEntry()`, `isRerankerState()`
>   - Validation: 768-dim embedding constraint enforcement
>   - Serialization round-trip: JSON → MemoryEntry → JSON

> **[T-010] Adapt Reranking Algorithm**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-009
> - **Description:** Copy reranking.ts from rmm-middleware, update to 768-dim.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given query and memory embeddings (768-dim)
> When I apply embedding adaptation (Equation 1)
> Then q' = q + W_q·q produces 768-dim output
> When I run gumbelSoftmaxSample
> Then Top-M memories are selected with probabilities
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/reranking.test.ts`
>   - `adaptEmbedding`: q' = q + W_q·q produces 768-dim (verify dimension)
>   - `gumbelSoftmaxSample`: Top-M selection with probability distribution
>   - `computeScore`: q'·m' scoring (constitutional requirement)

> **[T-011] Adapt Memory Extraction & Update**
>
> - **Type:** Feature
> - **Effort:** 3
> - **Dependencies:** T-010
> - **Description:** Copy memory-extraction.ts, adapt it for transcript file input, and adapt memory-update.ts so add/merge decisions can be made from model responses against existing memories.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a transcript JSONL file
> When I call extractMemories
> Then it parses the transcript format
> And returns MemoryEntry[] with embeddings
> And each extracted memory includes turn references from the transcript
> ```
>
> ```gherkin
> Given a newly extracted memory and existing similar memories
> When I call decideUpdateAction
> Then it returns an Add or Merge action per memory
> And Merge actions include the ID of the memory to merge into
> And Merge actions include a merged summary suitable for persistence
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/extraction.test.ts`
>   - Parse valid JSONL transcript with turn boundaries
>   - Extract memories from transcript (mock LLM response)
>   - MemoryEntry includes: summary, turnReferences, embedding
>   - `src/core/algorithms/__tests__/memory-update.test.ts`
>   - `decideUpdateAction`: returns Add for dissimilar memories
>   - `decideUpdateAction`: returns Merge for similar memories with merged summary
>   - `decideUpdateAction`: maps merge decisions back to an existing memory ID deterministically

> **[T-012] Implement Turn Reference Tracking**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-011
> - **Description:** Implement deduplication by tracking which conversation turns have been considered. Query existing memories for turn references before extraction.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given existing memories with turn references
> When I call getReferencedTurnIds
> Then it returns all turn IDs from existing memories
> Given referenced turn IDs
> When I call extractMemories with excluded turns
> Then extraction prompt includes "skip turns: [turn_ids]"
> And new memories only reference unconsidered turns
> When a new memory is merged into an existing memory
> Then the stored memory retains the union of prior and newly referenced turns
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/turn-tracking.test.ts`
>   - `getReferencedTurnIds`: aggregates all turn IDs from project memories
>   - `filterExtractedMemories`: removes memories referencing already-seen turns
>   - `buildExcludedTurnsPrompt`: generates correct prompt exclusion text
>   - Merge-path coverage confirms deduplication still works after existing memories are updated

---

## Epic 5: Integration

> **[T-013] Implement Claude CLI Adapter**
>
> - **Type:** Spike
> - **Effort:** 3
> - **Dependencies:** T-012
> - **Description:** Implement a reusable wrapper for `claude -p --output-format json --json-schema` with schema validation for extraction and memory-update prompts. Must support excluded turn IDs for deduplication.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a prompt and JSON schema
> When I call the Claude CLI adapter
> Then Claude CLI is invoked with that prompt and schema
> And JSON output is parsed correctly
> And malformed JSON responses surface a controlled error
> Given a transcript path
> When I call claudeExtractMemories
> Then extracted memories are returned
> Given excluded turn IDs
> When I call claudeExtractMemories
> Then extraction prompt includes turn exclusion
> And new memories reference only unconsidered turns
> Given a memory-update prompt
> When I reuse the adapter for merge/add decisions
> Then the prompt is forwarded unchanged so the caller can distinguish Add vs Merge
> ```
>
> - **Tests:**
>   - `src/adapters/__tests__/claude-cli.test.ts`
>   - low-level Claude CLI call forwards prompt and schema correctly
>   - `extractMemories`: parses valid JSON response
>   - `extractMemories`: handles malformed JSON gracefully
>   - `buildPrompt`: includes excluded turn IDs in prompt (constitutional requirement)
>   - update-prompt coverage confirms the adapter is reusable outside transcript extraction

> **[T-014] Implement Hook Handlers**
>
> - **Type:** Feature
> - **Effort:** 3
> - **Dependencies:** T-013
> - **Description:** Connect hooks to the full memory pipeline: `UserPromptSubmit` injects project-scoped memories before prompts, `PreCompact` extracts and persists memories before compaction, `SessionStart` with `source=compact` re-injects memory context after compaction, and `SessionEnd` performs final extraction and persistence.
> - **Reference:** This ticket follows the documented Claude Code hook model where `UserPromptSubmit` and `SessionStart` add context, and `PreCompact` / `SessionEnd` are side-effect hooks. See [Hooks reference](https://code.claude.com/docs/en/hooks.md) and [Hooks guide](https://code.claude.com/docs/en/hooks-guide.md).
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a UserPromptSubmit event with `cwd` and `prompt`
> When hook executes
> Then memories are loaded from the project identified by `cwd`
> And they are injected via additionalContext using the TechSpec memory format
> Given a SessionEnd event with `cwd` and `transcript_path`
> When hook executes
> Then memories are extracted for the project identified by `cwd`
> And they are stored in that project's memory bank
> Given a PreCompact event with `cwd` and `transcript_path`
> When hook executes
> Then the full transcript is re-extracted
> And already-referenced turns are deduplicated
> And new memories are stored
> And the hook exits without relying on additionalContext
> Given a SessionStart event with `source=compact`
> When hook executes
> Then memories are loaded from the project identified by `cwd`
> And relevant memories are re-injected into context via additionalContext
> ```
>
> - **Tests:**
>   - `src/hooks/__tests__/user-prompt-submit.test.ts`: executes the handler with stdin fixtures and verifies the exact stdout payload for `additionalContext`
>   - `src/hooks/__tests__/session-start.test.ts`: executes the handler with `source=compact` fixtures and verifies the exact stdout payload for `additionalContext`
>   - `src/hooks/__tests__/session-end.test.ts`: executes the handler with stdin fixtures and verifies extraction persists into the project identified by `cwd`
>   - `src/hooks/__tests__/pre-compact.test.ts`: executes the handler with stdin fixtures, verifies extraction + deduplication + persistence, and confirms PreCompact works for both `manual` and `auto`

---

## Epic 6: Learning

> **[T-015] Implement Citation Extraction**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-014
> - **Description:** Parse LLM responses for [i,j,k] citation format per paper and map cited indices back to the retrieved memory IDs from the current turn/session.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given an LLM response with citations and the retrieved memory list for that turn
> When I parse for [i,j,k] pattern
> Then citations are extracted and stored
> And each cited index is mapped to a persisted memory ID
> And useful flag is set based on citation presence
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/citations.test.ts`
>   - `parseCitations`: extracts [i,j,k] from response text
>   - `parseCitations`: handles no citations (useful: false)
>   - `parseCitations`: handles multiple citations per response
>   - Citation mapping: resolves retrieval indices to stored memory IDs correctly

> **[T-016] Implement REINFORCE Weight Updates**
>
> - **Type:** Feature
> - **Effort:** 3
> - **Dependencies:** T-015
> - **Description:** Implement gradient computation and weight updates using citations as rewards.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given citation rewards and embeddings
> When I compute REINFORCE gradient
> Then W_q and W_m matrices are updated
> And weights are persisted to database
> And subsequent retrieval loads and uses the updated weights
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/reinforce.test.ts`
>   - `computeGradient`: gradient computation from rewards (Equation 4)
>   - `updateWeights`: W_q, W_m matrix updates with learning rate
>   - `persistWeights`: round-trip to database
>   - Retrieval integration: reranking loads the updated weights after persistence

---

## Epic 7: Polish

> **[T-017] Error Handling & Logging**
>
> - **Type:** Chore
> - **Effort:** 2
> - **Dependencies:** T-016
> - **Description:** Add comprehensive error handling and structured logging.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given any error in the pipeline
> When error occurs
> Then it's logged with context
> And hook exits cleanly (not blocking Claude)
> ```
>
> - **Tests:**
>   - `src/__tests__/errors.test.ts`
>   - All errors include session_id context
>   - Hook exits with correct codes for the chosen failure policy and does not block Claude on recoverable errors

> **[T-018] Slash Commands**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-017
> - **Description:** Implement plugin skills that expose `/rmm:list`, `/rmm:clear`, and `/rmm:search` for project-scoped memory operations inside Claude Code. These slash commands are the main user-facing interaction surface for memory management; any CLI remains an internal implementation detail only. The built-in Claude Code `/memory` command remains reserved for Claude Code's own memory system and must not be overloaded by this plugin.
> - **Reference:** Claude Code plugin slash commands are implemented as skills in `skills/`, and plugin skills are namespaced as `plugin-name:skill-name`. See [Skills](https://code.claude.com/docs/en/skills.md), [Plugins](https://code.claude.com/docs/en/plugins.md), [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md), [Interactive mode](https://code.claude.com/docs/en/interactive-mode.md), and [Memory](https://code.claude.com/docs/en/memory.md).
> - **Acceptance Criteria:**
>
> ```gherkin
> Given the plugin is active for a project
> And the plugin manifest namespace is `rmm`
> When I run "/rmm:list"
> Then memories for the current project are listed
> When I run "/rmm:clear"
> Then memories for the current project are deleted
> When I run "/rmm:search auth"
> Then relevant memories for the current project are returned
> ```
>
> - **Tests:**
>   - `skills/list/SKILL.md`, `skills/clear/SKILL.md`, and `skills/search/SKILL.md` exist at the plugin root
>   - Plugin configuration exposes the `rmm` namespace used by the commands
>   - `/rmm:clear` removes memories only from the active project
>   - `/rmm:search` returns project-scoped results ordered by relevance

> **[T-019] Documentation**
>
> - **Type:** Chore
> - **Effort:** 1
> - **Dependencies:** T-018
> - **Description:** Write README.md with installation and usage instructions.
> - **Reference:** The README must explain the documented Claude Code interaction model: hooks for automation, plugin skills for `/rmm:*`, built-in `/memory` kept separate, and compaction recovery via `SessionStart` with `compact`. See [Hooks reference](https://code.claude.com/docs/en/hooks.md), [Hooks guide](https://code.claude.com/docs/en/hooks-guide.md), [Skills](https://code.claude.com/docs/en/skills.md), [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md), [Interactive mode](https://code.claude.com/docs/en/interactive-mode.md), and [Memory](https://code.claude.com/docs/en/memory.md).
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a new user
> When they read README.md
> Then they can install and configure the plugin
> And they understand the hook setup, first-run embedding model download, and how extraction/retrieval/deduplication work
> And they understand that `/rmm:*` is provided via plugin skills, while Claude Code's built-in `/memory` remains separate
> And they understand that post-compaction reinjection happens via `SessionStart` with `source=compact`
> ```

---

## 5. Spike Notes

### Spike T-006: Local Embeddings in Bun

- **Risk:** ONNX runtime may have compatibility issues with Bun
- **Mitigation:** Test early, fallback to API-based embeddings if needed
- **Time Box:** 1 day

### Spike T-012: Claude CLI Extraction

- **Risk:** JSON schema validation may not work as expected
- **Mitigation:** Test with sample transcripts first
- **Time Box:** 1 day

---

## 6. External Claude Code References

- [Hooks reference](https://code.claude.com/docs/en/hooks.md)
- [Hooks guide](https://code.claude.com/docs/en/hooks-guide.md)
- [Skills](https://code.claude.com/docs/en/skills.md)
- [Plugins](https://code.claude.com/docs/en/plugins.md)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md)
- [Interactive mode](https://code.claude.com/docs/en/interactive-mode.md)
- [Memory](https://code.claude.com/docs/en/memory.md)

---

_Tasks Version: 1.0_
_Based on: TechSpec.md v1.0_
