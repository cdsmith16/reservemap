import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Map from '../components/Map'
import { useSEO, citySchema, breadcrumbSchema, citySlug, cityDisplay } from '../utils/seo'
import { PROGRAMS } from '../data/programs'

const PROGRAM_META = {
  amex: { label: 'Amex Resy', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/20', borderClass: 'border-amber-500/40', dotClass: 'bg-amber-400' },
  chase: { label: 'Chase OpenTable', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20', borderClass: 'border-blue-500/40', dotClass: 'bg-blue-400' },
}

export default function CityPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [allRestaurants, setAllRestaurants] = useState([])
  const [cityInfo, setCityInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filters, setFilters] = useState({ amex: true, chase: true })
  const [flyToLocation, setFlyToLocation] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'amex' | 'chase'

  // Load city index + restaurants in parallel
  useEffect(() => {
    Promise.all([
      fetch('/data/cities-index.json').then((r) => r.json()),
      fetch('/data/restaurants.json').then((r) => r.json()),
    ])
      .then(([cities, restaurants]) => {
        const city = cities.find((c) => c.slug === slug)
        if (!city) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setCityInfo(city)
        setAllRestaurants(restaurants)
        setLoading(false)
        setFlyToLocation({ lat: city.lat, lon: city.lon, zoom: 12 })
      })
      .catch(() => setLoading(false))
  }, [slug])

  // Restaurants for this city
  const cityRestaurants = useMemo(() => {
    if (!cityInfo) return []
    return allRestaurants.filter((r) => {
      const rSlug = citySlug(r.city, r.state)
      const rSlugNoState = citySlug(r.city)
      return rSlug === slug || rSlugNoState === slug
    })
  }, [allRestaurants, cityInfo, slug])

  const filteredRestaurants = useMemo(() => {
    return cityRestaurants.filter((r) => {
      if (activeFilter === 'amex') return r.program === 'amex'
      if (activeFilter === 'chase') return r.program === 'chase'
      return true
    })
  }, [cityRestaurants, activeFilter])

  // Map filters synced with activeFilter
  const mapFilters = useMemo(() => ({
    amex: activeFilter === 'all' || activeFilter === 'amex',
    chase: activeFilter === 'all' || activeFilter === 'chase',
  }), [activeFilter])

  const display = cityInfo ? cityDisplay(cityInfo.name, cityInfo.state) : ''

  const schema = useMemo(() => {
    if (!cityInfo) return null
    return [
      citySchema(display, cityRestaurants),
      breadcrumbSchema([
        { name: 'ReserveMap', url: '/' },
        { name: 'Cities' },
        { name: display },
      ]),
    ]
  }, [cityInfo, cityRestaurants, display])

  useSEO({
    title: cityInfo
      ? `Restaurants with Credit Card Dining Benefits in ${display} | ReserveMap`
      : 'City | ReserveMap',
    description: cityInfo
      ? `${cityInfo.total} restaurants in ${display} where your credit card dining benefits apply. Filter by Amex Global Dining Access (${cityInfo.amex}) and Chase Sapphire Reserve (${cityInfo.chase}).`
      : undefined,
    schema,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3 mx-auto" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">City not found</h1>
        <p className="text-slate-400 mb-6">No restaurants found for this city in the dataset.</p>
        <Link to="/" className="text-amber-400 hover:text-amber-300 text-sm">
          ← Back to map
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-slate-900/60 border-b border-slate-700/50 px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors">Map</Link>
            <span>›</span>
            <span className="text-slate-400">{display}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Restaurants in {display}
          </h1>
          <p className="text-slate-400">
            {cityInfo.total.toLocaleString()} restaurants where credit card dining benefits apply
          </p>

          {/* Program counts */}
          <div className="flex flex-wrap gap-3 mt-4">
            {cityInfo.amex > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300 font-medium">{cityInfo.amex.toLocaleString()}</span>
                <span className="text-slate-400">Amex Resy</span>
              </div>
            )}
            {cityInfo.chase > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-blue-300 font-medium">{cityInfo.chase.toLocaleString()}</span>
                <span className="text-slate-400">Chase OpenTable</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: 'calc(100vh - 380px)', minHeight: '360px' }}>
        <Map
          restaurants={filteredRestaurants}
          filters={mapFilters}
          flyToLocation={flyToLocation}
          onFlyComplete={() => setFlyToLocation(null)}
        />
      </div>

      {/* Filter + List */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Program filter tabs */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-slate-500 text-sm mr-1">Show:</span>
          {['all', 'amex', 'chase'].map((f) => {
            const labels = { all: 'All programs', amex: 'Amex Resy', chase: 'Chase OpenTable' }
            const colors = {
              all: activeFilter === 'all'
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600',
              amex: activeFilter === 'amex'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600',
              chase: activeFilter === 'chase'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600',
            }
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${colors[f]}`}
              >
                {labels[f]}
              </button>
            )
          })}
          <span className="ml-auto text-slate-500 text-sm">
            {filteredRestaurants.length.toLocaleString()} restaurants
          </span>
        </div>

        {/* Restaurant list */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.slice(0, 120).map((r, i) => {
            const meta = PROGRAM_META[r.program]
            return (
              <div
                key={i}
                className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.name}</p>
                    {r.address && (
                      <p className="text-slate-500 text-xs mt-0.5 truncate">{r.address}</p>
                    )}
                    {r.cuisine && (
                      <p className="text-slate-600 text-xs mt-0.5">{r.cuisine}</p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${meta.bgClass} ${meta.colorClass} ${meta.borderClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {r.bookingUrl && (
                    <a
                      href={r.bookingUrl.includes('?') ? `${r.bookingUrl}&ref=reservemap` : `${r.bookingUrl}?ref=reservemap`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Book →
                    </a>
                  )}
                  {r.website && (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filteredRestaurants.length > 120 && (
          <p className="text-center text-slate-500 text-sm mt-6">
            Showing 120 of {filteredRestaurants.length.toLocaleString()} restaurants. Use the map to explore more.
          </p>
        )}
      </div>

      {/* Related links */}
      <div className="border-t border-slate-700/50 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-slate-300 font-medium mb-4">Learn more</h2>
          <div className="flex flex-wrap gap-3">
            {PROGRAMS.filter((p) => cityInfo[p.id] > 0).map((p) => (
              <Link
                key={p.id}
                to={`/programs/${p.slug}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${p.bgClass} ${p.colorClass} ${p.borderClass} hover:opacity-90`}
              >
                How {p.shortName} works →
              </Link>
            ))}
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 transition-all"
            >
              Compare programs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
