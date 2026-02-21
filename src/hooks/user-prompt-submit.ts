/**
 * UserPromptSubmit Hook Handler
 *
 * Loads relevant memories into context before each user prompt.
 * This hook fires when the user submits a prompt, before Claude processes it.
 */
import { loadMemories } from "../memory/loader.ts";
import { formatMemories, readHooksInput } from "./utils.ts";

async function main() {
  const input = await readHooksInput();

  if (!input) {
    console.error("UserPromptSubmit: No input received");
    process.exit(1);
  }

  console.error(
    `UserPromptSubmit: Loading memories for session ${input.session_id}`
  );

  try {
    const memories = await loadMemories(input.cwd, input.session_id);

    if (memories.length > 0) {
      // Format memories for injection into context
      const context = formatMemories(memories);
      // Output JSON for Claude Code to process as additionalContext
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: context,
          },
        })
      );
    }
  } catch (error) {
    console.error(`UserPromptSubmit: Error loading memories: ${error}`);
    // Don't exit with error - we don't want to block Claude
    process.exit(0);
  }
}

main();
