/**
 * Utility functions for hook handlers
 */
import type { HookInput } from "./types.ts";

/**
 * Read and parse the hook input from stdin
 */
export async function readHooksInput(): Promise<HookInput | null> {
  try {
    const data = await new Response(Bun.stdin).text();

    if (!data.trim()) {
      return null;
    }

    return JSON.parse(data) as HookInput;
  } catch {
    return null;
  }
}

/**
 * Format memories for context injection
 */
export function formatMemories(memories: string[]): string {
  if (memories.length === 0) {
    return "";
  }

  return `<memories>
${memories.join("\n\n")}
</memories>`;
}
