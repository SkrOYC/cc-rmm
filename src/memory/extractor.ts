/**
 * Memory Extractor - extracts memories from conversation transcripts
 *
 * This module wires up the core memory extraction algorithms with storage
 * and embedding services.
 */
import { randomUUID } from "node:crypto";
import { extractMemories as coreExtractMemories } from "../core/algorithms/memory-extraction.ts";
import {
  type DecideUpdateDependencies,
  decideUpdateAction,
  type UpdateAction,
} from "../core/algorithms/memory-update.ts";
import { embedDocument } from "../embeddings/nomic.ts";
import { SQLiteStorage } from "../storage/sqlite.ts";
import type { MemoryEntry, SearchResult } from "../storage/types.ts";

/** Number of similar memories to retrieve for merge decisions */
const SIMILARITY_SEARCH_TOP_K = 5;

/**
 * Dependency injection container for extraction
 */
interface ExtractionDependencies {
  callModel: (prompt: string) => Promise<string>;
  embedDocuments: (summaries: string[]) => Promise<number[][]>;
  generateId: () => string;
  now: () => number;
}

/**
 * Create default dependencies with mocked LLM calls
 *
 * TODO: Replace with real Claude CLI adapter (T-013)
 */
function createDependencies(): ExtractionDependencies {
  return {
    callModel: (_prompt: string): Promise<string> => {
      console.error(
        "extractMemories: Mock LLM call - returning empty memories"
      );
      return Promise.resolve('{"memories": []}');
    },
    embedDocuments: (summaries: string[]): Promise<number[][]> => {
      // Use embedDocument in a loop until batch embedding is available
      return Promise.all(summaries.map((s) => embedDocument(s)));
    },
    generateId: () => randomUUID(),
    now: () => Date.now(),
  };
}

/**
 * Extract memories from a transcript file
 *
 * @param transcriptPath - Path to the transcript JSONL file
 * @param sessionId - The current session ID
 * @param projectPath - Project path (defaults to process.cwd())
 * @returns Array of extracted memory entries
 */
export async function extractMemories(
  transcriptPath: string,
  sessionId: string,
  projectPath?: string
): Promise<MemoryEntry[]> {
  const project = projectPath ?? process.cwd();
  console.error(
    `extractMemories: Starting extraction for session ${sessionId} in ${project}`
  );

  // Initialize storage
  const storage = new SQLiteStorage();
  await storage.initDatabase(project);

  // Create dependencies with mocks
  const dependencies = createDependencies();

  // Call the core extraction algorithm
  const options = {
    projectPath: project,
    sessionId,
    transcriptPath,
    excludedTurnIds: [],
  };

  console.error("extractMemories: Running core extraction algorithm...");
  const extractedMemories = await coreExtractMemories(options, dependencies);

  console.error(
    `extractMemories: Core algorithm extracted ${extractedMemories.length} candidates`
  );

  // Process each extracted memory: decide Add or Merge, then save
  const savedMemories: MemoryEntry[] = [];

  // Dependencies for update decisions (same for all memories)
  const updateDependencies: DecideUpdateDependencies = {
    callModel: dependencies.callModel,
  };

  for (const memory of extractedMemories) {
    // Search for similar existing memories
    const similarResults = await storage.searchSimilar(
      project,
      memory.embedding,
      SIMILARITY_SEARCH_TOP_K
    );
    const similarMemories = similarResults.map((r: SearchResult) => ({
      id: r.memory.id,
      topicSummary: r.memory.topicSummary,
    }));

    // Decide whether to Add or Merge
    const actions: UpdateAction[] = await decideUpdateAction(
      memory,
      similarMemories,
      updateDependencies
    );

    // Execute the first action (currently we handle one action per memory)
    const action = actions[0];
    if (!action) {
      continue;
    }

    if (action.action === "Add") {
      await storage.saveMemory(memory);
      savedMemories.push(memory);
      console.error(
        `extractMemories: Added new memory ${memory.id}: ${memory.topicSummary}`
      );
    } else {
      // Merge action
      await storage.mergeMemory(project, action.memoryId, action.mergedSummary);
      console.error(
        `extractMemories: Merged into memory ${action.memoryId}: ${action.mergedSummary}`
      );
    }
  }

  console.error(
    `extractMemories: Completed. Saved ${savedMemories.length} new memories`
  );

  return savedMemories;
}
