export function FeaturesSection() {
  const features = [
    {
      icon: "🤖",
      title: "AI-Powered Commits",
      description: "Generate intelligent commit messages with GPT-4, Claude, Gemini, and more. Stop writing \"fix stuff\" and start writing professional commit history."
    },
    {
      icon: "🐛",
      title: "Real-Time Debugging",
      description: "Monitor Laravel logs with live updates. Error highlighting, stack traces, and instant notifications when things go wrong."
    },
    {
      icon: "🗄️",
      title: "Database Management",
      description: "Connect to MySQL, PostgreSQL, SQL Server, SQLite. Run queries, manage schemas, export data. Your database command center."
    },
    {
      icon: "📊",
      title: "Git Visualization",
      description: "Beautiful commit graphs, branch visualization, and interactive rebase. Understand your repo's history at a glance."
    },
    {
      icon: "⚡",
      title: "One-Click Sync",
      description: "Stage → Commit → Merge → Push → Pull in one action. Our \"Sync to Main\" button saves you from repetitive git commands."
    },
    {
      icon: "🎨",
      title: "Dark Mode Native",
      description: "Built for developers who prefer the dark side. Eye-friendly color scheme with syntax highlighting that pops."
    }
  ]

  return (
    <section className="features" id="features">
      <div className="section-title">
        <h2>Developer-First Tools</h2>
        <p>Everything you need to supercharge your workflow</p>
      </div>
      
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
