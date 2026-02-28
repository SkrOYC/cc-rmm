import { describe, expect, it } from "bun:test";
import {
  adaptEmbedding,
  computeScore,
  gumbelSoftmaxSample,
  type ScoredMemory,
} from "../reranking.ts";

function createIdentityMatrix(dimension: number): number[][] {
  return Array.from({ length: dimension }, (_, rowIndex) => {
    const row = new Array(dimension).fill(0);
    row[rowIndex] = 1;
    return row;
  });
}

describe("adaptEmbedding", () => {
  it("produces 768-dim adapted output", () => {
    const dimension = 768;
    const embedding = new Array(dimension).fill(1);
    const matrix = createIdentityMatrix(dimension);

    const adapted = adaptEmbedding(embedding, matrix);

    expect(adapted).toHaveLength(dimension);
    expect(adapted[0]).toBe(2);
    expect(adapted[767]).toBe(2);
  });
});

describe("computeScore", () => {
  it("computes q'·m' dot-product score", () => {
    const query = [1, 2, 3];
    const memory = [4, 5, 6];
    expect(computeScore(query, memory)).toBe(32);
  });
});

describe("gumbelSoftmaxSample", () => {
  it("selects Top-M memories and returns probabilities", () => {
    const memories: ScoredMemory[] = [
      {
        id: "a",
        topicSummary: "A",
        rawDialogue: "A",
        timestamp: 1,
        sessionId: "s",
        turnReferences: [0],
        relevanceScore: 0.1,
        rerankScore: 0.9,
      },
      {
        id: "b",
        topicSummary: "B",
        rawDialogue: "B",
        timestamp: 1,
        sessionId: "s",
        turnReferences: [1],
        relevanceScore: 0.1,
        rerankScore: 0.7,
      },
      {
        id: "c",
        topicSummary: "C",
        rawDialogue: "C",
        timestamp: 1,
        sessionId: "s",
        turnReferences: [2],
        relevanceScore: 0.1,
        rerankScore: 0.2,
      },
    ];

    const randomValues = [0.75, 0.5, 0.25];
    let randomIndex = 0;

    const result = gumbelSoftmaxSample(memories, 2, 0.5, () => {
      const value = randomValues[randomIndex];
      randomIndex = (randomIndex + 1) % randomValues.length;
      return value ?? 0.5;
    });

    expect(result.selectedMemories).toHaveLength(2);
    expect(result.selectedIndices).toHaveLength(2);
    expect(result.allProbabilities).toHaveLength(3);

    const probabilitySum = result.allProbabilities.reduce(
      (sum, probability) => sum + probability,
      0
    );
    expect(probabilitySum).toBeCloseTo(1, 10);

    for (const probability of result.allProbabilities) {
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(1);
    }
  });
});
