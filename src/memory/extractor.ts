/**
 * Memory Extractor - extracts memories from conversation transcripts
 *
 * This is a stub implementation. Full functionality will be added in later tickets.
 */

/**
 * Extract memories from a transcript file
 *
 * @param _transcriptPath - Path to the transcript JSONL file
 * @param _sessionId - The current session ID
 * @returns Array of extracted memory entries
 */
export function extractMemories(
  _transcriptPath: string,
  _sessionId: string
): Promise<unknown[]> {
  // TODO: Parse transcript JSONL
  // TODO: Call Claude CLI to extract memories
  // TODO: Generate embeddings for each memory
  // TODO: Save to storage

  console.error("extractMemories: Would extract from transcript");

  // For now, return empty - will be implemented in later tickets
  return Promise.resolve([]);
}
