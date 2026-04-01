import { Link } from 'react-router-dom'
import { useSEO, faqSchema, breadcrumbSchema } from '../utils/seo'
import { PROGRAMS } from '../data/programs'

const FAQS = [
  {
    q: 'What are credit card dining benefits?',
    a: 'Some premium credit cards offer statement credits for dining at specific restaurants. When you pay with the enrolled card at a qualifying restaurant, the card issuer automatically credits a portion of the charge back to your account. No coupons, no apps to open at the table — just pay normally and see a credit appear on your statement.',
  },
  {
    q: 'Do I need a reservation to get the dining credit?',
    a: 'No. Walk-ins count for both Amex Global Dining Access and Chase Sapphire Reserve dining. The credit triggers based on where you pay and which card you use — not whether you made a reservation. A reservation is a good idea at busy restaurants, but it has nothing to do with the credit.',
  },
  {
    q: 'How do dining credits appear on my statement?',
    a: 'Both programs issue statement credits — a line item that appears on your card statement, reducing your balance. They are not points, gift cards, or cash. Credits typically appear within 2–5 business days of the qualifying charge.',
  },
  {
    q: 'Can I use multiple card dining benefits at the same restaurant?',
    a: 'Only one credit per visit. You can only pay with one card at a time, so only one program\'s credit can apply per visit. If a restaurant appears in both programs, you choose which card to use that day.',
  },
  {
    q: 'Does the restaurant need to know I have these benefits?',
    a: 'No. The credit is handled between you and your card issuer — the restaurant doesn\'t need to do anything differently. Just order, eat, and pay with your enrolled card.',
  },
  {
    q: 'What happens if I pay part of the bill with a different card?',
    a: 'The credit only applies to the amount charged to the enrolled card. If you split payment across cards, only the portion on the qualifying card counts toward the credit.',
  },
  {
    q: 'Do credits apply to the full bill, including tax and tip?',
    a: 'Generally yes — both programs apply credits to the total charge, including tax and tip. The specific terms vary slightly by card; check your cardholder agreement for exact details.',
  },
  {
    q: 'What if I don\'t use my full credit before it resets?',
    a: 'Unused credit expires. Amex GDA resets January 1st; unused amounts from the previous year are gone. Chase travel credits reset on your card anniversary date. There\'s no rollover.',
  },
  {
    q: 'Are these restaurants only bookable online?',
    a: 'No. Both programs work for walk-in dining. Online booking through Resy or OpenTable is convenient but not required to earn the credit.',
  },
  {
    q: 'Is this map official or affiliated with Amex / Chase?',
    a: 'ReserveMap is independent. It\'s a tool to find qualifying restaurants from public data. It is not affiliated with American Express, Chase, Resy, or OpenTable. Always verify restaurant eligibility directly with your card issuer.',
  },
]

const SCHEMA = [
  faqSchema(FAQS),
  breadcrumbSchema([{ name: 'ReserveMap', url: '/' }, { name: 'How It Works' }]),
]

export default function HowItWorksPage() {
  useSEO({
    title: 'How Credit Card Dining Benefits Work | ReserveMap',
    description:
      'Plain-language guide to credit card dining benefits. How Amex GDA and Chase Sapphire Reserve dining credits work, when they apply, and how they show up on your statement.',
    schema: SCHEMA,
  })

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-slate-900/60 border-b border-slate-700/50 px-4 py-2">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors">Map</Link>
            <span>›</span>
            <span className="text-slate-400">How It Works</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            How credit card dining benefits work
          </h1>
          <p className="text-slate-400 text-lg">
            A restaurant is a restaurant. Your card gets you money back at some of them.
            Here's how it actually works.
          </p>
        </div>
      </div>

      {/* The short version */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">The short version</h2>
          <ol className="space-y-3">
            {[
              'Your card has a dining credit (e.g., $200/year for Amex Platinum, $300/year travel credit for Chase Sapphire Reserve).',
              'Certain restaurants have agreed to participate in the program through Resy (for Amex) or OpenTable (for Chase).',
              'You go to one of those restaurants. Reservation optional. Walk-ins count.',
              'You pay with your enrolled card.',
              'A statement credit appears on your account within a few days.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-slate-300 text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Programs at a glance */}
      <div className="border-t border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-white font-semibold text-lg mb-5">The programs on this map</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PROGRAMS.map((p) => (
              <div key={p.id} className={`rounded-xl border p-5 ${p.bgClass} ${p.borderClass}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${p.dotClass}`} />
                  <span className={`font-semibold ${p.colorClass}`}>{p.shortName}</span>
                </div>
                <p className="text-white text-sm font-medium">{p.card}</p>
                <p className="text-slate-400 text-sm mt-1">{p.creditAmount} {p.creditPeriod}</p>
                <p className="text-slate-500 text-xs mt-1">Platform: {p.platform} · Resets: {p.creditReset}</p>
                <Link
                  to={`/programs/${p.slug}`}
                  className={`inline-block mt-3 text-xs ${p.colorClass} hover:opacity-80 transition-opacity`}
                >
                  Full guide →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key insight */}
      <div className="border-t border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold mb-1">You don't need a reservation</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                This is the most common misconception. Both programs apply the credit based on
                which card you pay with — not whether you booked in advance. Walk-ins count.
                The "Reserve" in ReserveMap refers to the card programs (Sapphire <em>Reserve</em>),
                not a booking requirement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-white font-semibold text-lg mb-6">Frequently asked questions</h2>
          <div className="space-y-5">
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-slate-700/50 pb-5 last:border-0 last:pb-0">
                <h3 className="text-white font-medium mb-1.5">{faq.q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-slate-700/50 bg-slate-900/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-slate-300 font-medium mb-4">Find qualifying restaurants</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border bg-amber-500/20 text-amber-300 border-amber-500/50 hover:opacity-90 transition-all"
            >
              Open the map →
            </Link>
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 transition-all"
            >
              Compare programs →
            </Link>
            {PROGRAMS.map((p) => (
              <Link
                key={p.id}
                to={`/programs/${p.slug}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${p.bgClass} ${p.colorClass} ${p.borderClass} hover:opacity-90`}
              >
                {p.shortName} guide →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
