# Architecture.md — Claude Code RMM Memory Plugin

## 1. Architectural Strategy

### The Pattern: Event-Driven Modular Monolith

Per **Martin Fowler's** architectural guidance, this plugin uses an **Event-Driven Architecture** within a single deployable unit (the Claude Code plugin). This fits because:

1. **Natural Event Flow**: Claude Code hooks provide lifecycle events (`UserPromptSubmit`, `SessionEnd`, `PreCompact`) that naturally map to memory operations
2. **Solo Dev Constraints**: Single plugin directory, no distributed systems, minimal operational burden
3. **Separation of Concerns**: Distinct modules for extraction, retrieval, storage, and reranking

### Architectural Style Justification

| Alternative       | Rejected Because                                       |
| ----------------- | ------------------------------------------------------ |
| Pure MCP Server   | No lifecycle event triggers; must be explicitly called |
| Microservices     | Overhead unjustified for solo dev use case             |
| External Database | Violates privacy-first, local-only constraint          |

---

## 2. System Containers (C4 Level 2)

| Container                | Type            | Responsibility                                                           |
| ------------------------ | --------------- | ------------------------------------------------------------------------ |
| **Hook Handlers**        | Event Listeners | Respond to Claude Code lifecycle events (UserPromptSubmit, SessionEnd, PreCompact) |
| **Memory Engine**        | Core Service    | Orchestrates extraction, retrieval, merge operations                     |
| **Prospective Module**   | Processor       | Extracts memories from conversation transcript using LLM                 |
| **Retrospective Module** | Processor       | Retrieves and reranks memories for context injection                     |
| **Reranker**             | ML Model        | Lightweight W_q, W_m matrices for adaptive retrieval                     |
| **SQLite Storage**       | Database        | Persists memories and reranker weights                                   |
| **Embedding Service**    | External        | Local embedding model (Nomic/BGE) for similarity search                  |
| **Context Injector**     | Output          | Formats and injects memories into Claude Code context                    |

---

## 3. Container Diagram

```mermaid
C4Container
  title Container Diagram for Claude Code RMM Plugin

  Person(user, "User", "Claude Code user")

  System_Boundary(claude_code, "Claude Code") {
    Container(hooks, "Hooks System", "Event-driven lifecycle", "Triggers UserPromptSubmit, SessionEnd, PreCompact")
    Container(cli, "Claude CLI", "AI assistant", "Invokes hooks at lifecycle points")
  }

  System_Boundary(plugin, "RMM Plugin") {
    Container(hook_handlers, "Hook Handlers", "TypeScript/Bun", "Parses hook input, routes to engine")
    Container(memory_engine, "Memory Engine", "TypeScript/Bun", "Orchestrates all memory operations")
    Container(prospective, "Prospective Module", "TypeScript/Bun", "Memory extraction via LLM")
    Container(retrospective, "Retrospective Module", "TypeScript/Bun", "Retrieval + reranking")
    Container(reranker, "Reranker", "TypeScript/Bun", "W_q, W_m matrix operations")
    Container(injector, "Context Injector", "TypeScript/Bun", "Formats memories for injection")
  }

  System_Boundary(external, "External Systems") {
    ContainerDb(sqlite, "SQLite Database", "SQLite", "Memory + weights persistence")
    Container(embeddings, "Embedding Service", "Nomic/BGE", "Local embedding model")
    Container(llm, "LLM Service", "API", "Memory extraction via agent hook")
  }

  Rel(cli, hooks, "Triggers events")
  Rel(hooks, hook_handlers, "Executes hook script")
  Rel(hook_handlers, memory_engine, "Routes requests")
  Rel(memory_engine, prospective, "Extracts memories")
  Rel(memory_engine, retrospective, "Retrieves memories")
  Rel(memory_engine, injector, "Injects context")
  Rel(memory_engine, sqlite, "Reads/Writes data")
  Rel(retrospective, reranker, "Uses weights")
  Rel(retrospective, embeddings, "Embeds queries")
  Rel(prospective, llm, "Extracts via LLM")
  Rel(injector, hooks, "Returns additionalContext")
```

