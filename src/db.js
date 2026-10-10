import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let cached = null

/**
 * 取练习数据：优先下 gzip 版（约 120KB）在浏览器里解压，失败再退回未压缩版（约 796KB）。
 * GitHub Pages 之类的静态托管不会压缩 .sql，直接下 796KB 在手机上很慢。
 */
async function loadSeedSql() {
  const base = new URL(import.meta.env.BASE_URL, document.baseURI)
  if (typeof DecompressionStream === 'function') {
    try {
      const res = await fetch(new URL('seed.sql.gz', base).href)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const bytes = new Uint8Array(buf)
        // 服务器可能已经加了 Content-Encoding: gzip（浏览器会透明解压），
        // 也可能原样下发 gzip。看文件头判断，两种情况都能处理。
        const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b
        const text = isGzip
          ? await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
          : new TextDecoder().decode(bytes)
        if (text && text.length > 1000) return text
      }
    } catch {
      /* 落到未压缩版本 */
    }
  }
  const res = await fetch(new URL('seed.sql', base).href)
  if (!res.ok) throw new Error(`练习数据加载失败（HTTP ${res.status}）`)
  return res.text()
}

export function getDb() {
  if (!cached) {
    cached = initSqlJs({ locateFile: () => wasmUrl }).then(async (SQL) => {
      // 种子数据放在 public/ 里按需拉取，不进主包（否则首屏要多下 700 多 KB）。
      // 用 BASE_URL 拼路径，这样部署到任意子目录都能找到。
      const seedSql = await loadSeedSql()
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
