export const CORE_EMBEDDING_DIMENSION = 768;

export interface MemoryEntry {
  embedding: number[];
  id: string;
  projectPath: string;
  rawDialogue: string;
  sessionId: string;
  timestamp: number;
  topicSummary: string;
  turnReferences: number[];
}

export interface RetrievedMemory {
  embedding?: number[];
  id: string;
  rawDialogue: string;
  relevanceScore: number;
  rerankScore?: number;
  sessionId: string;
  timestamp: number;
  topicSummary: string;
  turnReferences: number[];
}

export interface RerankerConfig {
  baseline: number;
  learningRate: number;
  temperature: number;
  topK: number;
  topM: number;
}

export interface RerankerState {
  config: RerankerConfig;
  weights: {
    memoryTransform: number[][];
    queryTransform: number[][];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteNumberArray(value: unknown, expectedLength?: number): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  if (typeof expectedLength === "number" && value.length !== expectedLength) {
    return false;
  }

  return value.every((item) => isFiniteNumber(item));
}

function isMatrix(value: unknown, dimension: number): boolean {
  if (!Array.isArray(value) || value.length !== dimension) {
    return false;
  }

  return value.every(
    (row) => Array.isArray(row) && isFiniteNumberArray(row, dimension)
  );
}

function isNonNegativeIntegerArray(value: unknown): value is number[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (item) => Number.isInteger(item) && typeof item === "number" && item >= 0
  );
}

export function isMemoryEntry(value: unknown): value is MemoryEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.projectPath) &&
    isNonEmptyString(value.topicSummary) &&
    isNonEmptyString(value.rawDialogue) &&
    isFiniteNumber(value.timestamp) &&
    isNonEmptyString(value.sessionId) &&
    isFiniteNumberArray(value.embedding, CORE_EMBEDDING_DIMENSION) &&
    isNonNegativeIntegerArray(value.turnReferences)
  );
}

export function isRerankerState(value: unknown): value is RerankerState {
  if (!(isRecord(value) && isRecord(value.weights) && isRecord(value.config))) {
    return false;
  }

  const { config, weights } = value;

  return (
    isMatrix(weights.queryTransform, CORE_EMBEDDING_DIMENSION) &&
    isMatrix(weights.memoryTransform, CORE_EMBEDDING_DIMENSION) &&
    isFiniteNumber(config.topK) &&
    config.topK > 0 &&
    Number.isInteger(config.topK) &&
    isFiniteNumber(config.topM) &&
    config.topM > 0 &&
    Number.isInteger(config.topM) &&
    isFiniteNumber(config.temperature) &&
    config.temperature > 0 &&
    isFiniteNumber(config.learningRate) &&
    config.learningRate > 0 &&
    isFiniteNumber(config.baseline)
  );
}
