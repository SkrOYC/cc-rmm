/**
 * Tests for UserPromptSubmit hook handler
 *
 * Verifies: loads memories, formats additionalContext before each prompt
 */
import { describe, expect, it } from "bun:test";
import { formatMemories } from "../utils.ts";

describe("UserPromptSubmit Hook", () => {
  describe("formatMemories", () => {
    it("should format memories into context block", () => {
      const memories = [
        "User prefers TypeScript strict mode",
        "User likes bun as runtime",
      ];

      const result = formatMemories(memories);

      expect(result).toContain("<memories>");
      expect(result).toContain("User prefers TypeScript strict mode");
      expect(result).toContain("User likes bun as runtime");
      expect(result).toContain("</memories>");
    });

    it("should return empty string for empty memories", () => {
      const result = formatMemories([]);

      expect(result).toBe("");
    });

    it("should join multiple memories with double newline", () => {
      const memories = ["Memory 1", "Memory 2", "Memory 3"];

      const result = formatMemories(memories);

      expect(result).toContain("Memory 1\n\nMemory 2");
      expect(result).toContain("Memory 2\n\nMemory 3");
    });
  });

  describe("Hook output format", () => {
    it("should produce correct additionalContext format", () => {
      const memories = ["Test memory 1", "Test memory 2"];

      const output = {
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: formatMemories(memories),
        },
      };

      const result = JSON.stringify(output);

      expect(result).toContain('"hookEventName":"UserPromptSubmit"');
      expect(result).toContain("<memories>");
      expect(result).toContain("Test memory 1");
    });

    it("should handle single memory", () => {
      const memories = ["Single memory"];

      const output = {
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: formatMemories(memories),
        },
      };

      const result = JSON.stringify(output);

      expect(result).toContain("Single memory");
    });
  });
});
