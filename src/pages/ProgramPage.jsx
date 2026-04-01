import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Map from '../components/Map'
import { useSEO, faqSchema, breadcrumbSchema } from '../utils/seo'
import { getProgramBySlug, PROGRAMS } from '../data/programs'
import { citySlug, cityDisplay } from '../utils/seo'

export default function ProgramPage() {
  const { slug } = useParams()
  const program = getProgramBySlug(slug)

  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('')
  const [flyToLocation, setFlyToLocation] = useState(null)

  const schema = useMemo(() => {
    if (!program) return null
    return [
      faqSchema(program.faqs),
      breadcrumbSchema([
        { name: 'ReserveMap', url: '/' },
        { name: 'Programs' },
        { name: program.shortName },
      ]),
    ]
  }, [program])

  useSEO({
    title: program
      ? `${program.name}: How It Works, Restaurants & Credits | ReserveMap`
      : 'Program | ReserveMap',
    description: program
      ? `How to use ${program.name} dining benefits. ${program.creditAmount} ${program.creditPeriod} at ${program.platform} partner restaurants. See every qualifying restaurant.`
      : undefined,
    schema,
  })

  useEffect(() => {
    if (!program) return
    fetch('/data/restaurants.json')
      .then((r) => r.json())
      .then((data) => {
        setRestaurants(data.filter((r) => r.program === program.id))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [program])

  // Top cities for this program
  const topCities = useMemo(() => {
    const map = {}
    restaurants.forEach((r) => {
      if (!r.city) return
      const key = r.city
      if (!map[key]) map[key] = { name: r.city, state: r.state || '', count: 0, lat: r.lat, lon: r.lon }
      map[key].count++
    })
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 20)
  }, [restaurants])

  const filteredRestaurants = useMemo(() => {
    if (!cityFilter) return restaurants
    return restaurants.filter((r) =>
      r.city?.toLowerCase().includes(cityFilter.toLowerCase())
    )
  }, [restaurants, cityFilter])

  const mapFilters = useMemo(() => ({
    amex: program?.id === 'amex',
    chase: program?.id === 'chase',
  }), [program])

  if (!program) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">Program not found</h1>
        <p className="text-slate-400 mb-6">That program slug doesn't match any known card program.</p>
        <Link to="/" className="text-amber-400 hover:text-amber-300 text-sm">← Back to map</Link>
      </div>
    )
  }

  const otherProgram = PROGRAMS.find((p) => p.id !== program.id)

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-slate-900/60 border-b border-slate-700/50 px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors">Map</Link>
            <span>›</span>
            <span className="text-slate-400">{program.shortName}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-slate-800/50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 ${program.bgClass} ${program.colorClass} border ${program.borderClass}`}>
            <span className={`w-2 h-2 rounded-full ${program.dotClass}`} />
            {program.platform}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            {program.name}
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">{program.description}</p>

          {/* Credit summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <StatBox label="Dining credit" value={program.creditAmount} sub={program.creditPeriod} />
            <StatBox label="Resets" value={program.creditReset} />
            <StatBox label="Platform" value={program.platform} />
            <StatBox
              label="Qualifying restaurants"
              value={loading ? '...' : restaurants.length.toLocaleString()}
            />
          </div>
        </div>
      </div>

      {/* How to use */}
      <Section title="How to use it">
        <ol className="space-y-3">
          {program.howToUse.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${program.bgClass} ${program.colorClass}`}>
                {i + 1}
              </span>
              <span className="text-slate-300 text-sm leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <div className={`mt-6 p-4 rounded-lg border ${program.bgClass} ${program.borderClass}`}>
          <p className={`text-sm ${program.colorClass} font-medium mb-1`}>Credit details</p>
          <p className="text-slate-300 text-sm">{program.creditDetails}</p>
        </div>
      </Section>

      {/* Map */}
      <div className="border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-white font-semibold text-lg mb-4">
            {loading ? 'Loading restaurants...' : `${restaurants.length.toLocaleString()} qualifying restaurants`}
          </h2>

          {/* City filter */}
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Filter by city..."
              className="w-48 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            />
            {cityFilter && (
              <button
                onClick={() => setCityFilter('')}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Clear
              </button>
            )}
            <span className="text-slate-500 text-sm">
              {filteredRestaurants.length.toLocaleString()} restaurants
            </span>
          </div>
        </div>

        {/* Map itself */}
        {!loading && (
          <div style={{ height: '420px' }}>
            <Map
              restaurants={filteredRestaurants}
              filters={mapFilters}
              flyToLocation={flyToLocation}
              onFlyComplete={() => setFlyToLocation(null)}
            />
          </div>
        )}
      </div>

      {/* Top cities */}
      {topCities.length > 0 && (
        <Section title={`Top cities for ${program.shortName}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {topCities.map((city) => {
              const slug = citySlug(city.name, city.state)
              return (
                <Link
                  key={slug}
                  to={`/cities/${slug}`}
                  className="flex items-center justify-between px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-colors"
                >
                  <span className="text-slate-300 text-sm truncate">
                    {cityDisplay(city.name, city.state)}
                  </span>
                  <span className={`text-xs ml-2 flex-shrink-0 ${program.colorClass}`}>
                    {city.count}
                  </span>
                </Link>
              )
            })}
          </div>
        </Section>
      )}

      {/* Restaurant list */}
      <Section title="Restaurant list">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRestaurants.slice(0, 90).map((r, i) => (
                <RestaurantRow key={i} restaurant={r} program={program} />
              ))}
            </div>
            {filteredRestaurants.length > 90 && (
              <p className="text-center text-slate-500 text-sm mt-6">
                Showing 90 of {filteredRestaurants.length.toLocaleString()} restaurants.
                Use the map or filter by city to narrow results.
              </p>
            )}
          </>
        )}
      </Section>

      {/* FAQ */}
      <Section title="Frequently asked questions">
        <div className="space-y-4">
          {program.faqs.map((faq, i) => (
            <div key={i} className="border-b border-slate-700/50 pb-4 last:border-0 last:pb-0">
              <h3 className="text-white font-medium mb-1.5">{faq.q}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Compare / cross-link */}
      <div className="border-t border-slate-700/50 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-slate-300 font-medium mb-4">Also on ReserveMap</h2>
          <div className="flex flex-wrap gap-3">
            {otherProgram && (
              <Link
                to={`/programs/${otherProgram.slug}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${otherProgram.bgClass} ${otherProgram.colorClass} ${otherProgram.borderClass} hover:opacity-90`}
              >
                {otherProgram.shortName} guide →
              </Link>
            )}
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 transition-all"
            >
              Compare programs →
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 transition-all"
            >
              How dining credits work →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, sub }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className="text-white font-semibold">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="border-t border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-white font-semibold text-lg mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function RestaurantRow({ restaurant: r, program }) {
  const bookingUrl = r.bookingUrl
    ? r.bookingUrl.includes('?')
      ? `${r.bookingUrl}&ref=reservemap`
      : `${r.bookingUrl}?ref=reservemap`
    : null

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600 transition-colors">
      <p className="text-white text-sm font-medium truncate">{r.name}</p>
      {r.address && <p className="text-slate-500 text-xs mt-0.5 truncate">{r.address}</p>}
      {r.cuisine && <p className="text-slate-600 text-xs mt-0.5">{r.cuisine}</p>}
      <div className="flex items-center gap-2 mt-2">
        {bookingUrl && (
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
            className={`text-xs ${program.colorClass} hover:opacity-80 transition-opacity`}>
            Book →
          </a>
        )}
        {r.website && (
          <a href={r.website} target="_blank" rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
            Website
          </a>
        )}
      </div>
    </div>
  )
}
