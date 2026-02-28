import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { CORE_EMBEDDING_DIMENSION, type MemoryEntry } from "../types/memory.ts";
import { buildExcludedTurnsPrompt } from "./turn-tracking.ts";

const CODE_FENCE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/i;
const DIALOGUE_ROLE_LABELS = new Set([
  "user",
  "human",
  "humanmessage",
  "assistant",
  "ai",
  "aimessage",
]);
const NON_DIALOGUE_ROLE_LABELS = new Set([
  "tool",
  "tool_result",
  "tool_use",
  "function",
  "function_call",
  "function_response",
  "system",
]);
const NON_DIALOGUE_CONTENT_BLOCK_TYPES = new Set([
  "tool_result",
  "tool_use",
  "server_tool_use",
  "server_tool_result",
]);

export interface TranscriptTurn {
  content: string;
  speaker: "SPEAKER_1" | "SPEAKER_2";
  turnId: number;
}

interface ExtractedMemoryCandidate {
  reference: number[];
  summary: string;
}

export interface ExtractMemoriesDependencies {
  callModel: (prompt: string) => Promise<string>;
  embedDocuments: (summaries: string[]) => Promise<number[][]>;
  generateId?: () => string;
  now?: () => number;
}

export interface ExtractMemoriesOptions {
  excludedTurnIds?: number[];
  projectPath: string;
  sessionId: string;
  transcriptPath: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractContentFromUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractContentFromUnknown(item))
      .filter((text) => text.length > 0)
      .join("\n")
      .trim();
  }

  if (!isRecord(value)) {
    return "";
  }

  const contentBlockType =
    typeof value.type === "string" ? value.type.toLowerCase() : null;
  if (
    contentBlockType &&
    NON_DIALOGUE_CONTENT_BLOCK_TYPES.has(contentBlockType)
  ) {
    return "";
  }

  if ("text" in value) {
    return extractContentFromUnknown(value.text);
  }

  if ("content" in value && !("type" in value)) {
    return extractContentFromUnknown(value.content);
  }

  return "";
}

function resolveRoleLabel(parsed: Record<string, unknown>): string | null {
  const messageRecord = isRecord(parsed.message) ? parsed.message : null;

  const label =
    parsed.role ??
    parsed.type ??
    messageRecord?.role ??
    messageRecord?.type ??
    null;

  return typeof label === "string" ? label.toLowerCase() : null;
}

function isDialogueRecord(parsed: Record<string, unknown>): boolean {
  const label = resolveRoleLabel(parsed);

  if (!label) {
    return true;
  }

  if (NON_DIALOGUE_ROLE_LABELS.has(label)) {
    return false;
  }

  return DIALOGUE_ROLE_LABELS.has(label);
}

function resolveContentPayload(parsed: Record<string, unknown>): unknown {
  if (isRecord(parsed.message) && "content" in parsed.message) {
    return parsed.message.content;
  }

  return parsed.content;
}

function normalizeSpeaker(value: unknown): "SPEAKER_1" | "SPEAKER_2" {
  const normalized = String(value ?? "").toLowerCase();

  if (
    normalized === "human" ||
    normalized === "humanmessage" ||
    normalized === "user"
  ) {
    return "SPEAKER_1";
  }

  return "SPEAKER_2";
}

function parseTurnId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function parseTranscriptLine(
  line: string,
  lineIndex: number
): TranscriptTurn | null {
  const parsed = JSON.parse(line) as unknown;
  if (!isRecord(parsed)) {
    return null;
  }

  if (!isDialogueRecord(parsed)) {
    return null;
  }

  const content = extractContentFromUnknown(
    resolveContentPayload(parsed)
  ).trim();
  if (content.length === 0) {
    return null;
  }

  const explicitTurnId =
    parseTurnId(parsed.turn_id) ??
    parseTurnId(parsed.turnId) ??
    parseTurnId(isRecord(parsed.message) ? parsed.message.turn_id : null) ??
    parseTurnId(isRecord(parsed.message) ? parsed.message.turnId : null);

  const turnId = explicitTurnId ?? Math.floor(lineIndex / 2);

  const speaker = normalizeSpeaker(resolveRoleLabel(parsed));

  return {
    turnId,
    speaker,
    content,
  };
}

