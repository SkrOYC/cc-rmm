export const EMBEDDING_DIMENSION = 768;

const EMBEDDING_MODEL = "Xenova/nomic-embed-text-v1";
const EMBEDDING_OPTIONS = {
  normalize: true,
  pooling: "mean",
} as const;

interface TensorLikeEmbedding {
  data: ArrayLike<number>;
  dims?: number[];
}

type EmbeddingOutput = number[] | number[][] | TensorLikeEmbedding;

export type EmbeddingExtractor = (
  text: string,
  options?: {
    normalize?: boolean;
    pooling?: string;
  }
) => Promise<EmbeddingOutput>;

export interface IEmbeddingService {
  embedDocument(text: string): Promise<number[]>;
  embedQuery(text: string): Promise<number[]>;
}

function assertEmbeddingDimension(vector: number[]): void {
  if (vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected embedding dimension ${EMBEDDING_DIMENSION}, received ${vector.length}`
    );
  }
}

function isTensorLikeEmbedding(value: unknown): value is TensorLikeEmbedding {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    typeof (value as TensorLikeEmbedding).data.length === "number"
  );
}

function isNumberVector(value: number[] | number[][]): value is number[] {
  return value.every((item) => typeof item === "number");
}

function normalizeL2(vector: number[]): number[] {
  const sumSquares = vector.reduce((sum, value) => sum + value * value, 0);
  const norm = Math.sqrt(sumSquares);

  if (norm === 0) {
    throw new Error("Cannot normalize embedding with L2 norm 0");
  }

  return vector.map((value) => value / norm);
}

function toVector(output: EmbeddingOutput): number[] {
  if (Array.isArray(output)) {
    if (output.length === 0) {
      return [];
    }

    if (isNumberVector(output)) {
      return output;
    }

    const first = output[0];
    if (Array.isArray(first)) {
      return first;
    }
  }

  if (isTensorLikeEmbedding(output)) {
    const flat = Array.from(output.data, (value) => Number(value));

    if (!Array.isArray(output.dims) || output.dims.length === 0) {
      return flat;
    }

    if (output.dims.length === 1) {
      return flat;
    }

    const columns = output.dims[1];
    if (typeof columns === "number" && columns > 0) {
      return flat.slice(0, columns);
    }

    return flat;
  }

  throw new Error("Embedding output format is not supported");
}

async function embedText(
  text: string,
  extractor: EmbeddingExtractor
): Promise<number[]> {
  const output = await extractor(text, EMBEDDING_OPTIONS);
  const vector = toVector(output);
  const normalized = normalizeL2(vector);

  assertEmbeddingDimension(normalized);
  return normalized;
}

export function createEmbeddingService(
  extractor: EmbeddingExtractor
): IEmbeddingService {
  return {
    embedDocument: (text) => embedText(text, extractor),
    embedQuery: (text) => embedText(text, extractor),
  };
}

let extractorPromise: Promise<EmbeddingExtractor> | null = null;

function getExtractor(): Promise<EmbeddingExtractor> {
  if (!extractorPromise) {
    extractorPromise = import("@xenova/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", EMBEDDING_MODEL)
    ) as Promise<EmbeddingExtractor>;
  }

  return extractorPromise;
}

const defaultService: IEmbeddingService = {
  async embedDocument(text: string): Promise<number[]> {
    return embedText(text, await getExtractor());
  },
  async embedQuery(text: string): Promise<number[]> {
    return embedText(text, await getExtractor());
  },
};

export function embedDocument(text: string): Promise<number[]> {
  return defaultService.embedDocument(text);
}

export function embedQuery(text: string): Promise<number[]> {
  return defaultService.embedQuery(text);
}
