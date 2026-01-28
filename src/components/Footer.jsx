export default function Footer() {
  return (
    <footer className="border-t border-slate-700/50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-slate-500 text-sm">
          built with{' '}
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
          >
            Claude
          </a>
        </p>
      </div>
    </footer>
  )
}
