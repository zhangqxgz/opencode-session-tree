// Reads conversation directories straight from OpenCode's local SQLite store.
// Prefer bun:sqlite (the runtime OpenCode ships with); fall back to node:sqlite
// so the plugin also works when OpenCode is hosted on plain Node 22+.

export type DirStat = {
  directory: string
  sessions: number
  lastActive: number // epoch ms
  latestSessionID: string | null // most recent unarchived session, for jumping
}

type DbHandle = {
  queryAll: (sql: string) => unknown[]
  close: () => void
}

async function openDb(dbPath: string): Promise<DbHandle> {
  // 1) bun:sqlite
  try {
    const mod = await import("bun:sqlite")
    const Database = (mod as { Database: new (path: string, opts?: { readonly?: boolean }) => { query: (sql: string) => { all: () => unknown[] }; close: () => void } }).Database
    const db = new Database(dbPath, { readonly: true })
    return {
      queryAll: (sql) => db.query(sql).all(),
      close: () => db.close(),
    }
  } catch {
    // fall through
  }

  // 2) node:sqlite (Node 22+)
  try {
    const mod = await import("node:sqlite")
    const DatabaseSync = (mod as { DatabaseSync: new (path: string) => { prepare: (sql: string) => { all: () => unknown[] }; close: () => void } }).DatabaseSync
    const db = new DatabaseSync(dbPath)
    return {
      queryAll: (sql) => db.prepare(sql).all(),
      close: () => db.close(),
    }
  } catch {
    // fall through
  }

  throw new Error("No SQLite driver available (tried bun:sqlite and node:sqlite)")
}

export function defaultDbPath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ""
  const xdg = process.env.XDG_DATA_HOME ?? `${home}/.local/share`
  if (process.platform === "darwin") return `${home}/Library/Application Support/opencode/opencode.db`
  if (process.platform === "win32") return `${process.env.LOCALAPPDATA ?? `${home}/AppData/Local`}/opencode/opencode.db`
  return `${xdg}/opencode/opencode.db`
}

// session = V1 schema, session_v2 = V2 schema; union them and group by directory.
// Latest session id comes from the row with MAX(time_updated) per group.
const SQL = `
WITH all_sessions AS (
  SELECT directory, id, time_updated, time_archived FROM session
  UNION ALL
  SELECT directory, id, time_updated, time_archived FROM session_v2
),
active AS (
  SELECT * FROM all_sessions
  WHERE time_archived IS NULL AND directory IS NOT NULL AND directory != ''
),
latest AS (
  SELECT directory, MAX(time_updated) AS lastActive FROM active GROUP BY directory
)
SELECT
  a.directory,
  COUNT(*) AS sessions,
  l.lastActive,
  (SELECT id FROM active a2
    WHERE a2.directory = a.directory
    ORDER BY a2.time_updated DESC LIMIT 1) AS latestSessionID
FROM active a
JOIN latest l ON l.directory = a.directory
GROUP BY a.directory
ORDER BY lastActive DESC
`

export async function loadDirStats(dbPath: string = defaultDbPath()): Promise<DirStat[]> {
  const db = await openDb(dbPath)
  try {
    const rows = db.queryAll(SQL) as Record<string, unknown>[]
    return rows.map((r) => ({
      directory: String(r.directory),
      sessions: Number(r.sessions),
      lastActive: Number(r.lastActive),
      latestSessionID: r.latestSessionID != null ? String(r.latestSessionID) : null,
    }))
  } finally {
    db.close()
  }
}
