const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function sha256File(absPath) {
  const h = crypto.createHash('sha256')
  const buf = fs.readFileSync(absPath)
  h.update(buf)
  return h.digest('hex')
}

function getLatestVersionFromChangelog() {
  try {
    const repoRootGuess = path.resolve(__dirname, '..', '..', '..')
    const direct = path.join(repoRootGuess, 'Dev-X-Flow-Pro', 'CHANGELOG.md')
    if (fs.existsSync(direct)) {
      const content = fs.readFileSync(direct, 'utf8')
      const match = content.match(/## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}/)
      return match ? match[1] : null
    }

    let dir = __dirname
    for (let i = 0; i < 10; i++) {
      const candidate = path.join(dir, 'Dev-X-Flow-Pro', 'CHANGELOG.md')
      if (fs.existsSync(candidate)) {
        const content = fs.readFileSync(candidate, 'utf8')
        const match = content.match(/## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}/)
        return match ? match[1] : null
      }
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }

    return null
  } catch {
    return null
  }
}

function main() {
  const publicDir = path.resolve(__dirname, 'public')
  const downloadDir = path.join(publicDir, 'download')
  const manifestPath = path.join(downloadDir, 'download-manifest.json')

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true })
  }

  const zipFiles = fs
    .readdirSync(downloadDir)
    .filter((f) => {
      const lower = f.toLowerCase()
      return lower.endsWith('.zip')
    })
    .map((fileName) => {
      const absPath = path.join(downloadDir, fileName)
      const stat = fs.statSync(absPath)
      return {
        fileName,
        absPath,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

  const latest = zipFiles[0]
  const version = getLatestVersionFromChangelog()

  const manifest = latest
    ? {
      fileName: latest.fileName,
      sizeBytes: latest.sizeBytes,
      sizeLabel: formatSize(latest.sizeBytes),
      updatedAt: new Date(latest.mtimeMs).toISOString(),
      version,
      sha256: sha256File(latest.absPath),
    }
    : {
      fileName: null,
      sizeBytes: 0,
      sizeLabel: null,
      updatedAt: new Date().toISOString(),
      version,
      sha256: null,
    }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
}

main()
