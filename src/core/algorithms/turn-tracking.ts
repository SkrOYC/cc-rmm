import type { MemoryEntry } from "../types/memory.ts";

export interface TurnReferenced {
  turnReferences: number[];
}

export function getReferencedTurnIds(memories: TurnReferenced[]): number[] {
  const uniqueTurnIds = new Set<number>();

  for (const memory of memories) {
    for (const turnId of memory.turnReferences) {
      if (Number.isInteger(turnId) && turnId >= 0) {
        uniqueTurnIds.add(turnId);
      }
    }
  }

  return [...uniqueTurnIds].sort((left, right) => left - right);
}

export function filterExtractedMemories<T extends TurnReferenced>(
  extractedMemories: T[],
  referencedTurnIds: Iterable<number>
): T[] {
  const referenced = new Set<number>();
  for (const turnId of referencedTurnIds) {
    if (Number.isInteger(turnId) && turnId >= 0) {
      referenced.add(turnId);
    }
  }

  return extractedMemories.filter((memory) => {
    for (const turnId of memory.turnReferences) {
      if (referenced.has(turnId)) {
        return false;
      }
    }

    return true;
  });
}

export function buildExcludedTurnsPrompt(turnIds: number[]): string {
  const uniqueTurnIds = [...new Set(turnIds)]
    .filter((turnId) => Number.isInteger(turnId) && turnId >= 0)
    .sort((left, right) => left - right);

  if (uniqueTurnIds.length === 0) {
    return "";
  }

  return `skip turns: [${uniqueTurnIds.join(", ")}]`;
}

export function withTurnExclusionsPrompt(
  basePrompt: string,
  memories: MemoryEntry[]
): string {
  const referencedTurnIds = getReferencedTurnIds(memories);
  const exclusionPrompt = buildExcludedTurnsPrompt(referencedTurnIds);

  if (exclusionPrompt.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}\n\n${exclusionPrompt}`;
}
