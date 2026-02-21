import { Link } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'

export function DownloadPage() {
  return (
    <div className="download-page">
      <Navbar />
      <div className="download-container">
        <div className="download-card">
          <div className="icon">🚀</div>
          <h1>Download Dev-X-Flow</h1>
          <p className="version">Version 0.1.0 (Windows Portable)</p>
          <p className="description">
            Experience the future of Git management with Dev-X-Flow. 
            No installation required. Just download and run.
          </p>
          
          <a 
            href="/download/Dev-X-Flow.exe" 
            className="download-button"
            download
          >
            <span>Download for Windows</span>
            <span className="size">77.2 MB</span>
          </a>

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

      <style jsx>{`
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
          align-items: center;
        }

        .download-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(0, 212, 255, 0.1);
          border-radius: 20px;
          padding: 60px;
          max-width: 600px;
          width: 100%;
          text-align: center;
          backdrop-filter: blur(10px);
        }

        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        h1 {
          font-size: 36px;
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .version {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          margin-bottom: 30px;
        }

        .description {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .download-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #00d4ff;
          color: #0a0a0f;
          text-decoration: none;
          padding: 20px 40px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 18px;
          transition: all 0.3s;
          margin-bottom: 40px;
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
          padding-top: 30px;
        }

        .requirements h3 {
          font-size: 16px;
          color: #00d4ff;
          margin-bottom: 15px;
        }

        ul {
          list-style: none;
          padding: 0;
        }

        li {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        li::before {
          content: '•';
          color: #00d4ff;
        }
      `}</style>
    </div>
  )
}
