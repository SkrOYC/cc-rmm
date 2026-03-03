/**
 * Tests for Claude CLI adapter
 *
 * Verifies: parses valid JSON response, handles malformed JSON, includes excluded turn IDs
 */
import { describe, expect, it } from "bun:test";
import { parseClaudeResponse } from "../claude-cli.ts";

describe("Claude CLI Adapter", () => {
  describe("parseClaudeResponse", () => {
    it("should parse valid JSON response", () => {
      const response =
        '{"memories": [{"summary": "Test memory", "reference": [1, 2]}]}';

      const parsed = parseClaudeResponse(response);

      expect(parsed.memories).toHaveLength(1);
      expect(parsed.memories[0].summary).toBe("Test memory");
      expect(parsed.memories[0].reference).toEqual([1, 2]);
    });

    it("should handle empty memories array", () => {
      const response = '{"memories": []}';

      const parsed = parseClaudeResponse(response);

      expect(parsed.memories).toEqual([]);
    });

    it("should handle malformed JSON gracefully", () => {
      const response = "not valid json";

      expect(() => parseClaudeResponse(response)).toThrow();
    });

    it("should handle JSON wrapped in code fences", () => {
      const response =
        '```json\n{"memories": [{"summary": "Test", "reference": [1]}]}\n```';

      const parsed = parseClaudeResponse(response);

      expect(parsed.memories).toHaveLength(1);
      expect(parsed.memories[0].summary).toBe("Test");
    });

    it("should filter out invalid memory entries missing summary", () => {
      const response =
        '{"memories": [{"summary": "Valid", "reference": [1]}, {"reference": [2]}]}';

      const parsed = parseClaudeResponse(response);

      // Only first memory is valid (has both summary and reference)
      expect(parsed.memories).toHaveLength(1);
      expect(parsed.memories[0].summary).toBe("Valid");
    });

    it("should filter out invalid memory entries missing reference", () => {
      const response =
        '{"memories": [{"summary": "Valid", "reference": [1]}, {"summary": "Also valid"}]}';

      const parsed = parseClaudeResponse(response);

      // Only first memory is valid (has both summary and reference)
      expect(parsed.memories).toHaveLength(1);
    });

    it("should accept memories with both summary and reference", () => {
      const response =
        '{"memories": [{"summary": "First", "reference": [1]}, {"summary": "Second", "reference": [2, 3]}]}';

      const parsed = parseClaudeResponse(response);

      expect(parsed.memories).toHaveLength(2);
      expect(parsed.memories[0].summary).toBe("First");
      expect(parsed.memories[1].summary).toBe("Second");
    });
  });
});
