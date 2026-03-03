/**
 * Claude CLI Adapter - wraps claude -p --output-format json for memory extraction
 *
 * This adapter implements the callModel interface expected by memory extraction
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

/** JSON schema for memory extraction response */
const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    memories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          summary: { type: "string" },
          reference: { type: "array", items: { type: "number" } },
        },
        required: ["summary", "reference"],
      },
    },
  },
  required: ["memories"],
};

/** Default timeout for Claude CLI calls (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Extract memories using Claude CLI
 *
 * @param transcriptPath - Path to the conversation transcript JSONL file
 * @param excludedTurnIds - Turn IDs to exclude from extraction (for deduplication)
 * @returns Extracted memories from the LLM
 */
export async function claudeExtractMemories(
  transcriptPath: string,
  excludedTurnIds: number[] = []
): Promise<{ memories: Array<{ summary: string; reference: number[] }> }> {
  // Read the transcript file
  let transcriptContent: string;
  try {
    transcriptContent = await readFile(transcriptPath, "utf-8");
  } catch {
    throw new Error(`Failed to read transcript file: ${transcriptPath}`);
  }

  // Build the exclusion prompt if there are excluded turns
  const exclusionText =
    excludedTurnIds.length > 0
      ? `\n\nIMPORTANT: Only extract memories from turns NOT already referenced. Skip turns: [${excludedTurnIds.join(", ")}]`
      : "";

  // Build the extraction prompt
  const extractionPrompt = `You are a memory extraction system for a conversational AI assistant.

Analyze this conversation transcript and extract meaningful memories that the user would want to remember across sessions.

Extract memories that capture:
1. User preferences and habits
2. Technical decisions and their rationale
3. Project-specific context and conventions
4. Important facts about the user's work or projects

Return JSON with this schema:
{
  "memories": [
    {
      "summary": "concise personal summary of what was discussed or learned",
      "reference": [turn_id_1, turn_id_2]
    }
  ]
}

If no meaningful memories are found, return: {"memories": []}${exclusionText}

Transcript:
${transcriptContent}`;

  // Call Claude CLI
  const response = await callClaudeCli(extractionPrompt);

  // Parse the JSON response
  return parseClaudeResponse(response);
}

/** Regex to extract JSON from code fences */
const CODE_FENCE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/i;

/**
 * Call Claude CLI with a prompt and return the JSON response
 */
function callClaudeCli(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(
      "claude",
      [
        "-p",
        "--output-format",
        "json",
        "--json-schema",
        JSON.stringify(EXTRACTION_JSON_SCHEMA),
        prompt,
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      process.kill();
      reject(new Error("Claude CLI call timed out after 30 seconds"));
    }, DEFAULT_TIMEOUT_MS);

    process.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0 && stderr) {
        console.error("Claude CLI stderr:", stderr);
      }

      if (code === 0 && stdout) {
        resolve(stdout);
      } else if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      } else {
        reject(new Error("No output from Claude CLI"));
      }
    });

    process.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });
}

/**
 * Parse Claude CLI response, handling various formats
 */
function parseClaudeResponse(response: string): {
  memories: Array<{ summary: string; reference: number[] }>;
} {
  // Try to find and extract JSON from the response
  const trimmed = response.trim();

  // Handle wrapped JSON (code fences, etc.)
  let jsonStr = trimmed;

  // Check for JSON wrapped in code fences
  const codeFenceMatch = trimmed.match(CODE_FENCE_JSON_REGEX);
  if (codeFenceMatch) {
    jsonStr = codeFenceMatch[1].trim();
  }

  // Try to parse the JSON
  try {
    const parsed = JSON.parse(jsonStr);

    // Validate the structure
    if (!(parsed.memories && Array.isArray(parsed.memories))) {
      console.warn(
        "Claude CLI response missing 'memories' array, returning empty"
      );
      return { memories: [] };
    }

    // Validate each memory entry
    const validMemories = parsed.memories.filter(
      (m: unknown): m is { summary: string; reference: number[] } =>
        typeof m === "object" &&
        m !== null &&
        typeof m.summary === "string" &&
        Array.isArray(m.reference) &&
        m.reference.every((ref) => typeof ref === "number")
    );

    return { memories: validMemories };
  } catch {
    console.error(
      "Failed to parse Claude CLI response:",
      response.substring(0, 500)
    );
    throw new Error("Invalid JSON response from Claude CLI");
  }
}

/**
 * Create a callModel function for use with memory extraction
 *
 * This is a higher-order function that returns the callModel implementation
 * bound to a specific transcript and excluded turn IDs
 */
export function createClaudeModelCaller(
  transcriptPath: string,
  excludedTurnIds: number[] = []
): (prompt: string) => Promise<string> {
  return async (_prompt: string): Promise<string> => {
    // The prompt parameter is the base extraction prompt from the algorithm
    // We need to call Claude with the transcript content instead
    const result = await claudeExtractMemories(transcriptPath, excludedTurnIds);
    return JSON.stringify(result);
  };
}
