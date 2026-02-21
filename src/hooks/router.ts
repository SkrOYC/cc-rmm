/**
 * Hook event router - determines which hook is firing
 */
import type { HookEvent } from "./types.ts";

export function getHookEvent(): HookEvent | null {
  // Claude Code sends JSON via stdin with hook_event_name
  // The hook handlers parse this directly in utils.ts
  // This function is a placeholder for future routing needs
  return null;
}
