import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type LinkRecord = {
  id: number;
  code: string;
  target_url: string;
  created_at: string;
  expires_at: string | null;
  clicks: number;
  active: number;
};

export type CreateRecord = {
  code: string;
  targetUrl: string;
  expiresAt: string | null;
};

export class LinkRepository {
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(path.dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    this.initialize();
  }

  private initialize(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        target_url TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT,
        clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
      ) STRICT;

      CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY,
        link_id INTEGER NOT NULL,
        visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        referrer TEXT,
        user_agent TEXT,
        FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_links_created ON links(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_visits_link_date ON visits(link_id, visited_at DESC);
    `);
  }

  create(input: CreateRecord): LinkRecord {
    const statement = this.database.prepare(
      "INSERT INTO links (code, target_url, expires_at) VALUES (?, ?, ?) RETURNING *"
    );
    return statement.get(input.code, input.targetUrl, input.expiresAt) as LinkRecord;
  }

  findByCode(code: string): LinkRecord | null {
    const statement = this.database.prepare("SELECT * FROM links WHERE code = ?");
    return (statement.get(code) as LinkRecord | undefined) ?? null;
  }

  list(limit: number): LinkRecord[] {
    const statement = this.database.prepare("SELECT * FROM links ORDER BY id DESC LIMIT ?");
    return statement.all(limit) as LinkRecord[];
  }

  codeExists(code: string): boolean {
    return this.database.prepare("SELECT 1 FROM links WHERE code = ?").get(code) !== undefined;
  }

  recordVisit(linkId: number, referrer: string | null, userAgent: string | null): void {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("UPDATE links SET clicks = clicks + 1 WHERE id = ?").run(linkId);
      this.database.prepare(
        "INSERT INTO visits (link_id, referrer, user_agent) VALUES (?, ?, ?)"
      ).run(linkId, referrer, userAgent);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  remove(code: string): boolean {
    return Number(this.database.prepare("DELETE FROM links WHERE code = ?").run(code).changes) > 0;
  }

  dailyStats(linkId: number): Array<{ date: string; clicks: number }> {
    return this.database.prepare(`
      SELECT substr(visited_at, 1, 10) AS date, COUNT(*) AS clicks
      FROM visits
      WHERE link_id = ? AND visited_at >= datetime('now', '-30 days')
      GROUP BY substr(visited_at, 1, 10)
      ORDER BY date
    `).all(linkId) as Array<{ date: string; clicks: number }>;
  }

  close(): void {
    this.database.close();
  }
}
