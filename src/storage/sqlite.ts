/**
 * SQLite storage implementation for the RMM plugin
 */
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import type { IStorage } from "./interfaces.ts";
import type {
  CitationRecord,
  MemoryEntry,
  RerankerState,
  SearchResult,
} from "./types.ts";

/**
 * Get the database path for a project
 */
function getDbPath(projectPath: string): string {
  return `${projectPath}/.cc-rmm/memory.db`;
}

/**
 * Ensure the .cc-rmm directory exists for a project
 */
function ensureStorageDir(projectPath: string): void {
  const dir = `${projectPath}/.cc-rmm`;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Create the database schema
 */
function createSchema(db: Database): void {
  // Enable foreign key enforcement
  db.exec("PRAGMA foreign_keys = ON;");

  // Enable WAL mode for better performance
  db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      project_path TEXT NOT NULL,
      summary TEXT NOT NULL,
      raw_dialogue TEXT NOT NULL,
      turn_references TEXT,
      embedding BLOB,
      session_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_path);

    CREATE TABLE IF NOT EXISTS weights (
      project_path TEXT PRIMARY KEY,
      w_query BLOB NOT NULL,
      w_memory BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      project_path TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      useful INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (memory_id) REFERENCES memories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_citations_project ON citations(project_path);
    CREATE INDEX IF NOT EXISTS idx_citations_session ON citations(session_id);
  `);
}

/**
 * SQLite storage implementation
 */
export class SQLiteStorage implements IStorage {
  private dbs: Map<string, Database> = new Map();

  private getDb(projectPath: string): Database {
    const existing = this.dbs.get(projectPath);
    if (existing) {
      return existing;
    }

    const dbPath = getDbPath(projectPath);
    const db = new Database(dbPath);
    createSchema(db);
    this.dbs.set(projectPath, db);
    return db;
  }

  async initDatabase(projectPath: string): Promise<void> {
    // Ensure the .cc-rmm directory exists
    ensureStorageDir(projectPath);
    const db = this.getDb(projectPath);
    createSchema(db);
  }

  async getMemories(projectPath: string): Promise<MemoryEntry[]> {
    const db = this.getDb(projectPath);
    const rows = db
      .query(
        `SELECT id, summary, raw_dialogue, turn_references, embedding,
                created_at, session_id
         FROM memories WHERE project_path = ?`
      )
      .all(projectPath) as Array<{
      id: string;
      summary: string;
      raw_dialogue: string;
      turn_references: string | null;
      embedding: string | null;
      created_at: number;
      session_id: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      topicSummary: row.summary,
      rawDialogue: row.raw_dialogue,
      turnReferences: row.turn_references
        ? JSON.parse(row.turn_references)
        : [],
      embedding: row.embedding ? JSON.parse(row.embedding) : [],
      timestamp: row.created_at,
      sessionId: row.session_id,
    }));
  }

  async saveMemory(memory: MemoryEntry): Promise<void> {
    const db = this.getDb(memory.projectPath);
    db.query(
      `INSERT INTO memories (id, project_path, summary, raw_dialogue,
                            turn_references, embedding, session_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      memory.id,
      memory.projectPath,
      memory.topicSummary,
      memory.rawDialogue,
      JSON.stringify(memory.turnReferences),
      JSON.stringify(memory.embedding),
      memory.sessionId,
      memory.timestamp,
      memory.timestamp
    );
  }

  async mergeMemory(
    projectPath: string,
    id: string,
    topicSummary: string
  ): Promise<void> {
    ensureStorageDir(projectPath);
    const db = this.getDb(projectPath);
    db.query(
      "UPDATE memories SET summary = ?, updated_at = ? WHERE id = ?"
    ).run(topicSummary, Date.now(), id);
  }

  async searchSimilar(
    projectPath: string,
    embedding: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const memories = await this.getMemories(projectPath);

    // Compute cosine similarity for each memory
    const results: SearchResult[] = memories
      .map((memory) => {
        const similarity = cosineSimilarity(embedding, memory.embedding);
        return { memory, score: similarity };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  async getWeights(projectPath: string): Promise<RerankerState | null> {
    const db = this.getDb(projectPath);
    const row = db
      .query(
        "SELECT w_query, w_memory, updated_at FROM weights WHERE project_path = ?"
      )
      .get(projectPath) as
      | {
          w_query: string;
          w_memory: string;
          updated_at: number;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      weights: {
        queryTransform: JSON.parse(row.w_query),
        memoryTransform: JSON.parse(row.w_memory),
      },
      config: {
        topK: 10,
        topM: 3,
        temperature: 1.0,
        learningRate: 0.01,
        baseline: 0.5,
      },
    };
  }

  async saveWeights(
    projectPath: string,
    weights: RerankerState
  ): Promise<void> {
    const db = this.getDb(projectPath);
    const now = Date.now();

    db.query(
      `INSERT OR REPLACE INTO weights (project_path, w_query, w_memory, updated_at)
       VALUES (?, ?, ?, ?)`
    ).run(
      projectPath,
      JSON.stringify(weights.weights.queryTransform),
      JSON.stringify(weights.weights.memoryTransform),
      now
    );
  }

  async saveCitation(citation: CitationRecord): Promise<void> {
    const db = this.getDb(citation.projectPath);
    db.query(
      `INSERT INTO citations (id, project_path, memory_id, session_id, useful, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      citation.id,
      citation.projectPath,
      citation.memoryId,
      citation.sessionId,
      citation.useful ? 1 : 0,
      citation.createdAt
    );
  }

  async getCitations(projectPath: string): Promise<CitationRecord[]> {
    const db = this.getDb(projectPath);
    const rows = db
      .query(
        `SELECT id, project_path, memory_id, session_id, useful, created_at
         FROM citations WHERE project_path = ?`
      )
      .all(projectPath) as Array<{
      id: string;
      project_path: string;
      memory_id: string;
      session_id: string;
      useful: number;
      created_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      projectPath: row.project_path,
      memoryId: row.memory_id,
      sessionId: row.session_id,
      useful: row.useful === 1,
      createdAt: row.created_at,
    }));
  }
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}
