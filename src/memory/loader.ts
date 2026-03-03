/**
 * Memory Loader - retrieves and formats memories for context injection
 *
 * Implements the retrieval pipeline:
 * 1. Embed the user prompt
 * 2. Search similar memories via storage
 * 3. Apply reranking with W_q, W_m matrices
 * 4. Return formatted memory strings
 */

import {
  adaptEmbedding,
  computeScore,
  gumbelSoftmaxSample,
  type ScoredMemory,
} from "../core/algorithms/reranking.ts";
import { CORE_EMBEDDING_DIMENSION } from "../core/types/memory.ts";
import { embedQuery } from "../embeddings/nomic.ts";
import { SQLiteStorage } from "../storage/sqlite.ts";
import type { RerankerState } from "../storage/types.ts";

/** Default configuration values */
const DEFAULT_TOP_K = 20; // Number of memories to retrieve initially
const DEFAULT_TOP_M = 5; // Number of memories to return after reranking
const DEFAULT_TEMPERATURE = 0.5;

/** Singleton storage instance */
let storageInstance: SQLiteStorage | null = null;

/** Get or create storage instance */
function getStorage(): SQLiteStorage {
  if (!storageInstance) {
    storageInstance = new SQLiteStorage();
  }
  return storageInstance;
}

/**
 * Initialize reranker weights if they don't exist
 */
async function getOrInitWeights(
  projectPath: string,
  storage: SQLiteStorage
): Promise<RerankerState> {
  let weights = await storage.getWeights(projectPath);

  if (!weights) {
    // Initialize with identity-like weights
    weights = {
      config: {
        baseline: 0.5,
        learningRate: 0.01,
        temperature: DEFAULT_TEMPERATURE,
        topK: DEFAULT_TOP_K,
        topM: DEFAULT_TOP_M,
      },
      weights: {
        // Identity matrix for query transform
        queryTransform: createIdentityMatrix(CORE_EMBEDDING_DIMENSION),
        // Identity matrix for memory transform
        memoryTransform: createIdentityMatrix(CORE_EMBEDDING_DIMENSION),
      },
    };
    await storage.saveWeights(projectPath, weights);
  }

  return weights;
}

/**
 * Create an identity matrix of given dimension
 */
function createIdentityMatrix(dimension: number): number[][] {
  const matrix: number[][] = [];
  for (let i = 0; i < dimension; i++) {
    const row: number[] = [];
    for (let j = 0; j < dimension; j++) {
      row.push(i === j ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Load relevant memories for the current context
 *
 * @param projectPath - The project directory path
 * @param sessionId - The current session ID
 * @param userPrompt - The user's prompt (optional, for embedding)
 * @returns Array of memory summaries for context injection
 */
export async function loadMemories(
  projectPath: string,
  _sessionId: string,
  userPrompt?: string
): Promise<string[]> {
  const storage = getStorage();

  // Initialize database
  await storage.initDatabase(projectPath);

  // Get all project memories
  const memories = await storage.getMemories(projectPath);

  if (memories.length === 0) {
    return [];
  }

  // Get or initialize reranker weights
  const weights = await getOrInitWeights(projectPath, storage);

  // Embed the user prompt if provided, otherwise use empty query
  let queryEmbedding: number[];
  if (userPrompt && userPrompt.trim().length > 0) {
    queryEmbedding = await embedQuery(userPrompt);
  } else {
    // If no prompt, return all memories (unranked)
    return memories.map((m) => formatMemorySummary(m));
  }

  // Adapt query embedding using W_q
  const adaptedQuery = adaptEmbedding(
    queryEmbedding,
    weights.weights.queryTransform
  );

  // Score all memories
  const scoredMemories: ScoredMemory[] = [];

  for (const memory of memories) {
    if (
      !memory.embedding ||
      memory.embedding.length !== CORE_EMBEDDING_DIMENSION
    ) {
      continue; // Skip memories without valid embeddings
    }

    // Adapt memory embedding using W_m
    const adaptedMemory = adaptEmbedding(
      memory.embedding,
      weights.weights.memoryTransform
    );

    // Compute score
    const score = computeScore(adaptedQuery, adaptedMemory);

    scoredMemories.push({
      id: memory.id,
      topicSummary: memory.topicSummary,
      rawDialogue: memory.rawDialogue,
      sessionId: memory.sessionId,
      timestamp: memory.timestamp,
      embedding: memory.embedding,
      turnReferences: memory.turnReferences,
      relevanceScore: score,
      rerankScore: score,
    });
  }

  // Sort by relevance score (descending)
  scoredMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Get top-K initial results
  const topK = weights.config.topK ?? DEFAULT_TOP_K;
  const topMemories = scoredMemories.slice(0, topK);

  // Apply gumbel softmax sampling for top-M selection
  const topM = weights.config.topM ?? DEFAULT_TOP_M;
  const temperature = weights.config.temperature ?? DEFAULT_TEMPERATURE;

  let finalMemories: ScoredMemory[];

  if (topMemories.length <= topM) {
    finalMemories = topMemories;
  } else {
    // Use gumbel softmax sampling
    const scores = topMemories.map((m) => m.relevanceScore);
    const samplingResult = gumbelSoftmaxSample(scores, topM, temperature);
    finalMemories = samplingResult.selectedMemories;
  }

  // Format and return memory summaries
  return finalMemories.map((m) => formatMemorySummary(m));
}

/**
 * Format a memory entry as a summary string
 */
function formatMemorySummary(memory: {
  id: string;
  topicSummary: string;
}): string {
  return `- Memory [${memory.id.slice(0, 8)}]: ${memory.topicSummary}`;
}
