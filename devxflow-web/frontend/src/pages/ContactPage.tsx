import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { useSearchParams } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'

// EmailJS configuration - replace with your actual IDs from emailjs.com
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'

export function ContactPage() {
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: planParam ? `Enterprise Inquiry (${planParam})` : '',
    message: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
          to_name: 'DevXFlow Support'
        },
        EMAILJS_PUBLIC_KEY
      )
      
      setIsSubmitted(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      console.error('EmailJS error:', err)
      setError('Failed to send message. Please try again or email us directly at support@devxflow.com')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="contact-page">
      <Navbar />
      
      <div className="contact-container">
        <div className="contact-header">
          <h1>Contact DevXFlow Support</h1>
          <p>Get in touch with the Dev-X-Flow team</p>
        </div>
        
        <div className="contact-content">
          <div className="contact-info">
            <div className="info-card">
              <h3>Email</h3>
              <p>support@devxflow.com</p>
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
                {error && <div className="error-message">{error}</div>}
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
    </div>
  )
}
