/**
 * SQLite storage tests
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { SQLiteStorage } from "../sqlite.ts";
import type { CitationRecord, MemoryEntry, RerankerState } from "../types.ts";

describe("SQLiteStorage", () => {
  const testProjectPath = "/tmp/cc-rmm-test";
  let storage: SQLiteStorage;

  beforeEach(() => {
    // Create test directory
    mkdirSync(testProjectPath, { recursive: true });
    storage = new SQLiteStorage();
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testProjectPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("initDatabase", () => {
    it("creates database and tables", async () => {
      await storage.initDatabase(testProjectPath);

      // Database should be created - verify by trying to query
      const memories = await storage.getMemories(testProjectPath);
      expect(memories).toEqual([]);
    });
  });

  describe("saveMemory / getMemories", () => {
    it("persists and retrieves memories", async () => {
      await storage.initDatabase(testProjectPath);

      const memory: MemoryEntry = {
        id: "test-1",
        embedding: new Array(768).fill(0).map((_, i) => Math.sin(i / 100)),
        projectPath: testProjectPath,
        rawDialogue: "User prefers TypeScript strict mode",
        sessionId: "session-1",
        timestamp: Date.now(),
        topicSummary: "User prefers TypeScript strict mode",
        turnReferences: [1, 2, 3],
      };

      await storage.saveMemory(memory);
      const memories = await storage.getMemories(testProjectPath);

      expect(memories).toHaveLength(1);
      expect(memories[0]?.id).toBe("test-1");
      expect(memories[0]?.projectPath).toBe(testProjectPath);
      expect(memories[0]?.topicSummary).toBe(
        "User prefers TypeScript strict mode"
      );
      expect(memories[0]?.turnReferences).toEqual([1, 2, 3]);
      expect(memories[0]?.embedding).toHaveLength(768);
    });
  });

  describe("saveWeights / getWeights", () => {
    it("persists and retrieves 768x768 matrices", async () => {
      await storage.initDatabase(testProjectPath);

      // Create 768x768 identity-like matrix
      const createMatrix = (): number[][] => {
        const matrix: number[][] = [];
        for (let i = 0; i < 768; i++) {
          const row = new Array(768).fill(0);
          row[i] = 1; // Identity matrix
          matrix.push(row);
        }
        return matrix;
      };

      const weights: RerankerState = {
        weights: {
          queryTransform: createMatrix(),
          memoryTransform: createMatrix(),
        },
        config: {
          topK: 10,
          topM: 3,
          temperature: 1.0,
          learningRate: 0.01,
          baseline: 0.5,
        },
      };

      await storage.saveWeights(testProjectPath, weights);
      const retrieved = await storage.getWeights(testProjectPath);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.weights.queryTransform).toHaveLength(768);
      expect(retrieved?.weights.memoryTransform).toHaveLength(768);
      expect(retrieved?.weights.queryTransform[0]?.[0]).toBe(1);
      expect(retrieved?.weights.queryTransform[0]?.[1]).toBe(0);
      // Verify config is returned correctly
      expect(retrieved?.config.topK).toBe(10);
      expect(retrieved?.config.topM).toBe(3);
      expect(retrieved?.config.temperature).toBe(1.0);
      expect(retrieved?.config.learningRate).toBe(0.01);
      expect(retrieved?.config.baseline).toBe(0.5);
    });

    it("returns null for non-existent weights", async () => {
      await storage.initDatabase(testProjectPath);
      const weights = await storage.getWeights(testProjectPath);
      expect(weights).toBeNull();
    });
  });

  describe("saveCitation / getCitations", () => {
    it("persists and retrieves citations", async () => {
      await storage.initDatabase(testProjectPath);

      // First save a memory to satisfy foreign key constraint
      const memory: MemoryEntry = {
        id: "mem-1",
        embedding: new Array(768).fill(0),
        projectPath: testProjectPath,
        rawDialogue: "Test dialogue",
        sessionId: "session-1",
        timestamp: Date.now(),
        topicSummary: "Test memory",
        turnReferences: [],
      };
      await storage.saveMemory(memory);

      const citation: CitationRecord = {
        id: "cite-1",
        memoryId: "mem-1",
        projectPath: testProjectPath,
        sessionId: "session-1",
        useful: true,
        createdAt: Date.now(),
      };

      await storage.saveCitation(citation);
      const citations = await storage.getCitations(testProjectPath);

      expect(citations).toHaveLength(1);
      expect(citations[0]?.id).toBe("cite-1");
      expect(citations[0]?.useful).toBe(true);
      expect(citations[0]?.memoryId).toBe("mem-1");
    });
  });

  describe("searchSimilar", () => {
    it("returns memories ranked by cosine similarity", async () => {
      await storage.initDatabase(testProjectPath);

      // Create two memories with different embeddings
      const memory1: MemoryEntry = {
        id: "mem-1",
        embedding: new Array(768).fill(0).map((_, i) => i / 768),
        projectPath: testProjectPath,
        rawDialogue: "About TypeScript",
        sessionId: "session-1",
        timestamp: Date.now(),
        topicSummary: "TypeScript preference",
        turnReferences: [1],
      };

      const memory2: MemoryEntry = {
        id: "mem-2",
        embedding: new Array(768).fill(1),
        projectPath: testProjectPath,
        rawDialogue: "About Python",
        sessionId: "session-2",
        timestamp: Date.now(),
        topicSummary: "Python preference",
        turnReferences: [2],
      };

      await storage.saveMemory(memory1);
      await storage.saveMemory(memory2);

      // Search with embedding similar to memory1
      const queryEmbedding = new Array(768).fill(0).map((_, i) => i / 768);
      const results = await storage.searchSimilar(
        testProjectPath,
        queryEmbedding,
        2
      );

      expect(results).toHaveLength(2);
      expect(results[0]?.memory.id).toBe("mem-1"); // Most similar
      expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
    });

    it("handles empty database", async () => {
      await storage.initDatabase(testProjectPath);
      const results = await storage.searchSimilar(
        testProjectPath,
        new Array(768).fill(0),
        10
      );
      expect(results).toEqual([]);
    });
  });

  describe("mergeMemory", () => {
    it("updates memory summary", async () => {
      await storage.initDatabase(testProjectPath);

      const memory: MemoryEntry = {
        id: "mem-merge",
        embedding: new Array(768).fill(0),
        projectPath: testProjectPath,
        rawDialogue: "Original",
        sessionId: "session-merge",
        timestamp: Date.now(),
        topicSummary: "Original summary",
        turnReferences: [],
      };

      await storage.saveMemory(memory);
      await storage.mergeMemory(
        testProjectPath,
        "mem-merge",
        "Updated summary"
      );

      const memories = await storage.getMemories(testProjectPath);
      expect(memories[0]?.topicSummary).toBe("Updated summary");
    });
  });
});
