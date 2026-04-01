import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSEO, breadcrumbSchema } from '../utils/seo'
import { PROGRAMS } from '../data/programs'

const COMPARE_SCHEMA = breadcrumbSchema([
  { name: 'ReserveMap', url: '/' },
  { name: 'Compare Programs' },
])

const ROWS = [
  { label: 'Card', key: 'card' },
  { label: 'Annual fee', key: 'annualFee' },
  { label: 'Dining credit', render: (p) => `${p.creditAmount} ${p.creditPeriod}` },
  { label: 'Credit resets', key: 'creditReset' },
  { label: 'Booking platform', key: 'platform' },
  { label: 'No reservation required?', render: () => 'Yes — walk-ins qualify' },
  { label: 'Auto-applies?', render: () => 'Yes — no per-visit activation' },
]

export default function ComparePage() {
  const [counts, setCounts] = useState({ amex: null, chase: null })
  const [topCities, setTopCities] = useState({ amex: [], chase: [] })
  const [sortCol, setSortCol] = useState(null)

  useSEO({
    title: 'Compare Credit Card Dining Programs | ReserveMap',
    description:
      'Side-by-side comparison of Amex Global Dining Access and Chase Sapphire Reserve dining benefits. Annual fees, credit amounts, restaurant counts, platforms.',
    schema: COMPARE_SCHEMA,
  })

  useEffect(() => {
    fetch('/data/restaurants.json')
      .then((r) => r.json())
      .then((data) => {
        const amexRests = data.filter((r) => r.program === 'amex')
        const chaseRests = data.filter((r) => r.program === 'chase')

        // Count top cities per program
        const cityCount = (rests) => {
          const map = {}
          rests.forEach((r) => {
            if (!r.city) return
            map[r.city] = (map[r.city] || 0) + 1
          })
          return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, count]) => ({ name, count }))
        }

        setCounts({ amex: amexRests.length, chase: chaseRests.length })
        setTopCities({ amex: cityCount(amexRests), chase: cityCount(chaseRests) })
      })
  }, [])

  const programs = useMemo(() => {
    return PROGRAMS.map((p) => ({
      ...p,
      restaurantCount: counts[p.id],
    }))
  }, [counts])

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-slate-900/60 border-b border-slate-700/50 px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors">Map</Link>
            <span>›</span>
            <span className="text-slate-400">Compare</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Credit card dining programs, compared
          </h1>
          <p className="text-slate-400 text-lg">
            The facts on Amex GDA and Chase Sapphire Reserve dining benefits.
            No recommendations — just data.
          </p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 pr-4 text-slate-500 text-sm font-medium w-40" />
                {programs.map((p) => (
                  <th key={p.id} className="py-3 px-4 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${p.bgClass} ${p.colorClass} ${p.borderClass} text-sm font-medium`}>
                      <span className={`w-2 h-2 rounded-full ${p.dotClass}`} />
                      {p.shortName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={i} className="border-t border-slate-700/50">
                  <td className="py-3 pr-4 text-slate-500 text-sm">{row.label}</td>
                  {programs.map((p) => (
                    <td key={p.id} className="py-3 px-4 text-center text-white text-sm">
                      {row.render ? row.render(p) : p[row.key]}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Restaurant count row */}
              <tr className="border-t border-slate-700/50">
                <td className="py-3 pr-4 text-slate-500 text-sm">US restaurants</td>
                {programs.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-center">
                    <span className={`text-lg font-semibold ${p.colorClass}`}>
                      {p.restaurantCount !== null
                        ? p.restaurantCount.toLocaleString()
                        : '...'}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-slate-600 text-xs mt-4">
          Annual fees and credit amounts are subject to change. Verify with your card issuer.
        </p>
      </div>

      {/* Coverage */}
      <div className="border-t border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-white font-semibold text-lg mb-6">City coverage</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {programs.map((p) => (
              <div key={p.id}>
                <div className={`flex items-center gap-2 mb-3`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${p.dotClass}`} />
                  <span className={`font-medium text-sm ${p.colorClass}`}>{p.shortName}</span>
                </div>
                <div className="space-y-1.5">
                  {topCities[p.id].map((city) => (
                    <div key={city.name} className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">{city.name}</span>
                      <span className="text-slate-500 text-xs">{city.count} restaurants</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Common questions */}
      <div className="border-t border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-white font-semibold text-lg mb-6">Common questions</h2>
          <div className="space-y-6">
            <Faq
              q="Can I use both cards at the same restaurant?"
              a="If a restaurant is in both programs, you can only use one card per visit. You cannot split the bill to trigger credits from both programs simultaneously."
            />
            <Faq
              q="Which card has more restaurant options?"
              a="Amex Global Dining Access has significantly more participating restaurants. The Chase Sapphire Reserve OpenTable program covers fewer locations but is more concentrated in major cities."
            />
            <Faq
              q="Do I need a reservation to get the credit from either program?"
              a="No — neither program requires a reservation. Walk-ins qualify as long as you pay with the enrolled card. Reservations are recommended at busy restaurants but are not required for the credit."
            />
            <Faq
              q="Can I stack dining rewards with other card perks?"
              a="Yes. Both programs apply credits on top of any points or cash back your card normally earns. The dining credit and points earning happen independently."
            />
            <Faq
              q="Is this the same as OpenTable Dining Rewards or Resy points?"
              a="No. These are separate card-level statement credits, not platform reward points. Amex GDA credits appear as statement credits on your Amex bill. Chase travel credits appear on your Chase statement."
            />
          </div>
        </div>
      </div>

      {/* CTA links */}
      <div className="border-t border-slate-700/50 bg-slate-900/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-slate-300 font-medium mb-4">Explore</h2>
          <div className="flex flex-wrap gap-3">
            {PROGRAMS.map((p) => (
              <Link
                key={p.id}
                to={`/programs/${p.slug}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${p.bgClass} ${p.colorClass} ${p.borderClass} hover:opacity-90`}
              >
                {p.shortName} guide →
              </Link>
            ))}
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 transition-all"
            >
              Open map →
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 transition-all"
            >
              How credits work →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Faq({ q, a }) {
  return (
    <div className="border-b border-slate-700/50 pb-5 last:border-0 last:pb-0">
      <h3 className="text-white font-medium mb-1.5">{q}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
    </div>
  )
}
