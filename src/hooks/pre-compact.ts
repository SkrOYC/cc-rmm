/**
 * PreCompact Hook Handler
 *
 * Two phases:
 * 1. Extract new memories before compaction (prevents memory loss)
 * 2. Re-inject existing memories into context (keeps memory accessible)
 *
 * This hook fires before context compaction occurs, either manually (/compact)
 * or automatically when context is full.
 */

import { extractMemories } from "../memory/extractor.ts";
import { loadMemories } from "../memory/loader.ts";
import { readHooksInput } from "./utils.ts";

async function main() {
  const input = await readHooksInput();

  if (!input) {
    console.error("PreCompact: No input received");
    process.exit(1);
  }

  const trigger = input.trigger ?? "unknown";
  console.error(
    `PreCompact: Processing ${trigger} compaction for session ${input.session_id}`
  );

  try {
    // Phase 1: Extract new memories before they get compacted away
    if (input.transcript_path) {
      console.error("PreCompact: Phase 1 - Extracting memories");
      const extracted = await extractMemories(
        input.transcript_path,
        input.session_id
      );
      console.error(`PreCompact: Extracted ${extracted.length} new memories`);
    }

    // Phase 2: Re-inject existing memories for the compacted context
    console.error("PreCompact: Phase 2 - Re-injecting memories");
    const memories = await loadMemories(input.cwd, input.session_id);

    if (memories.length > 0) {
      // Format memories for injection
      const context = formatMemories(memories);
      // Output JSON for Claude Code to process as additionalContext
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreCompact",
            additionalContext: context,
          },
        })
      );
    }

    process.exit(0);
  } catch (error) {
    console.error(`PreCompact: Error: ${error}`);
    // Don't exit with error - we don't want to block Claude
    process.exit(0);
  }
}

function formatMemories(memories: string[]): string {
  if (memories.length === 0) {
    return "";
  }

  return `<memories>
${memories.join("\n\n")}
</memories>`;
}

main();
