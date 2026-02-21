/**
 * Storage interface - defines the contract for persistence operations
 */
import type {
  CitationRecord,
  MemoryEntry,
  RerankerState,
  SearchResult,
} from "./types.ts";

export interface IStorage {
  /**
   * Get all citations for a project
   */
  getCitations(projectPath: string): Promise<CitationRecord[]>;

  /**
   * Get all memories for a project
   */
  getMemories(projectPath: string): Promise<MemoryEntry[]>;

  /**
   * Get reranker weights for a project
   */
  getWeights(projectPath: string): Promise<RerankerState | null>;

  /**
   * Initialize the database for a project
   */
  initDatabase(projectPath: string): Promise<void>;

  /**
   * Merge/update an existing memory
   */
  mergeMemory(
    projectPath: string,
    id: string,
    topicSummary: string
  ): Promise<void>;

  /**
   * Save a citation record
   */
  saveCitation(citation: CitationRecord): Promise<void>;

  /**
   * Save a new memory
   */
  saveMemory(memory: MemoryEntry): Promise<void>;

  /**
   * Save reranker weights for a project
   */
  saveWeights(projectPath: string, weights: RerankerState): Promise<void>;

  /**
   * Search for similar memories using embeddings
   */
  searchSimilar(
    projectPath: string,
    embedding: number[],
    topK: number
  ): Promise<SearchResult[]>;
}
