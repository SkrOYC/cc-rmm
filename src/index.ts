/**
 * CC-RMM: Reflective Memory Management Plugin for Claude Code
 *
 * This is the main entry point that routes hook events to their handlers.
 */
import { getHookEvent } from "./hooks/router.ts";

const hookEvent = getHookEvent();

if (!hookEvent) {
  console.error("No hook event detected");
  process.exit(1);
}

console.error(`CC-RMM: Processing ${hookEvent} hook`);
