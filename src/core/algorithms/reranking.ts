import type { RetrievedMemory } from "../types/memory.ts";
import { matmulVector, residualAdd } from "./matrix.ts";

export interface ScoredMemory extends RetrievedMemory {
  rerankScore: number;
}

export interface SamplingResult {
  allProbabilities: number[];
  selectedIndices: number[];
  selectedMemories: RetrievedMemory[];
}

function assertVector(value: number[], label: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} cannot be empty`);
  }

  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error(`${label}[${index}] must be a finite number`);
    }
  }
}

function assertTransformMatrix(
  transformMatrix: number[][],
  embeddingDimension: number
): void {
  if (transformMatrix.length !== embeddingDimension) {
    throw new Error(
      `Matrix rows (${transformMatrix.length}) must match embedding dimension (${embeddingDimension})`
    );
  }

  for (let rowIndex = 0; rowIndex < transformMatrix.length; rowIndex++) {
    const row = transformMatrix[rowIndex];
    if (!row || row.length !== embeddingDimension) {
      throw new Error(
        `Matrix row ${rowIndex} must have ${embeddingDimension} columns`
      );
    }
  }
}

export function adaptEmbedding(
  embedding: number[],
  transformMatrix: number[][]
): number[] {
  assertVector(embedding, "embedding");
  assertTransformMatrix(transformMatrix, embedding.length);

  const transformed = matmulVector(transformMatrix, embedding);
  return residualAdd(embedding, transformed);
}

export function computeScore(
  queryEmbedding: number[],
  memoryEmbedding: number[]
): number {
  assertVector(queryEmbedding, "queryEmbedding");
  assertVector(memoryEmbedding, "memoryEmbedding");

  if (queryEmbedding.length !== memoryEmbedding.length) {
    throw new Error(
      `Embedding dimension mismatch: ${queryEmbedding.length} vs ${memoryEmbedding.length}`
    );
  }

  let score = 0;

  for (let index = 0; index < queryEmbedding.length; index++) {
    score += (queryEmbedding[index] ?? 0) * (memoryEmbedding[index] ?? 0);
  }

  if (!Number.isFinite(score)) {
    throw new Error("Score overflowed to a non-finite value");
  }

  return score;
}

function softmax(scores: number[], temperature: number): number[] {
  const maxScore = Math.max(...scores);
  const exponentiated = scores.map((score) =>
    Math.exp((score - maxScore) / temperature)
  );

  const denominator = exponentiated.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(denominator) || denominator === 0) {
    return new Array(scores.length).fill(1 / scores.length);
  }

  return exponentiated.map((value) => value / denominator);
}

function sampleGumbel(randomValue: number): number {
  const boundedRandom = Math.min(0.999_999, Math.max(0.000_001, randomValue));
  return -Math.log(-Math.log(boundedRandom));
}

function selectTopIndices(scores: number[], topM: number): number[] {
  return scores
    .map((score, index) => ({ index, score }))
    .sort((left, right) => right.score - left.score)
    .slice(0, topM)
    .map((entry) => entry.index);
}

export function gumbelSoftmaxSample(
  memories: ScoredMemory[],
  topM: number,
  temperature = 0.5,
  randomFn: () => number = Math.random
): SamplingResult {
  if (!Array.isArray(memories) || memories.length === 0 || topM <= 0) {
    return {
      selectedMemories: [],
      allProbabilities: [],
      selectedIndices: [],
    };
  }

  if (temperature <= 0 || !Number.isFinite(temperature)) {
    throw new Error("temperature must be a positive finite number");
  }

  const cappedTopM = Math.min(topM, memories.length);

  const perturbedScores = memories.map((memory) => {
    const gumbelNoise = sampleGumbel(randomFn());
    return memory.rerankScore + gumbelNoise;
  });

  const probabilities = softmax(perturbedScores, temperature);
  const selectedIndices = selectTopIndices(perturbedScores, cappedTopM);

  const selectedMemories = selectedIndices
    .map((index) => memories[index])
    .filter((memory): memory is ScoredMemory => Boolean(memory))
    .map((memory) => ({ ...memory }));

  return {
    selectedMemories,
    allProbabilities: probabilities,
    selectedIndices,
  };
}
