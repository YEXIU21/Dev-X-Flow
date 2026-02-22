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
    const changelogPath = path.resolve(__dirname, '..', '..', '..', 'Dev-X-Flow-Pro', 'CHANGELOG.md')
    const content = fs.readFileSync(changelogPath, 'utf8')
    const match = content.match(/## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}/)
    return match ? match[1] : null
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

  const exeFiles = fs
    .readdirSync(downloadDir)
    .filter((f) => f.toLowerCase().endsWith('.exe'))
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

  const latest = exeFiles[0]
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
