import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { useSearchParams } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_uancg1j'
const EMAILJS_TEMPLATE_ID = 'template_8j6kmem' // Contact Us template
const EMAILJS_PUBLIC_KEY = 'prslQVSP7JtsOzycN'

export function ContactPage() {
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan')
  const isEnterprise = planParam === 'enterprise'
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: planParam ? `Enterprise Inquiry (${planParam})` : '',
    message: '',
    // Enterprise-specific fields
    company: '',
    phone: '',
    seats: '',
    timeline: '',
    country: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    // Build message with enterprise details for Contact Us template
    let fullMessage = formData.message
    if (isEnterprise) {
      fullMessage += `\n\n--- Enterprise Details ---\nCompany: ${formData.company}\nPhone: ${formData.phone}\nSeats: ${formData.seats}\nTimeline: ${formData.timeline}\nCountry: ${formData.country}`
    }
    
    try {
      // Send email to support
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: fullMessage,
          to_name: 'DevXFlow Support'
        },
        EMAILJS_PUBLIC_KEY
      )
      
      setIsSubmitted(true)
      setFormData({ 
        name: '', 
        email: '', 
        subject: '', 
        message: '',
        company: '',
        phone: '',
        seats: '',
        timeline: '',
        country: ''
      })
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
                
                {isEnterprise && (
                  <>
                    <div className="form-group">
                      <label htmlFor="company">Company Name</label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="seats">Number of Seats</label>
                        <input
                          type="number"
                          id="seats"
                          name="seats"
                          min="1"
                          value={formData.seats}
                          onChange={handleChange}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="timeline">Implementation Timeline</label>
                        <select
                          id="timeline"
                          name="timeline"
                          value={formData.timeline}
                          onChange={handleChange}
                          required
                          disabled={isLoading}
                        >
                          <option value="">Select timeline</option>
                          <option value="immediate">Immediate (within 1 week)</option>
                          <option value="short">Short term (1-4 weeks)</option>
                          <option value="medium">Medium term (1-3 months)</option>
                          <option value="long">Long term (3+ months)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="country">Country/Region</label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </>
                )}
                
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
