/**
 * SessionEnd Hook Handler
 *
 * Extracts memories from the conversation when a session ends.
 * This hook fires when Claude finishes responding to the final prompt.
 */

import { extractMemories } from "../memory/extractor.ts";
import { readHooksInput } from "./utils.ts";

async function main() {
  const input = await readHooksInput();

  if (!input) {
    console.error("SessionEnd: No input received");
    process.exit(1);
  }

  console.error(
    `SessionEnd: Extracting memories for session ${input.session_id}`
  );

  try {
    // Extract memories from the transcript
    const extracted = await extractMemories(
      input.transcript_path ?? "",
      input.session_id
    );

    console.error(`SessionEnd: Extracted ${extracted.length} memories`);

    // Exit successfully - memories are saved by extractMemories
    process.exit(0);
  } catch (error) {
    console.error(`SessionEnd: Error extracting memories: ${error}`);
    // Don't exit with error - we don't want to block Claude
    process.exit(0);
  }
}

main();
