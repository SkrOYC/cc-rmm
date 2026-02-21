import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { SQLiteStorage } from "../../storage/sqlite.ts";
import type { MemoryEntry } from "../../storage/types.ts";
import { cosineSimilarity } from "../similarity.ts";

function buildVector(seed: number): number[] {
  return Array.from({ length: 768 }, (_, index) =>
    Math.sin((index + 1) * seed)
  );
}

describe("cosineSimilarity", () => {
  it("computes cosine similarity correctly", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0, 6);
    expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1, 6);
  });
});

describe("SQLiteStorage.searchSimilar", () => {
  const testProjectPath = "/tmp/cc-rmm-similarity-test";
  let storage: SQLiteStorage;

  beforeEach(() => {
    mkdirSync(testProjectPath, { recursive: true });
    storage = new SQLiteStorage();
  });

  afterEach(() => {
    rmSync(testProjectPath, { recursive: true, force: true });
  });

  it("returns top-K memories ranked by cosine similarity", async () => {
    await storage.initDatabase(testProjectPath);

    const query = buildVector(0.01);
    const memory1: MemoryEntry = {
      id: "memory-1",
      embedding: query,
      projectPath: testProjectPath,
      rawDialogue: "Most relevant",
      sessionId: "session-1",
      timestamp: Date.now(),
      topicSummary: "Most relevant",
      turnReferences: [1],
    };
    const memory2: MemoryEntry = {
      id: "memory-2",
      embedding: buildVector(0.015),
      projectPath: testProjectPath,
      rawDialogue: "Second relevant",
      sessionId: "session-2",
      timestamp: Date.now(),
      topicSummary: "Second relevant",
      turnReferences: [2],
    };
    const memory3: MemoryEntry = {
      id: "memory-3",
      embedding: buildVector(-0.01),
      projectPath: testProjectPath,
      rawDialogue: "Least relevant",
      sessionId: "session-3",
      timestamp: Date.now(),
      topicSummary: "Least relevant",
      turnReferences: [3],
    };

    await storage.saveMemory(memory1);
    await storage.saveMemory(memory2);
    await storage.saveMemory(memory3);

    const results = await storage.searchSimilar(testProjectPath, query, 2);

    expect(results).toHaveLength(2);
    expect(results[0]?.memory.id).toBe("memory-1");
    expect(results[0]?.score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
  });

  it("handles empty database", async () => {
    await storage.initDatabase(testProjectPath);

    const results = await storage.searchSimilar(
      testProjectPath,
      buildVector(0.01),
      5
    );

    expect(results).toEqual([]);
  });
});
