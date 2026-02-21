/**
 * Interface contract tests for IStorage
 */
import { describe, expect, it } from "bun:test";
import type { IStorage } from "../interfaces.ts";
import { MockStorage } from "../mock.ts";

describe("IStorage Interface", () => {
  const storage: IStorage = new MockStorage();

  it("should have initDatabase method", () => {
    expect(typeof storage.initDatabase).toBe("function");
  });

  it("should have getMemories method", () => {
    expect(typeof storage.getMemories).toBe("function");
  });

  it("should have searchSimilar method", () => {
    expect(typeof storage.searchSimilar).toBe("function");
  });

  it("should have saveMemory method", () => {
    expect(typeof storage.saveMemory).toBe("function");
  });

  it("should have mergeMemory method", () => {
    expect(typeof storage.mergeMemory).toBe("function");
  });

  it("should have getWeights method", () => {
    expect(typeof storage.getWeights).toBe("function");
  });

  it("should have saveWeights method", () => {
    expect(typeof storage.saveWeights).toBe("function");
  });

  it("should have saveCitation method", () => {
    expect(typeof storage.saveCitation).toBe("function");
  });

  it("should have getCitations method", () => {
    expect(typeof storage.getCitations).toBe("function");
  });
});

describe("MockStorage", () => {
  const storage = new MockStorage();

  it("initDatabase returns empty promise", async () => {
    await expect(storage.initDatabase("/test/path")).resolves.toBeUndefined();
  });

  it("getMemories returns empty array", async () => {
    const memories = await storage.getMemories("/test/path");
    expect(memories).toEqual([]);
  });

  it("searchSimilar returns empty array", async () => {
    const results = await storage.searchSimilar("/test/path", [], 10);
    expect(results).toEqual([]);
  });

  it("saveMemory returns empty promise", async () => {
    await expect(
      storage.saveMemory({
        id: "test",
        projectPath: "/test/path",
        topicSummary: "test",
        rawDialogue: "test",
        timestamp: 123,
        sessionId: "test",
        embedding: [],
        turnReferences: [],
      })
    ).resolves.toBeUndefined();
  });

  it("getWeights returns null", async () => {
    const weights = await storage.getWeights("/test/path");
    expect(weights).toBeNull();
  });
});
