import { describe, expect, it } from "bun:test";
import { createEmbeddingService, EMBEDDING_DIMENSION } from "../nomic.ts";

function l2Norm(vector: number[]): number {
  const sumSquares = vector.reduce((sum, value) => sum + value * value, 0);
  return Math.sqrt(sumSquares);
}

describe("nomic embedding service", () => {
  it("embedQuery returns a normalized 768-dim vector", async () => {
    const base = Array.from({ length: EMBEDDING_DIMENSION }, (_, index) =>
      Math.sin(index / 10)
    );
    const service = createEmbeddingService(async (_text) => ({
      data: Float32Array.from(base),
      dims: [1, EMBEDDING_DIMENSION],
    }));

    const result = await service.embedQuery("hello world");

    expect(result).toHaveLength(EMBEDDING_DIMENSION);
    expect(l2Norm(result)).toBeCloseTo(1, 6);
  });

  it("embedDocument returns a normalized 768-dim vector", async () => {
    const base = Array.from({ length: EMBEDDING_DIMENSION }, (_, index) =>
      Math.cos(index / 10)
    );
    const service = createEmbeddingService(async (_text) => ({
      data: Float32Array.from(base),
      dims: [1, EMBEDDING_DIMENSION],
    }));

    const result = await service.embedDocument("hello world");

    expect(result).toHaveLength(EMBEDDING_DIMENSION);
    expect(l2Norm(result)).toBeCloseTo(1, 6);
  });
});
