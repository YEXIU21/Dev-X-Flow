import { Navbar } from '../components/common/Navbar'
import { useEffect, useState } from 'react'

export function DownloadPage() {
  const [exeFileName, setExeFileName] = useState<string | null>(null)
  const [sizeLabel, setSizeLabel] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const res = await fetch('/download/download-manifest.json', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as {
          fileName?: string | null
          sizeLabel?: string | null
          version?: string | null
        }
        if (!isMounted) return
        setExeFileName(data.fileName ?? null)
        setSizeLabel(data.sizeLabel ?? null)
        setVersion(data.version ?? null)
      } catch {
        // ignore
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="download-page">
      <Navbar />
      <div className="download-container">
        <div className="download-card">
          <div className="icon">🚀</div>
          <h1>Download Dev-X-Flow</h1>
          <p className="version">Version {version ?? '—'} (Windows Portable)</p>
          <p className="description">
            Experience the future of Git management with Dev-X-Flow. 
            No installation required. Just download and run.
          </p>
          
          {exeFileName ? (
            <a
              href={`/download/${exeFileName}`}
              className="download-button"
              download
            >
              <span>Download ZIP for Windows</span>
              <span className="size">{sizeLabel ?? ''}</span>
            </a>
          ) : (
            <div className="download-button" aria-disabled="true">
              <span>Download ZIP for Windows</span>
              <span className="size">Download temporarily unavailable.</span>
            </div>
          )}

          <div className="requirements">
            <h3>System Requirements</h3>
            <ul>
              <li>Windows 10 or later (x64)</li>
              <li>Git 2.0+ installed</li>
              <li>Internet connection for license activation</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .download-page {
          min-height: 100vh;
          background: #0a0a0f;
          color: white;
          font-family: 'JetBrains Mono', monospace;
        }

        .download-container {
          padding: 120px 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 100vh;
        }

        .download-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(0, 212, 255, 0.1);
          border-radius: 20px;
          padding: 40px 30px;
          max-width: 600px;
          width: 100%;
          text-align: center;
          backdrop-filter: blur(10px);
        }

        .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        h1 {
          font-size: 28px;
          color: #00d4ff;
          margin-bottom: 8px;
        }

        .version {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          margin-bottom: 24px;
        }

        .description {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin-bottom: 32px;
          font-size: 15px;
        }

        .download-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #00d4ff;
          color: #0a0a0f;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          transition: all 0.3s;
          margin-bottom: 32px;
        }

        .download-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
        }

        .size {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 4px;
        }

        .requirements {
          text-align: left;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 24px;
        }

        .requirements h3 {
          font-size: 15px;
          color: #00d4ff;
          margin-bottom: 12px;
        }

        ul {
          list-style: none;
          padding: 0;
        }

        li {
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        li::before {
          content: '•';
          color: #00d4ff;
        }

        @media (max-width: 480px) {
          .download-container {
            padding: 100px 16px 40px;
          }
          
          .download-card {
            padding: 30px 20px;
          }
          
          h1 {
            font-size: 24px;
          }
          
          .icon {
            font-size: 40px;
          }
          
          .download-button {
            padding: 14px 24px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  )
}
