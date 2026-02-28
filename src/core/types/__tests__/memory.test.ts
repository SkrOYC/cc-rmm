import { describe, expect, it } from "bun:test";
import {
  CORE_EMBEDDING_DIMENSION,
  isMemoryEntry,
  isRerankerState,
  type MemoryEntry,
} from "../memory.ts";

function createEmbedding(): number[] {
  return Array.from({ length: CORE_EMBEDDING_DIMENSION }, (_, index) =>
    Math.sin(index / 100)
  );
}

function createMatrix(): number[][] {
  return Array.from({ length: CORE_EMBEDDING_DIMENSION }, (_, rowIndex) => {
    const row = new Array(CORE_EMBEDDING_DIMENSION).fill(0);
    row[rowIndex] = 1;
    return row;
  });
}

describe("isMemoryEntry", () => {
  it("returns true for valid memory entries", () => {
    const memory: MemoryEntry = {
      id: "mem-1",
      projectPath: "/tmp/project",
      topicSummary: "User prefers TypeScript",
      rawDialogue: "SPEAKER_1: I prefer TypeScript",
      timestamp: Date.now(),
      sessionId: "session-1",
      embedding: createEmbedding(),
      turnReferences: [0, 1],
    };

    expect(isMemoryEntry(memory)).toBe(true);
  });

  it("enforces 768-dim embeddings", () => {
    const invalid = {
      id: "mem-1",
      projectPath: "/tmp/project",
      topicSummary: "summary",
      rawDialogue: "dialogue",
      timestamp: Date.now(),
      sessionId: "session-1",
      embedding: new Array(12).fill(0),
      turnReferences: [0],
    };

    expect(isMemoryEntry(invalid)).toBe(false);
  });

  it("supports JSON round-trip serialization", () => {
    const memory: MemoryEntry = {
      id: "mem-2",
      projectPath: "/tmp/project",
      topicSummary: "Round-trip test",
      rawDialogue: "SPEAKER_2: Round-trip",
      timestamp: Date.now(),
      sessionId: "session-2",
      embedding: createEmbedding(),
      turnReferences: [2, 3],
    };

    const serialized = JSON.stringify(memory);
    const parsed = JSON.parse(serialized) as unknown;

    expect(isMemoryEntry(parsed)).toBe(true);
  });
});

describe("isRerankerState", () => {
  it("validates 768x768 matrix requirements", () => {
    const state = {
      weights: {
        queryTransform: createMatrix(),
        memoryTransform: createMatrix(),
      },
      config: {
        topK: 10,
        topM: 3,
        temperature: 0.5,
        learningRate: 0.01,
        baseline: 0,
      },
    };

    expect(isRerankerState(state)).toBe(true);
  });

  it("rejects invalid matrix dimensions", () => {
    const invalid = {
      weights: {
        queryTransform: [[1, 2]],
        memoryTransform: [[1, 2]],
      },
      config: {
        topK: 10,
        topM: 3,
        temperature: 0.5,
        learningRate: 0.01,
        baseline: 0,
      },
    };

    expect(isRerankerState(invalid)).toBe(false);
  });
});
