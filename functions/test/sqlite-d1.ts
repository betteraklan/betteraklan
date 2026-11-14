/// <reference types="node" />
/**
 * Real-SQL D1 stand-in for tests, backed by sql.js (SQLite compiled to
 * WebAssembly, so it runs on every Node version CI uses).
 *
 * Unlike MockD1Database, this runs the actual SQL (CHECK constraints,
 * ?N params, datetime()), so it can load real migration files.
 * Covers prepare/bind/all/first/run/batch, which is what the APIs use.
 *
 *   const db = (await SqliteD1.create()).loadSql('db/migrations/005_x.sql');
 */
import { readFileSync } from 'node:fs';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

let sqlJs: ReturnType<typeof initSqlJs> | null = null;

type Row = Record<string, SqlValue>;

function toSql(p: unknown): SqlValue {
  if (p === undefined || p === null) return null;
  if (typeof p === 'boolean') return p ? 1 : 0;
  return p as SqlValue;
}

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
  private params: SqlValue[] = [];
  constructor(
    private owner: SqliteD1,
    private sql: string
  ) {}

  bind(...params: unknown[]) {
    this.params = params.map(toSql);
    return this;
  }

  async all<T>() {
    const results = this.owner.query(this.sql, this.params) as T[];
    return { results, success: true, meta: meta() };
  }

  async first<T>(): Promise<T | null> {
    return (this.owner.query(this.sql, this.params)[0] as T) ?? null;
  }

  async run() {
    const changes = this.owner.execute(this.sql, this.params);
    return { results: [], success: true, meta: meta(changes) };
  }
}

export class SqliteD1 {
  private constructor(private readonly db: Database) {}

  static async create(): Promise<SqliteD1> {
    sqlJs ??= initSqlJs();
    return new SqliteD1(new (await sqlJs).Database());
  }

  /** Execute one or more SQL files (e.g. migrations) in order. */
  loadSql(...paths: string[]): this {
    for (const path of paths) this.db.exec(readFileSync(path, 'utf8'));
    return this;
  }

  /** Run a query and return every row as an object. */
  query(sql: string, params: unknown[] = []): Row[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params.map(toSql));
      const rows: Row[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  /** Run a write and return the number of rows changed. */
  execute(sql: string, params: unknown[] = []): number {
    this.db.run(sql, params.map(toSql));
    return this.db.getRowsModified();
  }

  // --- D1Database surface -------------------------------------------------

  prepare(sql: string) {
    return new Statement(this, sql);
  }

  async batch(statements: Statement[]) {
    return Promise.all(statements.map(s => s.all()));
  }

  async exec(sql: string) {
    this.db.exec(sql);
    return { count: 1, duration: 0 };
  }
}
