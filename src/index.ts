/**
 * CC-RMM: Reflective Memory Management Plugin for Claude Code
 *
 * This is the main entry point that routes hook events to their handlers.
 * Note: Currently hooks are invoked directly. This router is a placeholder.
 */
import { getHookEvent } from "./hooks/router.ts";

const hookEvent = getHookEvent();

if (!hookEvent) {
  // Router is a placeholder - hooks are called directly
  process.exit(0);
}

console.error(`CC-RMM: Processing ${hookEvent} hook`);
