/**
 * Memory Loader - retrieves and formats memories for context injection
 *
 * This is a stub implementation. Full functionality will be added in later tickets.
 */

/**
 * Load relevant memories for the current context
 *
 * @param _projectPath - The project directory path
 * @param _sessionId - The current session ID
 * @returns Array of memory summaries for context injection
 */
export function loadMemories(
  _projectPath: string,
  _sessionId: string
): Promise<string[]> {
  // TODO: Implement semantic search with embeddings
  // TODO: Apply reranking with W_q, W_m matrices

  // For now, return empty - will be implemented in later tickets
  return Promise.resolve([]);
}
