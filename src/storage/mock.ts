/**
 * Mock storage implementation for testing
 */
import type { IStorage } from "./interfaces.ts";
import type {
  CitationRecord,
  MemoryEntry,
  RerankerState,
  SearchResult,
} from "./types.ts";

export class MockStorage implements IStorage {
  getCitations(_projectPath: string): Promise<CitationRecord[]> {
    return Promise.resolve([]);
  }

  getMemories(_projectPath: string): Promise<MemoryEntry[]> {
    return Promise.resolve([]);
  }

  getWeights(_projectPath: string): Promise<RerankerState | null> {
    return Promise.resolve(null);
  }

  async initDatabase(_projectPath: string): Promise<void> {
    // No-op for mock
  }

  async mergeMemory(_id: string, _topicSummary: string): Promise<void> {
    // No-op for mock
  }

  async saveCitation(_citation: CitationRecord): Promise<void> {
    // No-op for mock
  }

  async saveMemory(_memory: MemoryEntry): Promise<void> {
    // No-op for mock
  }

  async saveWeights(
    _projectPath: string,
    _weights: RerankerState
  ): Promise<void> {
    // No-op for mock
  }

  searchSimilar(
    _projectPath: string,
    _embedding: number[],
    _topK: number
  ): Promise<SearchResult[]> {
    return Promise.resolve([]);
  }
}
