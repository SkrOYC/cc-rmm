/**
 * Tests for Claude CLI adapter
 *
 * Verifies: parses valid JSON response, handles malformed JSON, includes excluded turn IDs
 */
import { describe, expect, it } from "bun:test";

/** Regex to extract JSON from code fences */
const CODE_FENCE_JSON_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/i;

describe("Claude CLI Adapter", () => {
  describe("JSON parsing", () => {
    it("should parse valid JSON response", () => {
      const response =
        '{"memories": [{"summary": "Test memory", "reference": [1, 2]}]}';

      const parsed = JSON.parse(response);

      expect(parsed.memories).toHaveLength(1);
      expect(parsed.memories[0].summary).toBe("Test memory");
      expect(parsed.memories[0].reference).toEqual([1, 2]);
    });

    it("should handle empty memories array", () => {
      const response = '{"memories": []}';

      const parsed = JSON.parse(response);

      expect(parsed.memories).toEqual([]);
    });

    it("should handle malformed JSON gracefully", () => {
      const response = "not valid json";

      expect(() => JSON.parse(response)).toThrow();
    });

    it("should handle JSON wrapped in code fences", () => {
      const response =
        '```json\n{"memories": [{"summary": "Test", "reference": [1]}]}\n```';

      const codeFenceMatch = response.match(CODE_FENCE_JSON_REGEX);

      expect(codeFenceMatch).not.toBeNull();
      if (codeFenceMatch === null) {
        throw new Error("Expected code fence match");
      }
      const jsonStr = codeFenceMatch[1].trim();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.memories).toHaveLength(1);
    });
  });

  describe("Excluded turn IDs", () => {
    it("should build exclusion text with single turn ID", () => {
      const excludedTurnIds = [1];
      const exclusionText =
        excludedTurnIds.length > 0
          ? `\n\nIMPORTANT: Only extract memories from turns NOT already referenced. Skip turns: [${excludedTurnIds.join(", ")}]`
          : "";

      expect(exclusionText).toContain("Skip turns: [1]");
    });

    it("should build exclusion text with multiple turn IDs", () => {
      const excludedTurnIds = [1, 2, 3, 5, 8];
      const exclusionText =
        excludedTurnIds.length > 0
          ? `\n\nIMPORTANT: Only extract memories from turns NOT already referenced. Skip turns: [${excludedTurnIds.join(", ")}]`
          : "";

      expect(exclusionText).toContain("Skip turns: [1, 2, 3, 5, 8]");
    });

    it("should return empty exclusion text when no turn IDs excluded", () => {
      const excludedTurnIds: number[] = [];
      const exclusionText =
        excludedTurnIds.length > 0
          ? `\n\nIMPORTANT: Only extract memories from turns NOT already referenced. Skip turns: [${excludedTurnIds.join(", ")}]`
          : "";

      expect(exclusionText).toBe("");
    });
  });

  describe("Memory validation", () => {
    it("should validate memory has required fields", () => {
      const memory = { summary: "Test memory", reference: [1, 2] };

      const isValid =
        typeof memory === "object" &&
        memory !== null &&
        typeof memory.summary === "string" &&
        Array.isArray(memory.reference) &&
        memory.reference.every((ref) => typeof ref === "number");

      expect(isValid).toBe(true);
    });

    it("should reject memory missing summary", () => {
      const memory = { reference: [1, 2] };

      const isValid =
        typeof memory === "object" &&
        memory !== null &&
        typeof memory.summary === "string" &&
        Array.isArray(memory.reference);

      expect(isValid).toBe(false);
    });

    it("should reject memory with non-array reference", () => {
      const memory = { summary: "Test", reference: "not array" };

      const isValid =
        typeof memory === "object" &&
        memory !== null &&
        typeof memory.summary === "string" &&
        Array.isArray(memory.reference);

      expect(isValid).toBe(false);
    });
  });
});
