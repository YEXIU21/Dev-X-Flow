const fs = require('fs')
const path = require('path')

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
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
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

  const latest = exeFiles[0]

  const manifest = latest
    ? {
        fileName: latest.fileName,
        sizeBytes: latest.sizeBytes,
        sizeLabel: formatSize(latest.sizeBytes),
        updatedAt: new Date(latest.mtimeMs).toISOString(),
      }
    : {
        fileName: null,
        sizeBytes: 0,
        sizeLabel: null,
        updatedAt: new Date().toISOString(),
      }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log('Download manifest generated:', manifestPath)
  if (latest) {
    console.log('Available file:', latest.fileName, `(${formatSize(latest.sizeBytes)})`)
  } else {
    console.log('Warning: No EXE file available for download')
  }
}

main()
