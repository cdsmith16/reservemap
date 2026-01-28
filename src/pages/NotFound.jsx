import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-bold text-white mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-white mb-4">Nothing here.</h2>
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        The page doesn't exist. Neither does the velvet rope.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to the map
      </Link>
    </div>
  )
}
