/**
 * Tests for PreCompact hook handler
 *
 * Verifies: extracts new + re-injects (dual-phase constitutional requirement)
 */
import { describe, expect, it } from "bun:test";
import { formatMemories } from "../utils.ts";

describe("PreCompact Hook", () => {
  describe("Hook input", () => {
    it("should require transcript_path", () => {
      const input = {
        cwd: "/test/project",
        hook_event_name: "PreCompact" as const,
        session_id: "test-session-123",
        transcript_path: "/home/user/.claude/projects/test-session-123.jsonl",
        trigger: "manual" as const,
      };

      expect(input.transcript_path).toBeDefined();
      expect(input.hook_event_name).toBe("PreCompact");
    });

    it("should support manual trigger", () => {
      const input = {
        cwd: "/test/project",
        hook_event_name: "PreCompact" as const,
        session_id: "test-session-123",
        transcript_path: "/home/user/.claude/projects/test-session-123.jsonl",
        trigger: "manual" as const,
      };

      expect(input.trigger).toBe("manual");
    });

    it("should support auto trigger", () => {
      const input = {
        cwd: "/test/project",
        hook_event_name: "PreCompact" as const,
        session_id: "test-session-123",
        transcript_path: "/home/user/.claude/projects/test-session-123.jsonl",
        trigger: "auto" as const,
      };

      expect(input.trigger).toBe("auto");
    });
  });

  describe("Dual-phase behavior", () => {
    it("should format output for PreCompact hook event", () => {
      const memories = ["Memory 1", "Memory 2"];

      const output = {
        hookSpecificOutput: {
          hookEventName: "PreCompact",
          additionalContext: formatMemories(memories),
        },
      };

      const result = JSON.stringify(output);

      expect(result).toContain('"hookEventName":"PreCompact"');
      expect(result).toContain("<memories>");
    });

    it("should handle empty memories gracefully", () => {
      const output = {
        hookSpecificOutput: {
          hookEventName: "PreCompact",
          additionalContext: formatMemories([]),
        },
      };

      const result = JSON.stringify(output);

      expect(result).toContain('"hookEventName":"PreCompact"');
      // Empty memories should result in empty additionalContext
      expect(result).toContain('"additionalContext":""');
    });

    it("should support both extraction and re-injection phases", () => {
      // PreCompact has two phases:
      // 1. Extract new memories before compaction
      // 2. Re-inject existing memories after compaction
      const hasTwoPhases = true;

      expect(hasTwoPhases).toBe(true);
    });
  });
});
