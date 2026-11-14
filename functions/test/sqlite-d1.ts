/// <reference types="node" />
/**
 * Real-SQL D1 stand-in for tests, backed by Node's built-in SQLite.
 *
 * Unlike MockD1Database, this runs the actual SQL (CHECK constraints,
 * ?N params, datetime()), so it can load real migration files.
 * Covers prepare/bind/all/first/run/batch, which is what the APIs use.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

type Value = string | number | bigint | null | Uint8Array;

function meta(changes = 0) {
  return {
    duration: 0,
    rows_read: 0,
    rows_written: changes,
    last_row_id: 0,
    changed_db: changes > 0,
    size_after: 0,
    changes,
  };
}

class Statement {
  private params: Value[] = [];
  constructor(
    private db: DatabaseSync,
    private sql: string
  ) {}

  bind(...params: unknown[]) {
    this.params = params.map(p =>
      p === undefined ? null : typeof p === 'boolean' ? Number(p) : (p as Value)
    );
    return this;
  }

  async all<T>() {
    const results = this.db.prepare(this.sql).all(...this.params) as T[];
    return { results, success: true, meta: meta() };
  }

  async first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params);
    return (row as T) ?? null;
  }

  async run() {
    const { changes } = this.db.prepare(this.sql).run(...this.params);
    return { results: [], success: true, meta: meta(Number(changes)) };
  }
}

export class SqliteD1 {
  readonly db = new DatabaseSync(':memory:');

  /** Execute one or more SQL files (e.g. migrations) in order. */
  loadSql(...paths: string[]): this {
    for (const path of paths) this.db.exec(readFileSync(path, 'utf8'));
    return this;
  }

  prepare(sql: string) {
    return new Statement(this.db, sql);
  }

  async batch(statements: Statement[]) {
    return Promise.all(statements.map(s => s.all()));
  }

  async exec(sql: string) {
    this.db.exec(sql);
    return { count: 1, duration: 0 };
  }
}
