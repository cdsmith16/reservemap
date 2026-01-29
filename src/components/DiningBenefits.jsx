export default function DiningBenefits() {
  return (
    <div id="dining-benefits" className="bg-slate-800/50 border-t border-slate-700/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <a href="#dining-benefits" className="group inline-block mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
            Dining Benefits
            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 text-lg">#</span>
          </h2>
        </a>
        <p className="text-slate-300 text-lg mb-8">
          <strong className="text-white">Got a Chase Sapphire Reserve or Amex Platinum?</strong> Here's how to unlock dining credits at participating restaurants.
        </p>

        {/* Step 1 */}
        <h3 className="text-xl font-semibold text-white mb-4">1. Enroll Your Card</h3>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 pr-4 text-slate-400 font-medium">Card</th>
                <th className="py-3 pr-4 text-slate-400 font-medium">Platform</th>
                <th className="py-3 text-slate-400 font-medium">Steps</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="py-3 pr-4 text-white font-medium">Chase Sapphire Reserve</td>
                <td className="py-3 pr-4">
                  <a href="https://www.opentable.com/c/sapphire-reserve-dining/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                    OpenTable
                  </a>
                </td>
                <td className="py-3 text-slate-300">Sign in &rarr; Complete eligibility check &rarr; Add your CSR</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-3 pr-4 text-white font-medium">Amex Platinum</td>
                <td className="py-3 pr-4">
                  <a href="https://resy.com/global-dining-access" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 transition-colors">
                    Resy
                  </a>
                </td>
                <td className="py-3 text-slate-300">Sign in &rarr; Add your eligible Platinum Card</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Step 2 */}
        <h3 className="text-xl font-semibold text-white mb-3">2. Dine at a Participating Restaurant</h3>
        <p className="text-slate-300 mb-8">
          Pay with your enrolled card. The credit posts automatically as a statement reimbursement.
        </p>

        {/* Step 3 */}
        <h3 className="text-xl font-semibold text-white mb-3">3. Walk-Ins Are Fine</h3>
        <p className="text-slate-300 mb-4">
          Neither ToS requires an advance reservation for the credit—only that you're enrolled and pay with your card at a participating restaurant:
        </p>

        <blockquote className="border-l-2 border-blue-500/50 pl-4 mb-4">
          <p className="text-slate-400 text-sm">
            <a href="https://www.opentable.com/legal/terms-and-conditions/visa-dining-program#chase" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Chase/Visa Dining Program ToS
            </a>: Cardholders must "complete the eligibility check to verify their Eligible Chase Card" and "add their Eligible Chase Card to their OpenTable account to redeem the Sapphire Reserve OpenTable Benefit."
          </p>
        </blockquote>

        <blockquote className="border-l-2 border-amber-500/50 pl-4 mb-4">
          <p className="text-slate-400 text-sm">
            <a href="https://blog.resy.com/gda-terms/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Amex GDA ToS
            </a>: "Create a Resy account or log into your existing Resy account and add your eligible Card to your Resy account."
          </p>
        </blockquote>

        <p className="text-slate-300 mb-8">
          Walk-ins work because the credit triggers on payment—not on booking method.
        </p>

        {/* Fine Print */}
        <h3 className="text-xl font-semibold text-white mb-3">Fine Print</h3>
        <p className="text-slate-500 text-sm">
          Chase, OpenTable, American Express, and Resy may modify or discontinue these benefits at any time. <strong className="text-slate-400">ReserveMap is not affiliated with these programs and is not liable</strong> if policies change or credits don't post as expected.
        </p>
      </div>
    </div>
  )
}
