# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Claude Code plugin** implementing **Reflective Memory Management (RMM)** for long-term conversational memory. It allows Claude Code to remember context across sessions.

Based on the paper: *"In Prospect and Retrospect: Reflective Memory Management for Long-term Personalized Dialogue Agents"* (ACL 2025, arXiv:2503.08026v2)

## Key Commands

```bash
bun install          # Install dependencies
bun run check        # Lint and format
bun run test         # Run tests
bun run src/index.ts # Run the plugin (dev)
```

## Architecture

This plugin uses **event-driven architecture** with Claude Code hooks:

- **UserPromptSubmit**: Load memories into context before each user prompt
- **SessionEnd**: Extract memories from conversation when session ends
- **PreCompact**: Re-inject memories before context compaction

The system has two main components:
1. **Prospective Reflection**: Extracts memories from conversations using LLM
2. **Retrospective Reflection**: Retrieves and reranks memories for context injection

## Technical Stack

- **Runtime**: Bun
- **Database**: SQLite (local, per-project isolation)
- **Embeddings**: nomic-embed-text-v1 (768 dimensions)
- **Reranker**: W_q, W_m matrices (768×768, ~2.4MB per project)

## Implementation Status

See docs/Tasks.md for the implementation plan (19 tickets). The project is in Phase 1 (MVP) - completed through T-012 (Core Algorithms).

## Code Standards

Run `bun run check` and `bun run fix` before committing.
