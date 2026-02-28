import { describe, expect, it } from "bun:test";
import type { MemoryEntry } from "../../types/memory.ts";
import {
  buildUpdatePrompt,
  decideUpdateAction,
  type SimilarMemory,
} from "../memory-update.ts";

function createMemory(summary: string): MemoryEntry {
  return {
    id: "new-memory",
    projectPath: "/tmp/project",
    topicSummary: summary,
    rawDialogue: "dialogue",
    timestamp: Date.now(),
    sessionId: "session-1",
    embedding: new Array(768).fill(0),
    turnReferences: [1],
  };
}

describe("buildUpdatePrompt", () => {
  it("includes existing summaries and new summary", () => {
    const prompt = buildUpdatePrompt(["old summary"], "new summary");

    expect(prompt).toContain("old summary");
    expect(prompt).toContain("new summary");
    expect(prompt).toContain('"action":"Add"');
  });
});

describe("decideUpdateAction", () => {
  it("returns Add for dissimilar memories", async () => {
    const actions = await decideUpdateAction(createMemory("fresh topic"), [], {
      callModel: () =>
        Promise.reject(
          new Error(
            "callModel should not be called for empty similar memory list"
          )
        ),
    });

    expect(actions).toEqual([{ action: "Add" }]);
  });

  it("returns Merge action with memory ID when model selects merge", async () => {
    const similar: SimilarMemory[] = [
      { id: "existing-1", topicSummary: "old topic" },
    ];

    const actions = await decideUpdateAction(
      createMemory("updated topic"),
      similar,
      {
        callModel: async () =>
          JSON.stringify({
            action: "Merge",
            memoryId: "existing-1",
            mergedSummary: "merged topic summary",
          }),
      }
    );

    expect(actions).toEqual([
      {
        action: "Merge",
        memoryId: "existing-1",
        mergedSummary: "merged topic summary",
      },
    ]);
  });

  it("supports merge decisions by index", async () => {
    const similar: SimilarMemory[] = [
      { id: "memory-0", topicSummary: "summary 0" },
      { id: "memory-1", topicSummary: "summary 1" },
    ];

    const actions = await decideUpdateAction(
      createMemory("new detail"),
      similar,
      {
        callModel: async () =>
          JSON.stringify({
            action: "Merge",
            index: 1,
            merged_summary: "summary 1 + new detail",
          }),
      }
    );

    expect(actions).toEqual([
      {
        action: "Merge",
        memoryId: "memory-1",
        mergedSummary: "summary 1 + new detail",
      },
    ]);
  });
});
