export interface SimilarityResult<T> {
  item: T;
  score: number;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index++) {
    const valueA = a[index] ?? 0;
    const valueB = b[index] ?? 0;

    dotProduct += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

export function searchSimilarByCosine<T extends { embedding: number[] }>(
  queryEmbedding: number[],
  items: T[],
  topK: number
): SimilarityResult<T>[] {
  if (topK <= 0 || items.length === 0) {
    return [];
  }

  return items
    .map((item) => ({
      item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}
