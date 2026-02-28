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

### Phase 1: MVP (Story Points: 21)

- **Goal:** Working end-to-end memory system
- **Outcome:** Memories persist across sessions, retrieval works

### Phase 2: Post-MVP (Story Points: 13)

- **Goal:** Adaptive learning and polish
- **Outcome:** Reranker improves over time, CLI commands

---

## 3. Build Order

```mermaid
flowchart LR
    subgraph INFRA[Epic 1: Infrastructure]
        T001[T-001 Setup]
        T002[T-002 Hooks]
        T003[T-003 DB Schema]
        T004[T-004 Storage Interface]
    end

    subgraph PERSIST[Epic 2: Persistence]
        T005[T-005 Storage]
    end

    subgraph EMBED[Epic 3: Embeddings]
        T006[T-006 Embedding Service]
    end

    subgraph CORE[Epic 4: Core Algorithms]
        T007[T-007 Matrix Utils]
        T008[T-008 Memory Types]
        T009[T-009 Reranking]
        T010[T-010 Extraction]
        T011[T-011 Adapt Memory Extraction]
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
> - **Description:** Set up the project directory structure, configuration files, and linter setup.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a clean directory
> When I run the build command
> Then dependencies install without errors
> And executable scripts are produced
> And linting passes
> ```
>
> - **Tests:**
>   - `package.json`: valid JSON, all dependencies resolve
>   - `biome.jsonc`: passes ultracite doctor
>   - Build produces executable scripts

> **[T-002] Configure Claude Code Hooks**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-001
> - **Description:** Create hooks.json with UserPromptSubmit, SessionEnd, and PreCompact hooks configured.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given hooks.json configuration
> When I start a Claude Code session
> Then UserPromptSubmit hook executes the configured command
> When I end a Claude Code session
> Then SessionEnd hook executes the configured command
> When context compaction occurs
> Then PreCompact hook executes the configured command
> ```
>
> - **Tests:**
>   - `hooks/hooks.json`: valid JSON, all hook types present
>   - Hook commands point to correct executables
>   - PreCompact hook includes `transcript_path` (constitutional requirement)

> **[T-003] Create Plugin Manifest**
>
> - **Type:** Chore
> - **Effort:** 1
> - **Dependencies:** T-001
> - **Description:** Create .claude-plugin/plugin.json with proper metadata.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given the plugin directory structure
> When Claude Code loads the plugin
> Then plugin.json is valid and recognized
> ```
>
> - **Tests:**
>   - `.claude-plugin/plugin.json`: valid JSON, correct schema

> **[T-004] Implement Storage Interface**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-003
> - **Description:** Define TypeScript interfaces for storage operations (IStorage).
> - **Acceptance Criteria:**
>
> ```gherkin
> Given the IStorage interface
> When I implement the interface
> Then all methods are typed correctly
> And the interface matches the TechSpec contracts
> ```
>
> - **Tests:**
>   - `src/storage/__tests__/interfaces.test.ts`
>   - Interface contract tests (mock implementation)

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
> When I save a memory
> Then it persists to the database
> When I query memories by project
> Then results are returned correctly
> ```
>
> - **Tests:**
>   - `src/storage/__tests__/sqlite.test.ts`
>   - `initDatabase`: creates all tables per TechSpec schema
>   - `saveMemory` / `getMemories`: round-trip persistence
>   - `saveWeights` / `getWeights`: W_q, W_m matrix persistence (768×768)
>   - `saveCitation` / `getCitations`: citation record persistence

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
> - **Description:** Copy memory-extraction.ts, adapt to work with transcript file input instead of LangChain messages. Also adapt memory-update.ts for add/merge decision logic.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a transcript JSONL file
> When I call extractMemories
> Then it parses the transcript format
> And returns MemoryEntry[] with embeddings
> ```
>
> ```gherkin
> Given a newly extracted memory and existing similar memories
> When I call decideUpdateAction
> Then it returns an Add or Merge action per memory
> And Merge actions include the ID of the memory to merge into
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
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/turn-tracking.test.ts`
>   - `getReferencedTurnIds`: aggregates all turn IDs from project memories
>   - `filterExtractedMemories`: removes memories referencing already-seen turns
>   - `buildExcludedTurnsPrompt`: generates correct prompt exclusion text

