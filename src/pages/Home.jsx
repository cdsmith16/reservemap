import { useState, useEffect, useRef, useMemo } from 'react'
import Map from '../components/Map'

export default function Home() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    amex: true,
    chase: true,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [flyToLocation, setFlyToLocation] = useState(null)
  const searchRef = useRef(null)
  const mapSectionRef = useRef(null)

  // Load restaurant data
  useEffect(() => {
    fetch('/data/restaurants.json')
      .then(res => res.json())
      .then(data => {
        setRestaurants(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load restaurants:', err)
        setLoading(false)
      })
  }, [])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get unique cities with counts
  const cities = useMemo(() => {
    const cityMap = {}
    restaurants.forEach(r => {
      const city = r.city
      if (city) {
        if (!cityMap[city]) {
          cityMap[city] = { name: city, count: 0, lat: r.lat, lon: r.lon, state: r.state }
        }
        cityMap[city].count++
      }
    })
    return Object.values(cityMap).sort((a, b) => b.count - a.count)
  }, [restaurants])

  // Filter cities based on search - show all matching cities, prioritize exact/starts-with matches
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities.slice(0, 15)
    const query = searchQuery.toLowerCase()
    const matches = cities.filter(c => c.name.toLowerCase().includes(query))
    // Sort: exact match first, then starts-with, then contains
    matches.sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aExact = aName === query
      const bExact = bName === query
      const aStarts = aName.startsWith(query)
      const bStarts = bName.startsWith(query)
      if (aExact && !bExact) return -1
      if (bExact && !aExact) return 1
      if (aStarts && !bStarts) return -1
      if (bStarts && !aStarts) return 1
      return b.count - a.count
    })
    return matches.slice(0, 20)
  }, [cities, searchQuery])

  const handleCitySelect = (city) => {
    setSearchQuery(city.name)
    setShowSearchResults(false)
    setFlyToLocation({ lat: city.lat, lon: city.lon, zoom: 12 })
  }

  const scrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const amexCount = restaurants.filter(r => r.program === 'amex').length
  const chaseCount = restaurants.filter(r => r.program === 'chase').length

  return (
    <div className="flex flex-col h-[calc(100vh-64px-73px)]">
      {/* Hero Section */}
      <div className="bg-slate-800/50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
              All your dining benefits. One map.
            </h1>
            <p className="text-slate-400 text-lg mb-6">
              The spreadsheet behind the velvet rope.
            </p>
            <button
              onClick={scrollToMap}
              className="text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
              aria-label="Scroll to map"
            >
              <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div ref={mapSectionRef} className="bg-slate-900/80 border-b border-slate-700/50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          {/* Search */}
          <div ref={searchRef} className="relative flex-shrink-0">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSearchResults(true)
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search city..."
                className="w-40 sm:w-48 pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && filteredCities.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[1001] max-h-64 overflow-y-auto">
                {filteredCities.map((city, i) => (
                  <button
                    key={i}
                    onClick={() => handleCitySelect(city)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                  >
                    <span className="text-white text-sm">{city.name}{city.state ? `, ${city.state}` : ''}</span>
                    <span className="text-slate-500 text-xs">{city.count} places</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Program Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setFilters(f => ({ ...f, amex: !f.amex }))}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                filters.amex
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${filters.amex ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <span className="hidden sm:inline">Amex Global Dining</span>
              <span className="sm:hidden">Amex</span>
              <span className="text-xs opacity-70">({amexCount.toLocaleString()})</span>
            </button>

            <button
              onClick={() => setFilters(f => ({ ...f, chase: !f.chase }))}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                filters.chase
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${filters.chase ? 'bg-blue-400' : 'bg-slate-600'}`} />
              <span className="hidden sm:inline">Chase Sapphire Reserve</span>
              <span className="sm:hidden">Chase</span>
              <span className="text-xs opacity-70">({chaseCount.toLocaleString()})</span>
            </button>
          </div>

          {/* Count */}
          <div className="ml-auto text-slate-500 text-sm">
            {restaurants.filter(r =>
              (r.program === 'amex' && filters.amex) ||
              (r.program === 'chase' && filters.chase)
            ).length.toLocaleString()} restaurants
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4 mx-auto" />
              <p className="text-slate-400">Loading restaurants...</p>
            </div>
          </div>
        ) : (
          <Map
            restaurants={restaurants}
            filters={filters}
            flyToLocation={flyToLocation}
            onFlyComplete={() => setFlyToLocation(null)}
          />
        )}
      </div>
    </div>
  )
}
