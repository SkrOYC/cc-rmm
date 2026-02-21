/**
 * Utility functions for hook handlers
 */
import type { HookInput } from "./types.ts";

/**
 * Read and parse the hook input from stdin
 */
export async function readHooksInput(): Promise<HookInput | null> {
  const data = await new Response(Bun.stdin).text();

  if (!data.trim()) {
    return null;
  }

  try {
    return JSON.parse(data) as HookInput;
  } catch {
    return null;
  }
}