---

## Epic 5: Integration

> **[T-013] Implement Claude CLI Adapter**
>
> - **Type:** Spike
> - **Effort:** 3
> - **Dependencies:** T-012
> - **Description:** Implement wrapper for `claude -p --output-format json` with schema validation. Must support excluded turn IDs for deduplication.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a transcript path
> When I call claudeExtractMemories
> Then Claude CLI is invoked with extraction prompt
> And JSON output is parsed correctly
> And extracted memories are returned
> Given excluded turn IDs
> When I call claudeExtractMemories
> Then extraction prompt includes turn exclusion
> And new memories reference only unconsidered turns
> ```
>
> - **Tests:**
>   - `src/adapters/__tests__/claude-cli.test.ts`
>   - `extractMemories`: parses valid JSON response
>   - `extractMemories`: handles malformed JSON gracefully
>   - `buildPrompt`: includes excluded turn IDs in prompt (constitutional requirement)

> **[T-014] Implement Hook Handlers**
>
> - **Type:** Feature
> - **Effort:** 3
> - **Dependencies:** T-013
> - **Description:** Connect hooks to the memory pipeline: UserPromptSubmit loads, SessionEnd extracts, PreCompact extracts + re-injects.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a UserPromptSubmit event
> When hook executes
> Then memories are loaded and injected via additionalContext
> Given a SessionEnd event
> When hook executes
> Then memories are extracted and stored
> Given a PreCompact event
> When hook executes
> Then memories are re-injected into context
> ```
>
> - **Tests:**
>   - `hooks/__tests__/user-prompt-submit.test.ts`: loads memories, formats additionalContext before each prompt
>   - `hooks/__tests__/stop.test.ts`: extracts and stores memories
>   - `hooks/__tests__/pre-compact.test.ts`: extracts new + re-injects (dual-phase constitutional requirement)

---

## Epic 6: Learning

> **[T-015] Implement Citation Extraction**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-014
> - **Description:** Parse LLM responses for [i,j,k] citation format per paper.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given an LLM response with citations
> When I parse for [i,j,k] pattern
> Then citations are extracted and stored
> And useful flag is set based on citation presence
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/citations.test.ts`
>   - `parseCitations`: extracts [i,j,k] from response text
>   - `parseCitations`: handles no citations (useful: false)
>   - `parseCitations`: handles multiple citations per response

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
> ```
>
> - **Tests:**
>   - `src/core/algorithms/__tests__/reinforce.test.ts`
>   - `computeGradient`: gradient computation from rewards (Equation 4)
>   - `updateWeights`: W_q, W_m matrix updates with learning rate
>   - `persistWeights`: round-trip to database

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
>   - Hook exits with correct codes: 0=success, 1=error, 2=block

> **[T-018] CLI Commands**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-017
> - **Description:** Implement /memory list, /memory clear, /memory search commands.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given the CLI tool
> When I run "cc-rmm list --project /path"
> Then memories are listed
> When I run "cc-rmm clear --project /path"
> Then memories are deleted
> When I run "cc-rmm search --project /path 'query'"
> Then relevant memories are returned
> ```

> **[T-019] Documentation**
>
> - **Type:** Chore
> - **Effort:** 1
> - **Dependencies:** T-018
> - **Description:** Write README.md with installation and usage instructions.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a new user
> When they read README.md
> Then they can install and configure the plugin
> And they understand how memory works
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

_Tasks Version: 1.0_
_Based on: TechSpec.md v1.0_
