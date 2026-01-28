import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-white mb-8">About ReserveMap</h1>

      <div className="prose prose-invert prose-slate max-w-none">
        <p className="text-lg text-slate-300 leading-relaxed mb-8">
          Dining "benefits" are scattered across platforms, each designed to make you feel special.
          ReserveMap consolidates them—not because these restaurants are magical, but because
          finding dinner shouldn't require three apps and marketing knowledge.
        </p>

        <p className="text-xl text-amber-400 font-medium mb-12">
          The luxury is your time.
        </p>

        <div className="border-t border-slate-700/50 pt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Currently Supported Programs</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <span className="w-3 h-3 rounded-full bg-amber-400 mt-1.5" />
              <div>
                <h3 className="font-medium text-white">Amex Global Dining Access</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Access to 8,000+ restaurants across the USA via Resy.
                  Available to eligible American Express cardmembers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <span className="w-3 h-3 rounded-full bg-blue-400 mt-1.5" />
              <div>
                <h3 className="font-medium text-white">Chase Sapphire Reserve</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Nearly 400 partner restaurants on OpenTable across 51 cities.
                  Available to Chase Sapphire Reserve cardmembers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700/50 pt-8 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">A note on "exclusive"</h2>
          <p className="text-slate-400 leading-relaxed">
            The word "exclusive" appears nowhere on this site. Most of these restaurants are
            bookable by anyone—your card just adds perks. The real value is seeing everything
            in one place, on a map, so you can actually plan.
          </p>
        </div>

        <div className="border-t border-slate-700/50 pt-8 mt-8">
          <p className="text-slate-500 text-sm">
            Built by{' '}
            <a
              href="https://github.com/cdsmith16"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              Christian Smith
            </a>
            {' '}with{' '}
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Claude
            </a>
          </p>
        </div>

        <div className="mt-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to the map
          </Link>
        </div>
      </div>
    </div>
  )
}
