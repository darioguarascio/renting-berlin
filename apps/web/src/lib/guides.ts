export interface GuideSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  category: 'bureaucracy' | 'money' | 'search' | 'rights';
  readMinutes: number;
  publishedAt: string;
  updatedAt?: string;
  relatedSlugs: string[];
  externalLinks?: { label: string; href: string }[];
  sections: GuideSection[];
}

export const GUIDE_CATEGORIES: Record<Guide['category'], string> = {
  bureaucracy: 'Bureaucracy',
  money: 'Money & costs',
  search: 'Finding a place',
  rights: 'Rights & safety',
};

export const GUIDES: Guide[] = [
  {
    slug: 'anmeldung',
    title: 'Anmeldung — registering your address',
    description:
      'Why landlords ask about Anmeldung, what registration means for tenants, and how it fits into your Berlin rental search.',
    category: 'bureaucracy',
    readMinutes: 5,
    publishedAt: '2025-01-15',
    relatedSlugs: ['schufa', 'rental-documents', 'rent-costs', 'wg-rooms'],
    externalLinks: [
      {
        label: 'Full Anmeldung guide — Settle in Berlin',
        href: 'https://www.settle-in-berlin.com/anmeldung-bureaucracy-germany-address-registration/',
      },
    ],
    sections: [
      {
        heading: 'What is Anmeldung?',
        paragraphs: [
          'Anmeldung is the mandatory registration of your residential address at the local Bürgeramt (citizens\' office). Every person living in Germany must register within 14 days of moving in — whether you rent a whole flat, a room, or sublet.',
          'On renting.berlin you will see listings marked “Anmeldung available”. That means the landlord confirms you can use this address for official registration — not every room in Berlin qualifies, especially informal sublets.',
        ],
      },
      {
        heading: 'Why it matters when apartment hunting',
        paragraphs: [
          'Without Anmeldung you cannot open many bank accounts, get a tax ID, enroll in university, or switch to public health insurance. Visa extensions and job contracts often require proof of a registered address (Meldebescheinigung).',
          'If you need Anmeldung, filter for it on renting.berlin and state it clearly in your seeker profile. Landlords who offer it move to the top of your list — but expect stricter document checks.',
        ],
        bullets: [
          'Whole flats and main-tenant WGs usually allow Anmeldung',
          'Some temporary furnished lets explicitly exclude it',
          'Zwischenmiete (sublets) may or may not — always ask before signing',
        ],
      },
      {
        heading: 'What you need for registration',
        bullets: [
          'Valid passport or national ID',
          'Wohnungsgeberbestätigung — landlord confirmation form (landlord must sign)',
          'Completed Anmeldung form (available at the Bürgeramt or online)',
          'Marriage certificate / birth certificates for family members if applicable',
        ],
        paragraphs: [
          'Book a Bürgeramt appointment early — slots in Berlin fill up fast. Some offices offer walk-in hours; check berlin.de for your Bezirk.',
        ],
      },
      {
        heading: 'Practical tips',
        paragraphs: [
          'Ask for the Wohnungsgeberbestätigung in writing before you pay a deposit. Without it, you cannot complete Anmeldung even if you already moved in.',
          'If a listing says “no Anmeldung” but you need it for visa or work, keep looking — trying to register at an ineligible address causes serious problems later.',
        ],
      },
    ],
  },
  {
    slug: 'schufa',
    title: 'SCHUFA & credit checks for rentals',
    description:
      'What SCHUFA is, when landlords request it, and what to do if you are new to Germany or have no score yet.',
    category: 'money',
    readMinutes: 6,
    publishedAt: '2025-01-22',
    relatedSlugs: ['anmeldung', 'rental-documents', 'rent-costs', 'wg-rooms'],
    externalLinks: [
      {
        label: 'SCHUFA explained — Settle in Berlin',
        href: 'https://www.settle-in-berlin.com/schufa-banking-finances-germany-credit-rating-score/',
      },
    ],
    sections: [
      {
        heading: 'What is SCHUFA?',
        paragraphs: [
          'SCHUFA (Schutzgemeinschaft für allgemeine Kreditsicherung) is Germany\'s main credit bureau. It collects data on loans, contracts, and payment behaviour and produces a credit score used by landlords, banks, and phone providers.',
          'A “SCHUFA-Auskunft” is a document showing your score and entries. Many Berlin landlords request it for long-term rentals, especially for whole flats.',
        ],
      },
      {
        heading: 'When landlords ask for it',
        paragraphs: [
          'On renting.berlin, listings can be marked “SCHUFA required”. That is common for unfurnished flats, higher rents, and professional landlords. Shared rooms and short-term lets often skip it.',
          'As a seeker you can mark “Have SCHUFA” on your profile if you already have a positive report — it helps landlords filter serious applicants.',
        ],
        bullets: [
          'Bonitätsauskunft (paid, instant online) — most common for applications',
          'Kostenlose Datenkopie — free once per year, slower',
          'Landlords may also accept Mietschuldenfreiheitsbescheinigung from a previous landlord',
        ],
      },
      {
        heading: 'No SCHUFA yet?',
        paragraphs: [
          'New arrivals often have no German credit history. Options include: proof of income and employment contract, bank statements, a parental guarantee (Bürgschaft), prepaid rent, or a higher deposit where legally allowed.',
          'Some landlords accept an international credit report or a SCHUFA for newcomers product — ask before applying. Being transparent on your renting.berlin seeker profile saves everyone time.',
        ],
      },
      {
        heading: 'Protect your score',
        paragraphs: [
          'Avoid missing phone or gym contract payments — they can appear on SCHUFA. Do not apply for ten different SCHUFA reports in one week; landlords only need one recent document.',
          'If you find incorrect entries, you can dispute them with SCHUFA directly. Keep your report updated before flat viewings during peak season (summer).',
        ],
      },
    ],
  },
  {
    slug: 'rent-costs',
    title: 'Understanding rent, utilities & deposit',
    description:
      'Kaltmiete vs Warmmiete, Nebenkosten, Kaution, and what the monthly price on a listing actually means.',
    category: 'money',
    readMinutes: 5,
    publishedAt: '2025-02-03',
    relatedSlugs: ['schufa', 'rental-documents', 'tenant-rights'],
    externalLinks: [
      {
        label: 'Saving on rent in Germany — Settle in Berlin',
        href: 'https://www.settle-in-berlin.com/4-ways-you-can-legally-decrease-your-rent-in-germany/',
      },
    ],
    sections: [
      {
        heading: 'Kaltmiete and Warmmiete',
        paragraphs: [
          'Kaltmiete is base rent only — cold rent. Warmmiete includes Nebenkosten (operating costs): heating, water, rubbish, building maintenance, sometimes internet.',
          'On renting.berlin we show the main monthly rent figure. Always check the listing detail for utilities (Nebenkosten) and whether the price is cold or warm — landlords should state both clearly.',
        ],
      },
      {
        heading: 'Other move-in costs',
        bullets: [
          'Kaution — security deposit, usually up to 3 months\' Kaltmiete (see tenant rights guide)',
          'Provision / Makler — broker fee if applicable (tenant-paid broker fees are restricted)',
          'Equipment fee — sometimes charged for furnished rooms',
          'First month\'s rent — often due before keys, plus deposit',
        ],
        paragraphs: [
          'Budget for 3–4 months\' rent in cash flow when moving: deposit, first month, and setup costs (furniture, Anmeldung trip, basic insurance).',
        ],
      },
      {
        heading: 'Nebenkosten & the annual adjustment',
        paragraphs: [
          'Even with Warmmiete, utilities are partly estimated. Once a year landlords settle actual costs — you may receive a Nachzahlung (extra payment) or a refund.',
          'Ask for the last Nebenkostenabrechnung (utility statement) before signing. High heating costs in old Altbau buildings are common in Berlin.',
        ],
      },
    ],
  },
  {
    slug: 'rental-documents',
    title: 'Documents landlords commonly request',
    description:
      'The paperwork Berlin landlords expect — and how to prepare a strong application.',
    category: 'search',
    readMinutes: 5,
    publishedAt: '2025-02-12',
    relatedSlugs: ['schufa', 'anmeldung', 'finding-a-flat', 'saved-search-alerts'],
    externalLinks: [
      {
        label: 'Settle in Berlin — bureaucracy guides',
        href: 'https://www.settle-in-berlin.com/',
      },
    ],
    sections: [
      {
        heading: 'The standard application pack',
        bullets: [
          'Copy of passport or ID',
          'SCHUFA-Bonitätsauskunft or alternative proof of creditworthiness',
          'Employment contract or proof of income (last 3 payslips)',
          'Mietschuldenfreiheitsbescheinigung — confirmation no rent debt at previous place',
          'Selbstauskunft — tenant self-disclosure form (income, pets, smoking)',
          'Certificate of enrollment — for students',
        ],
        paragraphs: [
          'Landlords often want everything in one PDF before inviting you to a viewing. Prepare a folder in advance — speed wins in competitive Kieze.',
        ],
      },
      {
        heading: 'How renting.berlin helps',
        paragraphs: [
          'Listings show which documents are required. Seeker profiles let you signal SCHUFA, Anmeldung needs, income, and languages — so landlords know you are serious before messaging.',
          'Use messages to send documents only after you trust the contact. Never pay deposits to unknown accounts without a signed contract and in-person or video viewing.',
        ],
      },
      {
        heading: 'Students & freelancers',
        paragraphs: [
          'Students: enrollment certificate, blocked account or scholarship letter, sometimes a parental guarantee.',
          'Freelancers: last tax assessment (Steuerbescheid), client contracts, bank statements. Freelancer visa holders should show Finanzamt registration if available.',
        ],
      },
    ],
  },
  {
    slug: 'tenant-rights',
    title: 'Tenant rights basics in Berlin',
    description:
      'Deposits, rent increases, repairs, and where to get help — a short overview for renters in Berlin.',
    category: 'rights',
    readMinutes: 6,
    publishedAt: '2025-02-20',
    relatedSlugs: ['rent-costs', 'finding-a-flat', 'anmeldung'],
    externalLinks: [
      {
        label: 'Tenants\' association experience — Settle in Berlin',
        href: 'https://www.settle-in-berlin.com/fight-the-power-my-experience-with-a-tenants-association-in-berlin/',
      },
    ],
    sections: [
      {
        heading: 'Your contract is the foundation',
        paragraphs: [
          'Only sign a written lease (Mietvertrag). Oral agreements are hard to enforce. Read clauses on notice period (Kündigungsfrist), renovations, subletting, and pets.',
          'For WGs, clarify whether you rent from the main tenant (Untermiete) or the landlord directly — your rights differ.',
        ],
      },
      {
        heading: 'Deposit (Kaution)',
        paragraphs: [
          'Maximum three months\' Kaltmiete, held in a separate account. Landlord must return it after move-out minus legitimate claims — often within months if there is no dispute.',
          'Never pay deposit in cash without a receipt. Transfer to the named escrow account on the contract.',
        ],
      },
      {
        heading: 'Repairs & rent reduction',
        paragraphs: [
          'Landlord is responsible for structural repairs and most appliances unless you caused damage. Document defects with photos and email — not just WhatsApp.',
          'Serious defects (no heating, mould) may justify Mietminderung (rent reduction) after proper notice. Get advice before withholding rent entirely.',
        ],
        bullets: [
          'Mietpreisbremse — rent cap in many Berlin areas for new contracts',
          'Kündigungsschutz — strong protection against arbitrary eviction in long-term leases',
          'Mieterverein — tenants\' union offers legal advice (membership fee)',
        ],
      },
      {
        heading: 'If something goes wrong',
        paragraphs: [
          'Berlin has counselling centres (Mieterberatung) and consumer advice. For serious disputes consider a Mieterverein or lawyer specialising in Mietrecht.',
          'renting.berlin feedback after real rentals is designed to reward fair landlords and warn others — but it does not replace legal advice.',
        ],
      },
    ],
  },
  {
    slug: 'finding-a-flat',
    title: 'Finding a flat in Berlin — practical tips',
    description:
      'How the Berlin rental market works, WG culture, scam red flags, and how to search smarter.',
    category: 'search',
    readMinutes: 7,
    publishedAt: '2025-03-01',
    relatedSlugs: ['rental-documents', 'anmeldung', 'tenant-rights'],
    externalLinks: [
      {
        label: 'Moving to Berlin guide — Settle in Berlin',
        href: 'https://www.settle-in-berlin.com/this-is-how-you-move-to-berlin-a-guide-by-a-local/',
      },
      {
        label: 'Landlord tricks to watch for — Settle in Berlin',
        href: 'https://www.settle-in-berlin.com/4-dirty-tricks-berlin-landlords-might-try-to-pull-on-you/',
      },
    ],
    sections: [
      {
        heading: 'How the market works',
        paragraphs: [
          'Berlin is competitive, especially June–September. Whole flats go fast; WGs often hold castings (Kenny) with group interviews. Long-term unfurnished lets dominate family and professional searches; furnished short lets suit newcomers.',
          'renting.berlin splits Offers (apartments) and Requests (seekers) — post a seeker profile so landlords find you, not only the other way around. Save a search to get email alerts when new matches appear.',
        ],
      },
      {
        heading: 'WG vs whole flat',
        bullets: [
          'WG (Wohngemeinschaft) — shared flat, your own room, shared kitchen/bath',
          'Zwischenmiete — temporary sublet, often 1–6 months',
          'Unbefristet — open-ended lease, strongest stability',
          'Befristet — fixed term, common for furnished and visa-linked stays',
        ],
        paragraphs: [
          'Filter by category and rent type on /offers. Save searches to get notified when new matches appear — see our saved search alerts guide for details.',
        ],
      },
      {
        heading: 'Scam red flags',
        bullets: [
          'Landlord abroad, keys by post, deposit before viewing',
          'Price far below market for the neighborhood',
          'Only wire transfer, no German bank account or contract',
          'Pressure to pay immediately without Besichtigung (viewing)',
        ],
        paragraphs: [
          'Always view the place or have a trusted person view it. Verify the person owns or manages the property. Use in-app messaging on renting.berlin so there is a record.',
        ],
      },
      {
        heading: 'Search smarter',
        paragraphs: [
          'Prepare documents before you start. Write a short, honest seeker profile. Respond within hours, not days. Berlin rewards prepared, friendly applicants who know what they need — Anmeldung, budget, move-in date.',
        ],
      },
    ],
  },
  {
    slug: 'wg-rooms',
    title: 'Finding a WG room in Berlin',
    description:
      'How WGs work in Berlin, what to expect at a casting, and how to stand out when applying for a shared room.',
    category: 'search',
    readMinutes: 6,
    publishedAt: '2026-03-01',
    relatedSlugs: ['finding-a-flat', 'rental-documents', 'saved-search-alerts'],
    sections: [
      {
        heading: 'What is a WG?',
        paragraphs: [
          'A WG (Wohngemeinschaft) is a shared flat where you rent your own room and share kitchen, bathroom, and common areas with flatmates. It is the most common first home for students, newcomers, and many young professionals in Berlin.',
          'On renting.berlin, filter Offers by “Shared room” to browse WG listings. You can also post a seeker profile so WG hosts find you directly.',
        ],
      },
      {
        heading: 'The casting (Kenny)',
        paragraphs: [
          'Most WGs invite several applicants to a group viewing — often called a casting or Kenny. Flatmates want someone who fits the household vibe, not just someone who can pay rent.',
          'Prepare a short intro: who you are, what you do, your move-in date, and how long you plan to stay. Ask practical questions about cleaning, guests, and quiet hours.',
        ],
        bullets: [
          'Arrive on time — late arrivals rarely get the room',
          'Be honest about pets, partners staying over, and work-from-home habits',
          'Follow up the same day with a friendly message if you are interested',
        ],
      },
      {
        heading: 'Main tenant vs sublet',
        paragraphs: [
          'You may rent from the main tenant (Untermiete) or directly from the landlord. Sublets are often temporary (Zwischenmiete). Always clarify Anmeldung before signing — many WG sublets do not allow registration.',
          'If you need Anmeldung for visa or work, filter for it on renting.berlin and say so upfront in your seeker profile.',
        ],
      },
      {
        heading: 'Search smarter for WGs',
        paragraphs: [
          'WG rooms move fast — often within hours. Save a search filtered to shared rooms in your target neighborhoods and enable email alerts.',
          'Write a genuine seeker profile with a photo, languages, budget, and move-in date. Landlords and main tenants browse Requests when they need someone quickly.',
        ],
      },
    ],
  },
  {
    slug: 'saved-search-alerts',
    title: 'Saved searches & email alerts',
    description:
      'How to save a search on renting.berlin and get notified when new flats or rooms match your criteria.',
    category: 'search',
    readMinutes: 4,
    publishedAt: '2026-03-01',
    relatedSlugs: ['finding-a-flat', 'wg-rooms', 'listing-your-flat'],
    sections: [
      {
        heading: 'Why save a search?',
        paragraphs: [
          'Berlin listings disappear within hours during peak season. Refreshing ImmoScout all day is exhausting. Saved searches on renting.berlin watch the marketplace for you and send alerts when something new matches.',
          'This is especially useful if you are looking for a narrow combination — e.g. Kreuzberg, Anmeldung, under €900, shared room.',
        ],
      },
      {
        heading: 'How to save a search',
        bullets: [
          'Go to Offers and set your filters — neighborhood, budget, category, Anmeldung, and more',
          'Click “Save this search” on the results page',
          'Create a free account if you have not already — alerts require a login',
          'Manage saved searches from your account or the Saved searches page',
        ],
        paragraphs: [
          'You can save multiple searches — one per neighborhood, budget band, or property type. Each runs independently.',
        ],
      },
      {
        heading: 'Notifications',
        paragraphs: [
          'When a new listing matches, you get an in-app notification. Email alerts are sent based on your notification preferences — instant, daily digest, or weekly digest.',
          'External listings aggregated from other sites link out to apply elsewhere. Native listings on renting.berlin support direct messaging and verified reviews after a rental.',
        ],
      },
      {
        heading: 'Tips for faster results',
        paragraphs: [
          'Start broad, then narrow — a search with too many filters may never match. Save two or three variants (e.g. Neukölln + Kreuzberg at the same budget).',
          'Respond quickly when you get an alert. Have your application documents ready — see our rental documents guide.',
        ],
      },
    ],
  },
  {
    slug: 'listing-your-flat',
    title: 'Listing your flat or room as a landlord',
    description:
      'How to post an offer on renting.berlin, what tenants expect, and why verified feedback helps you fill vacancies faster.',
    category: 'search',
    readMinutes: 5,
    publishedAt: '2026-03-01',
    relatedSlugs: ['rent-costs', 'rental-documents', 'saved-search-alerts'],
    sections: [
      {
        heading: 'Who should list here?',
        paragraphs: [
          'renting.berlin is for private landlords, WG main tenants with a room to fill, and anyone offering a flat or room in Berlin. It is not a broker platform — you message applicants directly.',
          'Listing is free during the beta. You get a public profile at /u/your-handle that tenants can review alongside your listing.',
        ],
      },
      {
        heading: 'Creating a strong listing',
        bullets: [
          'Clear title with neighborhood and room count — e.g. “Bright 2-room flat in Prenzlauer Berg”',
          'Accurate photos — tenants skip listings without images',
          'State Anmeldung, SCHUFA requirements, and rent type (long-term, short-term) upfront',
          'Fill in utilities, deposit, and available-from date',
        ],
        paragraphs: [
          'Tenants filter by Anmeldung, budget, and category. Incomplete listings get fewer messages. Use the map picker so your neighborhood displays correctly in search.',
        ],
      },
      {
        heading: 'Browse seeker profiles',
        paragraphs: [
          'You do not have to wait for applications. Browse Requests to find tenants who match your flat — filter by budget, move-in date, household type, and documents.',
          'Message directly in the app. No phone number required until you choose to share it.',
        ],
      },
      {
        heading: 'Trust and reviews',
        paragraphs: [
          'After a confirmed rental ends, both sides leave feedback. Good reviews on your public profile make the next vacancy easier — tenants trust landlords with verified history.',
          'See our for-landlords page for a quick overview, or sign up and post your first listing in minutes.',
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getGuidesByCategory(category: Guide['category']): Guide[] {
  return GUIDES.filter((g) => g.category === category);
}
