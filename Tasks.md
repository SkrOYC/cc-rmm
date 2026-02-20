# Tasks.md — Claude Code RMM Memory Plugin

## 1. Executive Summary

| Metric                     | Value      |
| -------------------------- | ---------- |
| **Total Story Points**     | 34         |
| **Critical Path Length**   | 15 tickets |
| **MVP Estimated Duration** | 3-4 weeks  |

### Critical Path Sequence

```
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008
   → T-009 → T-010 → T-011 → T-012 → T-013 → T-014 → T-015
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
        T011[T-011 Memory Update]
    end

    subgraph INTEGRATE[Epic 5: Integration]
        T012[T-012 Claude CLI]
        T013[T-013 Hook Handlers]
    end

    subgraph LEARN[Epic 6: Learning]
        T014[T-014 Citations]
        T015[T-015 Weight Updates]
    end

    T001 --> T002 --> T003 --> T004 --> T005 --> T006 --> T007
    T007 --> T008 --> T009 --> T010 --> T011 --> T012 --> T013
    T013 --> T014 --> T015
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

> **[T-002] Configure Claude Code Hooks**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-001
> - **Description:** Create hooks.json with SessionStart, Stop, and PreCompact hooks configured.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given hooks.json configuration
> When I start a Claude Code session
> Then SessionStart hook executes the configured command
> When I end a Claude Code session
> Then Stop hook executes the configured command
> When context compaction occurs
> Then PreCompact hook executes the configured command
> ```

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

> **[T-011] Adapt Memory Extraction**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-010
> - **Description:** Copy memory-extraction.ts, adapt to work with transcript file input instead of LangChain messages.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a transcript JSONL file
> When I call extractMemories
> Then it parses the transcript format
> And returns MemoryEntry[] with embeddings
> ```

---

## Epic 5: Integration

> **[T-012] Implement Claude CLI Adapter**
>
> - **Type:** Spike
> - **Effort:** 3
> - **Dependencies:** T-011
> - **Description:** Implement wrapper for `claude -p --output-format json` with schema validation.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a transcript path
> When I call claudeExtractMemories
> Then Claude CLI is invoked with extraction prompt
> And JSON output is parsed correctly
> And extracted memories are returned
> ```

> **[T-013] Implement Hook Handlers**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-012
> - **Description:** Connect hooks to the memory pipeline: SessionStart loads, Stop extracts, PreCompact re-injects.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given a SessionStart event
> When hook executes
> Then memories are loaded and injected via additionalContext
> Given a Stop event
> When hook executes
> Then memories are extracted and stored
> Given a PreCompact event
> When hook executes
> Then memories are re-injected into context
> ```

---

## Epic 6: Learning

> **[T-014] Implement Citation Extraction**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-013
> - **Description:** Parse LLM responses for [i,j,k] citation format per paper.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given an LLM response with citations
> When I parse for [i,j,k] pattern
> Then citations are extracted and stored
> And useful flag is set based on citation presence
> ```

> **[T-015] Implement REINFORCE Weight Updates**
>
> - **Type:** Feature
> - **Effort:** 3
> - **Dependencies:** T-014
> - **Description:** Implement gradient computation and weight updates using citations as rewards.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given citation rewards and embeddings
> When I compute REINFORCE gradient
> Then W_q and W_m matrices are updated
> And weights are persisted to database
> ```

---

## Epic 7: Polish

> **[T-016] Error Handling & Logging**
>
> - **Type:** Chore
> - **Effort:** 2
> - **Dependencies:** T-015
> - **Description:** Add comprehensive error handling and structured logging.
> - **Acceptance Criteria:**
>
> ```gherkin
> Given any error in the pipeline
> When error occurs
> Then it's logged with context
> And hook exits cleanly (not blocking Claude)
> ```

> **[T-017] CLI Commands**
>
> - **Type:** Feature
> - **Effort:** 2
> - **Dependencies:** T-016
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

> **[T-018] Documentation**
>
> - **Type:** Chore
> - **Effort:** 1
> - **Dependencies:** T-017
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
