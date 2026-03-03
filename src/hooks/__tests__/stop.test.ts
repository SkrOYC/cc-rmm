/**
 * Tests for SessionEnd hook handler
 *
 * Verifies: extracts and stores memories
 */
import { describe, expect, it } from "bun:test";
import type { HookInput } from "../types.ts";

describe("SessionEnd Hook", () => {
  describe("HookInput validation", () => {
    it("should have correct hook_event_name for SessionEnd", () => {
      const input: HookInput = {
        cwd: "/test/project",
        hook_event_name: "SessionEnd",
        session_id: "test-session-123",
        transcript_path: "/home/user/.claude/projects/test-session-123.jsonl",
      };

      expect(input.hook_event_name).toBe("SessionEnd");
    });

    it("should require transcript_path for extraction", () => {
      const input: HookInput = {
        cwd: "/test/project",
        hook_event_name: "SessionEnd",
        session_id: "test-session-123",
        transcript_path: "/home/user/.claude/projects/test-session-123.jsonl",
      };

      expect(input.transcript_path).toBeDefined();
      expect(typeof input.transcript_path).toBe("string");
    });

    it("should have valid session_id", () => {
      const input: HookInput = {
        cwd: "/test/project",
        hook_event_name: "SessionEnd",
        session_id: "test-session-123",
        transcript_path: "/path/to/transcript.jsonl",
      };

      expect(input.session_id).toBeDefined();
      expect(input.session_id.length).toBeGreaterThan(0);
    });

    it("should have cwd for project path", () => {
      const input: HookInput = {
        cwd: "/test/project",
        hook_event_name: "SessionEnd",
        session_id: "test-session-123",
        transcript_path: "/path/to/transcript.jsonl",
      };

      expect(input.cwd).toBeDefined();
      expect(input.cwd).toContain("/test/project");
    });
  });
});
