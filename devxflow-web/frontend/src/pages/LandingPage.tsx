import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ParticleBackground } from '../components/common/ParticleBackground'
import { HeroSection } from '../components/sections/HeroSection'
import { FeaturesSection } from '../components/sections/FeaturesSection'
import { CodeShowcaseSection } from '../components/sections/CodeShowcaseSection'
import { PricingSection } from '../components/sections/PricingSection'

export function LandingPage() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1))
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [location])

  return (
    <>
      <ParticleBackground />
      <HeroSection />
      <FeaturesSection />
      <CodeShowcaseSection />
      <PricingSection />
      
      <footer className="footer">
        <p>&copy; 2026 Dev-X-Flow. All rights reserved.</p>
      </footer>
    </>
  )
}
