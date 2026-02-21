import { useState, FormEvent } from 'react'
import { Navbar } from '../components/common/Navbar'

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitted(true)
      setIsLoading(false)
      setFormData({ name: '', email: '', subject: '', message: '' })
    }, 1500)
  }

  return (
    <div className="contact-page">
      <Navbar />
      
      <div className="contact-container">
        <div className="contact-header">
          <h1>Contact Us</h1>
          <p>Get in touch with the Dev-X-Flow-Pro team</p>
        </div>
        
        <div className="contact-content">
          <div className="contact-info">
            <div className="info-card">
              <h3>Email</h3>
              <p>support@devxflowpro.com</p>
            </div>
            
            <div className="info-card">
              <h3>Response Time</h3>
              <p>Within 24 hours</p>
            </div>
            
            <div className="info-card">
              <h3>Support</h3>
              <p>Technical support and license inquiries</p>
            </div>
          </div>
          
          <div className="contact-form-container">
            {isSubmitted ? (
              <div className="success-message">
                <h3>Message Sent!</h3>
                <p>Thank you for contacting us. We'll get back to you soon.</p>
                <button 
                  className="btn"
                  onClick={() => setIsSubmitted(false)}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  ></textarea>
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .contact-page {
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
        }
        
        /* Main Content */
        .contact-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 120px 20px 60px;
        }
        
        .contact-header {
          text-align: center;
          margin-bottom: 60px;
        }
        
        .contact-header h1 {
          font-size: 48px;
          margin-bottom: 15px;
          color: var(--accent);
        }
        
        .contact-header p {
          color: var(--text-secondary);
          font-size: 18px;
        }
        
        .contact-content {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 60px;
          align-items: start;
        }
        
        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        
        .info-card {
          background: var(--bg-secondary);
          padding: 30px;
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.1);
          transition: all 0.3s;
        }
        
        .info-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        
        .info-card h3 {
          color: var(--accent);
          margin-bottom: 10px;
          font-size: 18px;
        }
        
        .info-card p {
          color: var(--text-secondary);
          line-height: 1.6;
        }
        
        .contact-form-container {
          background: var(--bg-secondary);
          padding: 40px;
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.1);
        }
        
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          color: var(--text-primary);
          font-weight: 500;
          font-size: 14px;
        }
        
        .form-group input,
        .form-group textarea {
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          transition: all 0.3s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        
        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: var(--text-secondary);
          opacity: 0.5;
        }
        
        .btn {
          padding: 14px 32px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
        }
        
        .btn-primary {
          background: var(--accent);
          color: var(--bg-primary);
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px var(--accent-glow);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .success-message {
          text-align: center;
          padding: 40px;
        }
        
        .success-message h3 {
          color: var(--success);
          font-size: 24px;
          margin-bottom: 15px;
        }
        
        .success-message p {
          text-align: center;
        }
        
        .info-item h3 {
          color: var(--accent);
          margin-bottom: 10px;
          font-size: 18px;
        }
        
        .info-item p {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .back-link {
          text-align: center;
          margin-top: 30px;
        }
        
        .back-link a {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.3s;
        }
        
        .back-link a:hover {
          color: var(--accent);
        }
        
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
            gap: 0;
          }
          
          .contact-info {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .header h1 {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  )
}
