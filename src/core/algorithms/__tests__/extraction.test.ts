import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildExtractionPrompt,
  extractMemories,
  parseTranscriptJsonl,
  type TranscriptTurn,
} from "../memory-extraction.ts";

const tempDirs: string[] = [];

function createTranscriptFile(lines: unknown[]): string {
  const tempDir = mkdtempSync("/tmp/cc-rmm-extract-");
  tempDirs.push(tempDir);

  const path = join(tempDir, "transcript.jsonl");
  const content = lines.map((line) => JSON.stringify(line)).join("\n");
  writeFileSync(path, `${content}\n`, "utf8");

  return path;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("parseTranscriptJsonl", () => {
  it("parses transcript JSONL with turn boundaries", async () => {
    const transcriptPath = createTranscriptFile([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
      { role: "user", message: { content: [{ text: "I love TypeScript" }] } },
      { role: "assistant", content: "Noted" },
    ]);

    const turns = await parseTranscriptJsonl(transcriptPath);

    expect(turns).toEqual<TranscriptTurn[]>([
      { turnId: 0, speaker: "SPEAKER_1", content: "Hello" },
      { turnId: 0, speaker: "SPEAKER_2", content: "Hi there" },
      { turnId: 1, speaker: "SPEAKER_1", content: "I love TypeScript" },
      { turnId: 1, speaker: "SPEAKER_2", content: "Noted" },
    ]);
  });

  it("excludes tool payload blocks from parsed dialogue", async () => {
    const transcriptPath = createTranscriptFile([
      { role: "user", content: "Please run the command" },
      {
        type: "tool_result",
        content:
          "VERY_LARGE_TOOL_PAYLOAD_SHOULD_NOT_BE_INCLUDED_IN_MEMORY_EXTRACTION",
      },
      { role: "assistant", content: "Done. The command succeeded." },
    ]);

    const turns = await parseTranscriptJsonl(transcriptPath);

    expect(turns).toHaveLength(2);
    expect(turns[0]?.content).toContain("Please run the command");
    expect(turns[1]?.content).toContain("Done. The command succeeded.");
    expect(
      turns.some((turn) => turn.content.includes("VERY_LARGE_TOOL_PAYLOAD"))
    ).toBe(false);
  });

  it("derives fallback turn IDs from dialogue lines only", async () => {
    const transcriptPath = createTranscriptFile([
      { role: "user", content: "Question without explicit turn id" },
      { type: "tool_result", content: "non-dialogue payload" },
      { role: "assistant", content: "Answer without explicit turn id" },
    ]);

    const turns = await parseTranscriptJsonl(transcriptPath);

    expect(turns).toEqual<TranscriptTurn[]>([
      {
        turnId: 0,
        speaker: "SPEAKER_1",
        content: "Question without explicit turn id",
      },
      {
        turnId: 0,
        speaker: "SPEAKER_2",
        content: "Answer without explicit turn id",
      },
    ]);
  });
});

describe("extractMemories", () => {
  it("extracts memories with embeddings from transcript", async () => {
    const transcriptPath = createTranscriptFile([
      { role: "user", content: "I prefer TypeScript strict mode" },
      { role: "assistant", content: "We will keep strict mode enabled" },
    ]);

    const memories = await extractMemories(
      {
        transcriptPath,
        projectPath: "/tmp/project",
        sessionId: "session-1",
      },
      {
        callModel: async () =>
          JSON.stringify({
            memories: [
              {
                summary: "User prefers TypeScript strict mode",
                reference: [0],
              },
            ],
          }),
        embedDocuments: async () => [new Array(768).fill(0.1)],
        now: () => 1234,
        generateId: () => "memory-1",
      }
    );

    expect(memories).toHaveLength(1);
    expect(memories[0]?.id).toBe("memory-1");
    expect(memories[0]?.topicSummary).toBe(
      "User prefers TypeScript strict mode"
    );
    expect(memories[0]?.turnReferences).toEqual([0]);
    expect(memories[0]?.embedding).toHaveLength(768);
    expect(memories[0]?.rawDialogue).toContain("SPEAKER_1");
  });

  it("includes excluded-turn prompt and filters seen turns", async () => {
    const transcriptPath = createTranscriptFile([
      { role: "user", content: "Turn zero" },
      { role: "assistant", content: "Ack" },
      { role: "user", content: "Turn one" },
      { role: "assistant", content: "Ack" },
    ]);

    let capturedPrompt = "";

    const turns = await parseTranscriptJsonl(transcriptPath);
    const prompt = buildExtractionPrompt(turns, [0]);
    expect(prompt).toContain("skip turns: [0]");

    const memories = await extractMemories(
      {
        transcriptPath,
        projectPath: "/tmp/project",
        sessionId: "session-2",
        excludedTurnIds: [0],
      },
      {
        callModel: (modelPrompt) => {
          capturedPrompt = modelPrompt;
          return Promise.resolve(
            JSON.stringify({
              memories: [
                { summary: "Old turn", reference: [0] },
                { summary: "New turn", reference: [1] },
              ],
            })
          );
        },
        embedDocuments: (summaries) =>
          Promise.resolve(summaries.map(() => new Array(768).fill(0.05))),
      }
    );

    expect(capturedPrompt).toContain("skip turns: [0]");
    expect(memories).toHaveLength(1);
    expect(memories[0]?.topicSummary).toBe("New turn");
    expect(memories[0]?.turnReferences).toEqual([1]);
  });
});
