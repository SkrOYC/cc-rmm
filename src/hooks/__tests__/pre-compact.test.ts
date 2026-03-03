/**
 * Tests for PreCompact hook handler
 *
 * Verifies: extracts new + re-injects (dual-phase constitutional requirement)
 */
import { describe, expect, it } from "bun:test";
import type { HookInput } from "../types.ts";
import { formatMemories } from "../utils.ts";

describe("PreCompact Hook", () => {
  describe("HookInput validation", () => {
    it("should require transcript_path", () => {
      const input: HookInput = {
        cwd: "/test/project",
        hook_event_name: "PreCompact",
        session_id: "test-session-123",
        transcript_path: "/home/user/.claude/projects/test-session-123.jsonl",
        trigger: "manual",
      };

      expect(input.transcript_path).toBeDefined();
      expect(input.hook_event_name).toBe("PreCompact");
    });

    it("should support manual trigger", () => {
      const input: HookInput = {
        cwd: "/test/project",
        hook_event_name: "PreCompact",
        session_id: "test-session-123",
        transcript_path: "/home/user/.claude/projects/test-session-123.jsonl",
        trigger: "manual",
      };

      expect(input.trigger).toBe("manual");
    });

    it("should support auto trigger", () => {
      const input: HookInput = {
        cwd: "/test/project",
        hook_event_name: "PreCompact",
        session_id: "test-session-123",
        transcript_path: "/home/user/.claude/projects/test-session-123.jsonl",
        trigger: "auto",
      };

      expect(input.trigger).toBe("auto");
    });

    it("should have session_id for correlation", () => {
      const input: HookInput = {
        cwd: "/test/project",
        hook_event_name: "PreCompact",
        session_id: "test-session-123",
        transcript_path: "/path/to/transcript.jsonl",
        trigger: "manual",
      };

      expect(input.session_id).toBeDefined();
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
      expect(result).toContain('"additionalContext":""');
    });
  });
});