export async function parseTranscriptJsonl(
  transcriptPath: string
): Promise<TranscriptTurn[]> {
  const fileContent = await readFile(transcriptPath, "utf8");
  const lines = fileContent
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const turns: TranscriptTurn[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (!line) {
      continue;
    }

    try {
      const parsed = parseTranscriptLine(line, lineIndex);
      if (parsed) {
        turns.push(parsed);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown parsing error";
      throw new Error(
        `Invalid transcript JSONL at line ${lineIndex + 1}: ${errorMessage}`
      );
    }
  }

  return turns;
}

function formatTurnsForPrompt(turns: TranscriptTurn[]): string {
  return turns
    .map(
      (turn) => `* Turn ${turn.turnId}:\n  - ${turn.speaker}: ${turn.content}`
    )
    .join("\n");
}

export function buildExtractionPrompt(
  turns: TranscriptTurn[],
  excludedTurnIds: number[] = []
): string {
  const exclusionPrompt = buildExcludedTurnsPrompt(excludedTurnIds);

  const promptSections = [
    "Extract memories from this conversation transcript following the RMM framework.",
    "Return strict JSON with this schema:",
    '{"memories":[{"summary":"concise personal summary","reference":[turn_id_1,turn_id_2]}]}',
    'If no meaningful memories exist, return {"memories":[]}.',
  ];

  if (exclusionPrompt.length > 0) {
    promptSections.push(exclusionPrompt);
  }

  promptSections.push("Transcript:");
  promptSections.push(formatTurnsForPrompt(turns));

  return promptSections.join("\n\n");
}

function parseJsonObjectCandidate(response: string): unknown {
  const trimmed = response.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed === "NO_TRAIT") {
    return { memories: [] };
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
      // Continue to object slicing fallback.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      return null;
    }
  }

  return null;
}

function parseReferences(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is number => Number.isInteger(item) && item >= 0)
    .map((item) => Number(item));
}

function parseExtractionOutput(response: string): ExtractedMemoryCandidate[] {
  const parsed = parseJsonObjectCandidate(response);
  if (!isRecord(parsed)) {
    return [];
  }

  let rawMemories: unknown[] = [];
  if (Array.isArray(parsed.memories)) {
    rawMemories = parsed.memories;
  } else if (Array.isArray(parsed.extracted_memories)) {
    rawMemories = parsed.extracted_memories;
  }

  const extractedMemories: ExtractedMemoryCandidate[] = [];

  for (const item of rawMemories) {
    if (!isRecord(item)) {
      continue;
    }

    const summary = typeof item.summary === "string" ? item.summary.trim() : "";
    const reference = parseReferences(item.reference);

    if (summary.length === 0 || reference.length === 0) {
      continue;
    }

    extractedMemories.push({ summary, reference });
  }

  return extractedMemories;
}

function buildRawDialogue(
  turnMap: Map<number, string[]>,
  references: number[],
  fallbackSummary: string
): string {
  const segments = references
    .map((referenceTurn) => (turnMap.get(referenceTurn) ?? []).join(" ").trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return fallbackSummary;
  }

  return segments.join(" | ");
}

function assertEmbeddingDimension(embedding: number[], index: number): void {
  if (embedding.length !== CORE_EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected ${CORE_EMBEDDING_DIMENSION}-dim embedding at index ${index}, received ${embedding.length}`
    );
  }

  for (const value of embedding) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Embedding index ${index} contains non-finite values`);
    }
  }
}

function filterExcludedCandidates(
  candidates: ExtractedMemoryCandidate[],
  excludedTurnIds: number[]
): ExtractedMemoryCandidate[] {
  if (excludedTurnIds.length === 0) {
    return candidates;
  }

  const excluded = new Set(
    excludedTurnIds.filter(
      (turnId): turnId is number => Number.isInteger(turnId) && turnId >= 0
    )
  );

  return candidates.filter((candidate) =>
    candidate.reference.every((turnId) => !excluded.has(turnId))
  );
}

export async function extractMemories(
  options: ExtractMemoriesOptions,
  dependencies: ExtractMemoriesDependencies
): Promise<MemoryEntry[]> {
  const transcriptTurns = await parseTranscriptJsonl(options.transcriptPath);
  if (transcriptTurns.length === 0) {
    return [];
  }

  const prompt = buildExtractionPrompt(
    transcriptTurns,
    options.excludedTurnIds ?? []
  );
  const response = await dependencies.callModel(prompt);

  const extractedCandidates = filterExcludedCandidates(
    parseExtractionOutput(response),
    options.excludedTurnIds ?? []
  );

  if (extractedCandidates.length === 0) {
    return [];
  }

  const summaries = extractedCandidates.map((candidate) => candidate.summary);
  const embeddings = await dependencies.embedDocuments(summaries);

  if (embeddings.length !== extractedCandidates.length) {
    throw new Error(
      `Embedding mismatch: ${extractedCandidates.length} memories but ${embeddings.length} embeddings`
    );
  }

  const timestamp = dependencies.now?.() ?? Date.now();
  const generateId = dependencies.generateId ?? randomUUID;

  const turnMap = new Map<number, string[]>();
  for (const turn of transcriptTurns) {
    const existing = turnMap.get(turn.turnId) ?? [];
    existing.push(`${turn.speaker}: ${turn.content}`);
    turnMap.set(turn.turnId, existing);
  }

  return extractedCandidates.map((candidate, index) => {
    const embedding = embeddings[index];
    if (!embedding) {
      throw new Error(`Missing embedding at index ${index}`);
    }

    assertEmbeddingDimension(embedding, index);

    return {
      id: generateId(),
      projectPath: options.projectPath,
      topicSummary: candidate.summary,
      rawDialogue: buildRawDialogue(
        turnMap,
        candidate.reference,
        candidate.summary
      ),
      turnReferences: candidate.reference,
      embedding,
      timestamp,
      sessionId: options.sessionId,
    };
  });
}
