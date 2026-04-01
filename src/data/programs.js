export const PROGRAMS = [
  {
    id: 'amex',
    slug: 'amex-global-dining-access',
    name: 'Amex Global Dining Access',
    shortName: 'Amex GDA',
    card: 'The Platinum Card® from American Express',
    platform: 'Resy',
    platformUrl: 'https://resy.com',
    enrollmentUrl: 'https://resy.com/amex',
    creditAmount: '$200',
    creditPeriod: 'per calendar year',
    creditReset: 'January 1st each year',
    annualFee: '$695',
    color: 'amber',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500/50',
    dotClass: 'bg-amber-400',
    description:
      'Amex Platinum cardholders get up to $200 in annual dining credits at Resy Global Dining Access partner restaurants. Book through Resy or walk in — just pay with your enrolled card.',
    howToUse: [
      'Enroll your Amex Platinum card at resy.com/amex (one-time setup).',
      'Find a participating restaurant on this map or browse resy.com.',
      'Make a reservation — or just walk in. No reservation required for the credit.',
      'Pay with your enrolled Amex Platinum card.',
      'The statement credit appears within 2–3 business days.',
    ],
    creditDetails:
      'Up to $200 per calendar year. Credits reset January 1st. The credit applies automatically — no per-visit activation needed after initial enrollment.',
    faqs: [
      {
        q: 'Do I need a reservation to get the Amex dining credit?',
        a: 'No. Walk-ins count. The credit applies whenever you pay with your enrolled Amex Platinum at a participating restaurant — reservation or not.',
      },
      {
        q: 'When does the Amex Resy credit reset?',
        a: 'The $200 credit resets each calendar year on January 1st. Unused credit from the previous year does not roll over.',
      },
      {
        q: 'How do I know if a restaurant qualifies for Amex GDA?',
        a: 'Restaurants on this map are confirmed Resy Global Dining Access participants. You can also check resy.com directly — eligible restaurants show the GDA badge on their listing.',
      },
      {
        q: 'Can I use the credit at any Resy restaurant?',
        a: 'No. Only Resy Global Dining Access partner restaurants qualify. Not every restaurant on Resy is a GDA partner. This map shows only the qualifying ones.',
      },
      {
        q: 'Can I stack the Amex GDA credit with other Amex credits?',
        a: 'The $200 GDA credit is separate from other Amex Platinum credits (like the $240 digital entertainment credit or the $200 hotel credit). You can use multiple credits in the same billing period.',
      },
    ],
  },
  {
    id: 'chase',
    slug: 'chase-sapphire-reserve',
    name: 'Chase Sapphire Reserve Dining',
    shortName: 'Chase Sapphire',
    card: 'Chase Sapphire Reserve®',
    platform: 'OpenTable',
    platformUrl: 'https://www.opentable.com',
    enrollmentUrl: 'https://www.opentable.com/chase',
    creditAmount: '$300',
    creditPeriod: 'per card anniversary year',
    creditReset: 'Your card anniversary date',
    annualFee: '$550',
    color: 'blue',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/50',
    dotClass: 'bg-blue-400',
    description:
      'Chase Sapphire Reserve cardholders get a $300 annual travel credit that applies automatically to dining at qualifying OpenTable partner restaurants — no activation needed.',
    howToUse: [
      'No separate enrollment required. The benefit is automatic for Chase Sapphire Reserve cardholders.',
      'Find a qualifying restaurant on this map or at opentable.com/chase.',
      'Make a reservation through OpenTable (recommended).',
      'Pay with your Chase Sapphire Reserve card.',
      'Dining charges count toward the $300 annual travel credit automatically.',
    ],
    creditDetails:
      'Dining at qualifying restaurants counts toward the $300 annual travel credit. Resets on your card anniversary date — not calendar year. Check your statement for your specific reset date.',
    faqs: [
      {
        q: 'Does the Chase Sapphire Reserve dining credit work at any OpenTable restaurant?',
        a: 'No. Only restaurants that have specifically partnered with Chase Sapphire Reserve through the OpenTable program qualify. This map shows the qualifying restaurants.',
      },
      {
        q: 'When does the Chase Sapphire Reserve dining credit reset?',
        a: 'The travel credit (which covers dining) resets on your card anniversary date — not January 1st. Check your card statement or the Chase app for your specific anniversary date.',
      },
      {
        q: 'Is the dining credit separate from the $300 travel credit?',
        a: 'No. On Chase Sapphire Reserve, dining at qualifying restaurants counts toward the same $300 annual travel credit. It is not a separate dining-only credit.',
      },
      {
        q: 'Do I need to book through OpenTable to get the credit?',
        a: 'Booking through OpenTable is recommended. Walk-ins may qualify but are less reliable. The key requirement is paying with your Chase Sapphire Reserve card.',
      },
      {
        q: 'Can I use Chase points to pay and still get the credit?',
        a: 'No. You need to pay with your Chase Sapphire Reserve card. Paying with points (via Pay with Points) does not trigger the travel credit.',
      },
    ],
  },
]

export function getProgramBySlug(slug) {
  return PROGRAMS.find((p) => p.slug === slug)
}

export function getProgramById(id) {
  return PROGRAMS.find((p) => p.id === id)
}
