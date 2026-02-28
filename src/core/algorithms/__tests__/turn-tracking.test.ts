import { describe, expect, it } from "bun:test";
import {
  buildExtractionPrompt,
  type TranscriptTurn,
} from "../memory-extraction.ts";
import {
  buildExcludedTurnsPrompt,
  filterExtractedMemories,
  getReferencedTurnIds,
} from "../turn-tracking.ts";

describe("getReferencedTurnIds", () => {
  it("aggregates all turn IDs from project memories", () => {
    const result = getReferencedTurnIds([
      { turnReferences: [3, 1, 2] },
      { turnReferences: [2, 4] },
      { turnReferences: [4, 6] },
    ]);

    expect(result).toEqual([1, 2, 3, 4, 6]);
  });
});

describe("filterExtractedMemories", () => {
  it("removes memories that reference already-seen turns", () => {
    const extracted = [
      { topicSummary: "old", turnReferences: [1] },
      { topicSummary: "new", turnReferences: [5] },
      { topicSummary: "mixed", turnReferences: [2, 7] },
    ];

    const filtered = filterExtractedMemories(extracted, [1, 2, 3]);

    expect(filtered).toEqual([{ topicSummary: "new", turnReferences: [5] }]);
  });
});

describe("buildExcludedTurnsPrompt", () => {
  it("generates correct prompt exclusion text", () => {
    expect(buildExcludedTurnsPrompt([5, 1, 5, 3])).toBe(
      "skip turns: [1, 3, 5]"
    );
    expect(buildExcludedTurnsPrompt([])).toBe("");
  });

  it("is included in extraction prompt when exclusions are present", () => {
    const turns: TranscriptTurn[] = [
      {
        turnId: 0,
        speaker: "SPEAKER_1",
        content: "Message",
      },
    ];

    const prompt = buildExtractionPrompt(turns, [0, 2]);
    expect(prompt).toContain("skip turns: [0, 2]");
  });
});
