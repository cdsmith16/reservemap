import { useState, useEffect } from 'react'
import Map from '../components/Map'

export default function Home() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    amex: true,
    chase: true,
  })
  const [showHero, setShowHero] = useState(true)

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

  const amexCount = restaurants.filter(r => r.program === 'amex').length
  const chaseCount = restaurants.filter(r => r.program === 'chase').length

  return (
    <div className="flex flex-col h-[calc(100vh-64px-73px)]">
      {/* Hero Section - Collapsible */}
      {showHero && (
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
                onClick={() => setShowHero(false)}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Hide intro ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900/80 border-b border-slate-700/50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 text-sm font-medium">Filter by program:</span>

            <button
              onClick={() => setFilters(f => ({ ...f, amex: !f.amex }))}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                filters.amex
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${filters.amex ? 'bg-amber-400' : 'bg-slate-600'}`} />
              Amex Global Dining
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
              Chase Sapphire Reserve
              <span className="text-xs opacity-70">({chaseCount.toLocaleString()})</span>
            </button>
          </div>

          {!showHero && (
            <button
              onClick={() => setShowHero(true)}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Show intro ↓
            </button>
          )}

          <div className="text-slate-500 text-sm">
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
          <Map restaurants={restaurants} filters={filters} />
        )}
      </div>
    </div>
  )
}
