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
                {['Starter', 'Pro', 'Pro+', 'Teams'].map((plan) => (
                  <th key={plan}>
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Basic Git operations', true, true, true, true],
                ['Terminal access', true, true, true, true],
                ['Dark mode', true, true, true, true],
                ['Commit history viewer', true, true, true, true],
                ['AI commit messages', false, true, true, true],
                ['Database tools', false, true, true, true],
                ['Diff viewer', false, true, true, true],
                ['Stash operations', false, true, true, true],
                ['Debug monitor', false, true, true, true],
                ['Visual merge resolver', false, false, true, true],
                ['Interactive rebase UI', false, false, true, true],
                ['SQL import/export', false, false, true, true],
                ['Selective restore', false, false, true, true],
                ['Team license dashboard', false, false, false, true],
                ['Admin controls', false, false, false, true],
                ['Audit logs', false, false, false, true],
                ['Dedicated support (4h)', false, false, false, true],
              ].map(([label, starter, pro, proPlus, teams]) => (
                <tr key={label as string}>
                  <td>{label}</td>
                  {[starter, pro, proPlus, teams].map((v, idx) => (
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
