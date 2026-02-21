/**
 * Hook event types
 */
export type HookEvent =
  | "UserPromptSubmit"
  | "SessionEnd"
  | "PreCompact"
  | "SessionStart"
  | "Stop";

export interface HookInput {
  custom_instructions?: string;
  cwd: string;
  hook_event_name: HookEvent;
  session_id: string;
  transcript_path?: string;
  trigger?: string;
}
