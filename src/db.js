import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let cached = null

export function getDb() {
  if (!cached) {
    cached = initSqlJs({ locateFile: () => wasmUrl }).then(async (SQL) => {
      // 种子数据放在 public/ 里按需拉取，不进主包（否则首屏要多下 700 多 KB）。
      // 用 BASE_URL 拼路径，这样部署到任意子目录都能找到。
      const url = new URL('seed.sql', new URL(import.meta.env.BASE_URL, document.baseURI)).href
      const res = await fetch(url)
      if (!res.ok) throw new Error(`种子数据加载失败（HTTP ${res.status}）`)
      const seedSql = await res.text()
      const db = new SQL.Database()
      db.run(seedSql)
      return db
    })
  }
  return cached
}

export function runQuery(db, sql) {
  const text = String(sql || '').trim().replace(/;\s*$/, '')
  if (!text) {
    const err = new Error('empty statement')
    err.code = 'EMPTY'
    throw err
  }
  // 用 prepare + step 而不是 exec：exec 在「零行结果」时返回空数组，
  // 会让「筛选条件写错导致 0 行」被误报成「没有结果表格」。
  const stmt = db.prepare(text)
  try {
    const columns = stmt.getColumnNames()
    const rows = []
    while (stmt.step()) rows.push(stmt.get())
    if (!columns.length) {
      const err = new Error('no result set')
      err.code = 'NO_RESULT'
      throw err
    }
    return { columns, rows }
  } finally {
    stmt.free()
  }
}
