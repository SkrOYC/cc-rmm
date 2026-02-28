import type { MemoryEntry } from "../types/memory.ts";

const CODE_FENCE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/i;
const MERGE_INDEX_REGEX = /index\s*(\d+)/;

export interface SimilarMemory {
  id: string;
  topicSummary: string;
}

export type UpdateAction = { action: "Add" } | MergeAction;

export interface MergeAction {
  action: "Merge";
  memoryId: string;
  mergedSummary: string;
}

export interface DecideUpdateDependencies {
  callModel: (prompt: string) => Promise<string>;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildUpdatePrompt(
  historySummaries: string[],
  newSummary: string
): string {
  const numberedHistory = historySummaries
    .map((summary, index) => `${index}: ${summary}`)
    .join("\n");

  return [
    "Decide whether to Add or Merge a newly extracted memory.",
    "Return strict JSON with either:",
    '{"action":"Add"}',
    'or {"action":"Merge","index":<history index>,"merged_summary":"..."}',
    "Existing memories:",
    numberedHistory.length > 0 ? numberedHistory : "(none)",
    `New memory: ${newSummary}`,
  ].join("\n\n");
}

function parseJsonCandidate(response: string): unknown {
  const trimmed = response.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fallback parsing below.
  }

  const fencedMatch = trimmed.match(CODE_FENCE_JSON_REGEX);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // Continue to fallback.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  return null;
}

function getStringField(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function getIntegerField(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isInteger(value)) {
      return value;
    }
  }

  return null;
}

function resolveMemoryId(
  record: Record<string, unknown>,
  similarMemories: SimilarMemory[]
): string | null {
  const memoryId = getStringField(record, ["memoryId", "memory_id"]);
  if (memoryId) {
    return memoryId;
  }

  const indexValue = getIntegerField(record, ["index", "targetIndex"]);
  if (indexValue === null) {
    return null;
  }

  return similarMemories[indexValue]?.id ?? null;
}

function resolveMergedSummary(record: Record<string, unknown>): string {
  const mergedSummary = getStringField(record, [
    "mergedSummary",
    "merged_summary",
  ]);

  if (mergedSummary) {
    return normalizeWhitespace(mergedSummary);
  }

  return "(merged summary)";
}

function parseMergeActionFromRecord(
  record: Record<string, unknown>,
  similarMemories: SimilarMemory[]
): MergeAction | null {
  const memoryId = resolveMemoryId(record, similarMemories);
  if (!memoryId) {
    return null;
  }

  return {
    action: "Merge",
    memoryId,
    mergedSummary: resolveMergedSummary(record),
  };
}

function parseSingleActionRecord(
  record: Record<string, unknown>,
  similarMemories: SimilarMemory[]
): UpdateAction | null {
  const actionValue = getStringField(record, ["action", "decision"]);
  if (!actionValue) {
    return null;
  }

  const normalizedAction = actionValue.toLowerCase();
  if (normalizedAction === "add") {
    return { action: "Add" };
  }

  if (normalizedAction === "merge") {
    return parseMergeActionFromRecord(record, similarMemories);
  }

  return null;
}

function parseActionsArray(
  actionsRaw: unknown,
  similarMemories: SimilarMemory[]
): UpdateAction[] {
  if (!Array.isArray(actionsRaw)) {
    return [];
  }

  const actions: UpdateAction[] = [];

  for (const actionItem of actionsRaw) {
    if (!actionItem || typeof actionItem !== "object") {
      continue;
    }

    const parsedAction = parseSingleActionRecord(
      actionItem as Record<string, unknown>,
      similarMemories
    );

    if (parsedAction) {
      actions.push(parsedAction);
    }
  }

  return actions;
}

function parseMergeFromText(
  response: string,
  similarMemories: SimilarMemory[]
): UpdateAction[] | null {
  const normalizedText = response.toLowerCase();
  if (!normalizedText.includes("merge") || similarMemories.length === 0) {
    return null;
  }

  const indexMatch = normalizedText.match(MERGE_INDEX_REGEX);
  if (!indexMatch?.[1]) {
    return null;
  }

  const index = Number.parseInt(indexMatch[1], 10);
  const target = similarMemories[index];

  if (!target) {
    return null;
  }

  return [
    {
      action: "Merge",
      memoryId: target.id,
      mergedSummary: "(merged summary)",
    },
  ];
}

function parseUpdateActionResponse(
  response: string,
  similarMemories: SimilarMemory[]
): UpdateAction[] {
  const parsed = parseJsonCandidate(response);

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;

    const singleAction = parseSingleActionRecord(record, similarMemories);
    if (singleAction) {
      return [singleAction];
    }

    const actionList = parseActionsArray(record.actions, similarMemories);
    if (actionList.length > 0) {
      return actionList;
    }
  }

  const mergeFromText = parseMergeFromText(response, similarMemories);
  if (mergeFromText) {
    return mergeFromText;
  }

  return [{ action: "Add" }];
}

export async function decideUpdateAction(
  newMemory: MemoryEntry,
  similarMemories: SimilarMemory[],
  dependencies: DecideUpdateDependencies
): Promise<UpdateAction[]> {
  if (similarMemories.length === 0) {
    return [{ action: "Add" }];
  }

  const historySummaries = similarMemories.map((memory) => memory.topicSummary);
  const prompt = buildUpdatePrompt(historySummaries, newMemory.topicSummary);
  const response = await dependencies.callModel(prompt);

  return parseUpdateActionResponse(response, similarMemories);
}