---

## 4. Critical Execution Flows

### Flow 1: User Prompt Submit (Memory Loading)

```mermaid
sequenceDiagram
    participant User
    participant Claude as Claude Code
    participant Hooks as Hook System
    participant Handler as Hook Handler
    participant Engine as Memory Engine
    participant SQLite as SQLite
    participant Embed as Embedding Service
    participant Reranker as Reranker
    participant Injector as Context Injector

    User->>Claude: Submits prompt
    Claude->>Hooks: UserPromptSubmit event
    Hooks->>Handler: Execute hook script
    Handler->>Engine: Load memories

    par Retrieval Pipeline
        Engine->>SQLite: Get project memories
        Engine->>Embed: Embed current query/prompt
    end

    Embed-->>Engine: Query embedding
    Engine->>Reranker: Get W_q, W_m weights
    Reranker-->>Engine: Transformed embeddings

    Engine->>SQLite: Semantic search (Top-K)
    SQLite-->>Engine: Candidate memories

    Engine->>Reranker: Rerank with weights
    Reranker-->>Engine: Scored memories (Top-M)

    Engine->>Injector: Format memories
    Injector-->>Handler: <memories> block

    Handler-->>Hooks: Return additionalContext
    Hooks-->>Claude: Inject into context
    Claude-->>User: Context enriched with memories
```

**Note:** This flow runs on every user prompt, ensuring memories are always fresh.

### Flow 2: SessionEnd (Memory Extraction)

```mermaid
sequenceDiagram
    participant User
    participant Claude as Claude Code
    participant Hooks as Hook System
    participant Handler as Hook Handler
    participant Engine as Memory Engine
    participant LLM as LLM (Agent Hook)
    participant SQLite as SQLite

    User->>Claude: Ends conversation
    Claude->>Hooks: SessionEnd event
    Hooks->>Handler: Execute hook

    par Get Transcript
        Handler->>Hooks: Get transcript_path
        Hooks-->>Handler: Path to JSONL
    end

    Handler->>Engine: Extract memories

    par Process with LLM
        Engine->>LLM: Read transcript + extract
        LLM-->>Engine: Extracted memories (JSON)
    end

    loop For each extracted memory
        Engine->>SQLite: Check existing memories
        SQLite-->>Engine: Similar memories

        Engine->>LLM: Decide Merge vs Add
        LLM-->>Engine: Action (Merge/Add)

        Engine->>SQLite: Execute action
    end

    Engine-->>Handler: Extraction complete
    Handler-->>Hooks: Exit 0
```

### Flow 3: Pre-Compact (Extract + Re-inject)

```mermaid
sequenceDiagram
    participant Claude as Claude Code
    participant Hooks as Hook System
    participant Handler as Hook Handler
    participant Engine as Memory Engine
    participant LLM as LLM (Agent Hook)
    participant Reranker as Reranker
    participant SQLite as SQLite

    Note over Claude: Context needs compaction
    Claude->>Hooks: PreCompact event
    Hooks->>Handler: Execute hook (with transcript_path)

    rect rgb(240, 248, 255)
        Note over Handler,LLM: Prospective Reflection (Extract)
        Handler->>Engine: Extract new memories

        Engine->>SQLite: Get existing turn references
        SQLite-->>Engine: Referenced turn IDs

        Engine->>LLM: Extract from unconsidered turns
        LLM-->>Engine: New memories

        Engine->>SQLite: Store new memories (with turn refs)
    end

    rect rgb(255, 248, 240)
        Note over Handler,SQLite: Retrospective Reflection (Re-inject)
        Handler->>Engine: Re-inject memories

        Engine->>SQLite: Get all project memories
        Engine->>Reranker: Re-rank for current context

        Engine->>Handler: Top-M relevant memories
    end

    Handler-->>Hooks: additionalContext
    Hooks-->>Claude: Re-inject after compaction
```

**Key difference from Flow 2 (SessionEnd):** PreCompact performs full re-extraction, letting deduplication (turn reference tracking) handle overlaps with memories already extracted at SessionEnd.

