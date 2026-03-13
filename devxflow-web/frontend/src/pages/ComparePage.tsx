export function ComparePage() {
  return (
    <div className="compare-page">
      <div className="compare-container">
        <header className="compare-header">
          <h1>Compare Plans</h1>
          <p>See what you get in each tier.</p>
        </header>

        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                {['Starter', 'Pro', 'Pro+', 'Teams', 'Enterprise'].map((plan) => (
                  <th key={plan}>
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Basic Git operations', true, true, true, true, true],
                ['Terminal access', true, true, true, true, true],
                ['Dark mode', true, true, true, true, true],
                ['Commit history viewer', true, true, true, true, true],
                ['AI commit messages', false, true, true, true, true],
                ['Database tools', false, true, true, true, true],
                ['Diff viewer', false, true, true, true, true],
                ['Stash operations', false, true, true, true, true],
                ['Debug monitor', false, true, true, true, true],
                ['Visual merge resolver', false, false, true, true, true],
                ['Interactive rebase UI', false, false, true, true, true],
                ['SQL import/export', false, false, true, true, true],
                ['Selective restore', false, false, true, true, true],
                ['Team license dashboard', false, false, false, true, true],
                ['Admin controls', false, false, false, true, true],
                ['Audit logs', false, false, false, true, true],
                ['Dedicated support (4h)', false, false, false, true, true],
                ['SSO / SAML', false, false, false, false, true],
                ['On-premise deployment', false, false, false, false, true],
                ['SLA guarantee', false, false, false, false, true],
                ['Dedicated account manager', false, false, false, false, true],
                ['24/7 phone support', false, false, false, false, true],
              ].map(([label, starter, pro, proPlus, teams, enterprise]) => (
                <tr key={label as string}>
                  <td>{label}</td>
                  {[starter, pro, proPlus, teams, enterprise].map((v, idx) => (
                    <td key={idx} className={v ? 'is-yes' : 'is-no'}>
                      {v ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="compare-footnote">
          <p>Prices and limits are shown on the Pricing section. This page compares features only.</p>
        </div>
      </div>
    </div>
  )
}
