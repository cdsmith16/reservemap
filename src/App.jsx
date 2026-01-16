export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center p-8">
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/25 mb-6">
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            MyMap
          </h1>
          <p className="text-emerald-400 font-medium text-lg">
            Dining benefits, visualized.
          </p>
        </div>
        
        <blockquote className="relative">
          <p className="text-xl md:text-2xl text-slate-200 leading-relaxed font-light relative z-10">
            Some reservations websites have no map view, making it hard to plan and take advantage of credit card dining benefits.
          </p>
          <p className="text-xl md:text-2xl text-white font-medium mt-4">
            So I made one.
          </p>
        </blockquote>
        
        <div className="mt-8 flex items-center justify-center gap-8 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span>Map View</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <span>Card Benefits</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span>Easy Planning</span>
          </div>
        </div>

        {/* Credit Card Programs Table */}
        <div className="mt-12 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Credit Card Dining Programs</h2>
          <div className="overflow-hidden rounded-lg border border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Program</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Credit</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Status</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800/50 divide-y divide-slate-700">
                <tr className="bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                  <td className="px-6 py-4">
                    <a
                      href="https://www.opentable.com/chase-sapphire-reserve"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 font-medium underline"
                    >
                      OpenTable Chase Reserve
                    </a>
                  </td>
                  <td className="px-6 py-4 text-slate-200">$300/year</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
                      Available
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <a
                      href="https://resy.com/amex-access"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-300"
                    >
                      Resy Amex Program
                    </a>
                  </td>
                  <td className="px-6 py-4 text-slate-200">$400/year</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-400">
                      Coming Soon
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="w-full max-w-6xl mt-12 mb-8">
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700/50">
          <iframe 
            src="https://www.google.com/maps/d/u/0/embed?mid=1gKXH8gQj2dczP9wmntuCPwwFNGDnFOQ&ehbc=2E312F&noprof=1" 
            width="100%" 
            height="600"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            title="MyMap - Dining Benefits Map"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-8 mb-4 text-center">
        <p className="text-slate-400 text-sm">
          built with{' '}
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Claude
          </a>
        </p>
      </footer>
    </div>
  );
}