---

## 5. Resilience & Cross-Cutting Concerns

### Failure Mode Analysis

| Component             | Failure Scenario      | Mitigation                          |
| --------------------- | --------------------- | ----------------------------------- |
| **Hook Handler**      | Script exits non-zero | Log error, allow Claude to continue |
| **Memory Extraction** | LLM call fails        | Queue for retry, skip extraction    |
| **Embedding Service** | Model unavailable     | Fallback to keyword search          |
| **SQLite**            | Database locked       | Retry with exponential backoff      |
| **Reranker**          | Weights corrupted     | Re-initialize with random values    |

### Stability Patterns

| Pattern             | Location           | Implementation                                |
| ------------------- | ------------------ | --------------------------------------------- |
| **Circuit Breaker** | LLM calls          | After 3 failures, skip extraction for session |
| **Timeout**         | External calls     | 30s max for any LLM operation                 |
| **Bulkhead**        | Database           | Connection pool limit = 5                     |
| **Retry**           | Transient failures | 3 retries with 1s backoff                     |

### Observability

| Requirement        | Implementation                                   |
| ------------------ | ------------------------------------------------ |
| **Logging**        | Structured JSON to stderr (Claude Code captures) |
| **Correlation**    | session_id propagated through all operations     |
| **Error Tracking** | Hook exit codes: 0=success, 1=error, 2=block     |

---

## 6. Logical Risks & Technical Debt

### Identified Risks

| Risk                         | Likelihood | Impact | Mitigation                                               |
| ---------------------------- | ---------- | ------ | -------------------------------------------------------- |
| **Embedding model setup**    | High       | Medium | Document required installation, provide installer script |
| **LLM API rate limits**      | Medium     | High   | Implement request throttling                             |
| **Large transcript parsing** | Medium     | Low    | Stream parse, don't load full file                       |
| **Memory bank growth**       | Low        | Medium | Implement pruning after N sessions                       |

### Technical Debt (Deferred)

| Item                | Reason for Deferral    |
| ------------------- | ---------------------- |
| Team memory sharing | Out of scope for MVP   |
| Memory encryption   | Local-only, low risk   |
| Visual UI           | CLI sufficient for MVP |

---

## 7. Data Flow Summary

```
┌──────────────────────────────────────────────────────────┐
│                    Claude Code Lifecycle                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  UserPromptSubmit ──► Load Memories ──► Inject Context   │
│       │                                                  │
│       ▼                                                  │
│  [User works with Claude]                                │
│       │                                                  │
│       ▼                                                  │
│  PreCompact ──► Extract (new) ──► Deduplicate ──► Re-inject │
│       │                                                  │
│       ▼                                                  │
│  [More user work]                                        │
│       │                                                  │
│       ▼                                                  │
│  SessionEnd ──► Extract Memories ──► Deduplicate ──► Persist   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Note:** Both PreCompact and SessionEnd trigger Prospective Reflection. Turn reference tracking ensures PreCompact only extracts unconsidered turns, preventing duplicates.

---

## 8. Key Design Decisions

| Decision                  | Rationale                                                    |
| ------------------------- | ------------------------------------------------------------ |
| **SQLite over file**      | ACID compliance, better query performance, built into Bun    |
| **Local embeddings**      | Privacy, no API costs, works offline                         |
| **Agent hooks for LLM**   | Built-in tool access, no external dependencies               |
| **W_q, W_m matrices**     | Paper's approach, ~2.4MB per project (768×768), CPU-friendly |
| **Per-project isolation** | Git directory as natural boundary                            |

---

## 9. Integration Points

### Claude Code Integration

| Event          | Hook Type | Action                   |
| -------------- | --------- | ------------------------ |
| `UserPromptSubmit` | command   | Load + inject memories before each prompt   |
| `SessionEnd`         | agent     | Extract memories via LLM |
| `PreCompact`   | agent     | Extract + re-inject memories |

> **Note**: Physical schema defined in TechSpec.md

---

_Architecture Version: 1.0_
_Based on: PRD.md v1.0, Claude Code Hooks Research_
