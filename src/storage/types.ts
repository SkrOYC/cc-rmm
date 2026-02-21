/**
 * Storage types for the RMM plugin
 */

// Memory Entry (768-dim embedding)
export interface MemoryEntry {
  embedding: number[]; // 768 dimensions
  id: string;
  projectPath: string;
  rawDialogue: string;
  sessionId: string;
  timestamp: number;
  topicSummary: string;
  turnReferences: number[];
}

// Reranker State (768×768 matrices)
export interface RerankerState {
  config: {
    topK: number;
    topM: number;
    temperature: number;
    learningRate: number;
    baseline: number;
  };
  weights: {
    queryTransform: number[][]; // 768×768
    memoryTransform: number[][]; // 768×768
  };
}

// Citation Record
export interface CitationRecord {
  createdAt: number;
  id: string;
  memoryId: string;
  projectPath: string;
  sessionId: string;
  useful: boolean;
}

// Search result
export interface SearchResult {
  memory: MemoryEntry;
  score: number;
}
