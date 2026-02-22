const fs = require('fs')
const path = require('path')
const https = require('https')

// Alternative repository for downloading EXE (when local is LFS pointer)
const ALT_REPO_BASE = 'https://raw.githubusercontent.com/codeexsenpai-cmd/Dev-X-Flow/master/devxflow-web/frontend/public'

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function isGitLfsPointerFile(absPath) {
  try {
    const fd = fs.openSync(absPath, 'r')
    try {
      const buf = Buffer.alloc(256)
      const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0)
      const head = buf.subarray(0, bytesRead).toString('utf8')
      return head.includes('git-lfs.github.com/spec')
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    return false
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    https.get(url, { headers: { 'User-Agent': 'Dev-X-Flow-Builder' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        https.get(res.headers.location, { headers: { 'User-Agent': 'Dev-X-Flow-Builder' } }, (redirectRes) => {
          redirectRes.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve()
          })
        }).on('error', reject)
      } else if (res.statusCode === 200) {
        res.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      } else {
        reject(new Error(`HTTP ${res.statusCode}`))
      }
    }).on('error', reject)
  })
}

async function tryDownloadFromAltRepo(fileName, downloadDir) {
  const url = `${ALT_REPO_BASE}/download/${fileName}`
  const destPath = path.join(downloadDir, fileName)
  
  console.log(`Attempting download from alt repo: ${url}`)
  
  try {
    await downloadFile(url, destPath)
    const stat = fs.statSync(destPath)
    
    // Verify it's not an LFS pointer
    if (isGitLfsPointerFile(destPath)) {
      fs.unlinkSync(destPath)
      throw new Error('Downloaded file is LFS pointer')
    }
    
    console.log(`Downloaded ${fileName} from alt repo (${formatSize(stat.size)})`)
    return {
      fileName,
      sizeBytes: stat.size,
      mtimeMs: stat.mtimeMs,
      isLfsPointer: false,
    }
  } catch (err) {
    // Clean up partial download
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath)
    }
    throw err
  }
}

async function main() {
  const publicDir = path.resolve(__dirname, 'public')
  const downloadDir = path.join(publicDir, 'download')
  const manifestPath = path.join(downloadDir, 'download-manifest.json')

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true })
  }

  // Check local EXE files
  const exeFiles = fs
    .readdirSync(downloadDir)
    .filter((f) => f.toLowerCase().endsWith('.exe'))
    .map((fileName) => {
      const absPath = path.join(downloadDir, fileName)
      const stat = fs.statSync(absPath)

      const isLfsPointer = isGitLfsPointerFile(absPath)
      return {
        fileName,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
        isLfsPointer,
      }
    })
    .filter((f) => !f.isLfsPointer)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

  let latest = exeFiles[0]

  // If no valid local EXE, try downloading from alternative repo
  if (!latest) {
    console.log('No valid local EXE found. Trying alternative repo...')
    
    // Try common EXE names
    const candidates = ['Dev-X-Flow-Setup.exe', 'Dev-X-Flow.exe', 'Dev-X-Flow 0.1.0.exe']
    
    for (const fileName of candidates) {
      try {
        latest = await tryDownloadFromAltRepo(fileName, downloadDir)
        break // Success, stop trying
      } catch (err) {
        console.log(`Failed to download ${fileName}: ${err.message}`)
      }
    }
  }

  const manifest = latest
    ? {
        fileName: latest.fileName,
        sizeBytes: latest.sizeBytes,
        sizeLabel: formatSize(latest.sizeBytes),
        updatedAt: new Date(latest.mtimeMs).toISOString(),
        reason: null,
      }
    : {
        fileName: null,
        sizeBytes: 0,
        sizeLabel: null,
        updatedAt: new Date().toISOString(),
        reason:
          'No downloadable EXE found (or only Git LFS pointer files present). Ensure Git LFS is fetched in your deployment environment.',
      }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log('Download manifest generated:', manifestPath)
  if (latest) {
    console.log('Available file:', latest.fileName, `(${formatSize(latest.sizeBytes)})`)
  } else {
    console.log('Warning: No EXE file available for download')
  }
}

main().catch(console.error)
