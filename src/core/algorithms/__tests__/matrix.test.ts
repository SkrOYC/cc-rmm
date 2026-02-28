import { describe, expect, it } from "bun:test";
import { add, matmulVector, residualAdd, scale, transpose } from "../matrix.ts";

describe("matmulVector", () => {
  it("computes 768x768 matrix-vector multiplication correctly", () => {
    const dimension = 768;

    const matrix = Array.from({ length: dimension }, (_, rowIndex) => {
      const row = new Array(dimension).fill(0);
      row[rowIndex] = 0.5;
      return row;
    });

    const vector = new Array(dimension).fill(2);
    const result = matmulVector(matrix, vector);

    expect(result).toHaveLength(dimension);
    for (const value of result) {
      expect(value).toBeCloseTo(1, 10);
    }
  });

  it("throws on incompatible dimensions", () => {
    expect(() => matmulVector([[1, 2]], [1])).toThrow();
  });
});

describe("residualAdd", () => {
  it("computes (I + λW)·v residual form", () => {
    const original = [1, 2, 3];
    const transformed = [4, 5, 6];

    expect(residualAdd(original, transformed)).toEqual([5, 7, 9]);
    expect(residualAdd(original, transformed, 0.5)).toEqual([3, 4.5, 6]);
  });
});

describe("transpose", () => {
  it("transposes a matrix", () => {
    expect(
      transpose([
        [1, 2, 3],
        [4, 5, 6],
      ])
    ).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });
});

describe("add", () => {
  it("adds two matrices element-wise", () => {
    expect(
      add(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8],
        ]
      )
    ).toEqual([
      [6, 8],
      [10, 12],
    ]);
  });
});

describe("scale", () => {
  it("scales matrix elements", () => {
    expect(
      scale(
        [
          [1, -2],
          [3, -4],
        ],
        2
      )
    ).toEqual([
      [2, -4],
      [6, -8],
    ]);
  });
});
