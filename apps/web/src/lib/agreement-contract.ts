/**
 * Editable, data-driven sublease contract template (beta).
 *
 * This is an English translation of a German furnished-sublease contract
 * (Untermietvertrag über eine möblierte Wohnung), enriched with common-sense
 * clauses (security deposit, damage, no parties, insurance, data protection…).
 *
 * The contract is modelled as structured, editable data:
 *   - `SUBLEASE_CLAUSES` — the ordered list of clauses. Each has an id, title and
 *     a markdown body with `{{placeholder}}` variables. Optional clauses can be
 *     toggled off; you can also inject fully custom `additionalClauses`.
 *   - `renderSubleaseContractMarkdown(data)` fills the placeholders and returns
 *     the final markdown (ready to be rendered to PDF / signed DocuSign-style).
 *
 * It is intentionally not legal advice; teams should have it reviewed locally.
 */

export type ClauseId =
  | 'subject'
  | 'occupants'
  | 'keys'
  | 'term'
  | 'rent'
  | 'operatingCosts'
  | 'payment'
  | 'deposit'
  | 'conditionInventory'
  | 'useAndCare'
  | 'houseRules'
  | 'damageLiability'
  | 'pets'
  | 'smokeDetectors'
  | 'insurance'
  | 'alterations'
  | 'cosmeticRepairs'
  | 'access'
  | 'endOfLease'
  | 'generalProvisions'
  | 'governingLaw'
  | 'noSideAgreements'
  | 'writtenForm'
  | 'severability'
  | 'energyCertificate'
  | 'dataProtection';

export interface ContractClause {
  id: ClauseId;
  title: string;
  body: string;
  /** Optional clauses can be switched off via `data.disabledClauses`. */
  optional?: boolean;
}

export interface ContractParty {
  name: string;
  email?: string;
  /** Free-form, may contain line breaks. */
  address?: string;
}

export interface SubleaseContractData {
  mainTenant: ContractParty;
  subtenant: ContractParty;
  property: {
    address: string;
    floor?: string;
    district?: string;
    rooms?: number;
    /** e.g. "1 bathroom with bath/shower and WC". */
    ancillaryRooms?: string;
    furnished?: boolean;
  };
  term: {
    startDate?: string; // ISO (yyyy-mm-dd or full ISO)
    endDate?: string | null;
    fixedTermReason?: string;
  };
  rent: {
    baseRent?: number;
    operatingCostsAdvance?: number;
    deposit?: number;
    currency?: string; // default EUR
    /** Plain-language due date, default "third business day of each month". */
    paymentDue?: string;
    depositReturnWeeks?: number; // default 12
    minorRepairCap?: number; // default 100
    minorRepairYearlyPercent?: number; // default 8
    bank?: {
      accountHolder?: string;
      bank?: string;
      iban?: string;
      bic?: string;
    };
  };
  keys?: {
    frontDoor?: number;
    apartment?: number;
    mailbox?: number;
  };
  houseRules?: {
    quietHoursStart?: string; // default "22:00"
    quietHoursEnd?: string; // default "07:00"
  };
  /** Clauses to omit (only `optional` clauses are honoured). */
  disabledClauses?: ClauseId[];
  /** Extra bespoke clauses appended before the boilerplate tail. */
  additionalClauses?: { title: string; body: string }[];
  placeAndDate?: string;
}

const BLANK = '_____________';

export const SUBLEASE_CLAUSES: ContractClause[] = [
  {
    id: 'subject',
    title: 'Subject of the Lease',
    body: [
      '1. The Main Tenant sublets to the Subtenant, exclusively for residential purposes, the apartment located at {{propertyAddress}}{{floorClause}}{{districtClause}} (the "Apartment" or the "Leased Property").',
      '2. The Main Tenant rents the Apartment from their own landlord (the "Head Landlord") and sublets it to the Subtenant with the Head Landlord\'s consent.',
      '3. The Apartment consists of {{rooms}} room(s) and the following ancillary rooms: {{ancillaryRooms}}.',
      '4. The Apartment is handed over furnished. The co-leased furniture and equipment are described in the inventory list attached to this agreement, which both parties sign on handover.',
      '5. Handover of the Apartment takes place after the first full month\'s total rent (base rent plus operating costs) has been received in the Main Tenant\'s account.',
    ].join('\n'),
  },
  {
    id: 'occupants',
    title: 'Occupants, Registration and Subletting',
    body: [
      '1. Persons other than the Subtenant\'s spouse or legally recognised partner, children and parents, or their domestic and care staff, may move in permanently only with the Main Tenant\'s permission. The Main Tenant may refuse if this would lead to overcrowding, if there is good cause relating to the third party, or if the use is otherwise unreasonable for the Main Tenant. Any change in the number of occupants must be reported to the Main Tenant without undue delay.',
      '2. Assigning this agreement to third parties, further subletting, or granting use of the Apartment or individual rooms to third parties always requires the Main Tenant\'s prior consent.',
      '3. A permission once granted applies only to the individual case and may be revoked for good cause. In the event of unauthorised subletting the Main Tenant may require the Subtenant to end it; if the Subtenant fails to comply within a reasonable period after a warning, the Main Tenant may terminate this agreement without notice. The Subtenant remains liable to the Main Tenant for the conduct of any third party.',
    ].join('\n'),
  },
  {
    id: 'keys',
    title: 'Keys',
    body: [
      '1. The following keys are handed over to the Subtenant for the sublease term: {{keyFrontDoor}} front-door key(s), {{keyApartment}} apartment key(s) and {{keyMailbox}} mailbox key(s).',
      '2. The Subtenant may have additional keys made, replace existing locks, or install new locks only with the Main Tenant\'s consent.',
      '3. Loss of any key must be reported to the Main Tenant immediately. The Subtenant bears the cost of replacing lost keys and, where required for security reasons, the cost of replacing the affected lock or — for a central locking system endangered by the loss — the entire system.',
    ].join('\n'),
  },
  {
    id: 'term',
    title: 'Term of the Sublease',
    body: [
      '1. The sublease begins on {{startDate}} and is concluded for a fixed term ending on {{endDate}}, without the need for notice. Reason for the fixed term: {{fixedTermReason}}.',
      '2. The sublease is also bound by the head lease between the Main Tenant and the Head Landlord and cannot continue beyond the end of the head lease. If the head lease ends before {{endDate}}, the Main Tenant may terminate this agreement as of the date the head lease ends, giving notice without undue delay after learning of that date.',
      '3. As this agreement is for a fixed term, it cannot be terminated by ordinary notice before expiry for reasons other than the end of the head lease. The right to extraordinary termination for good cause remains unaffected. Every termination must be in writing. Continued use after the end of the term does not extend or renew the sublease (tacit renewal is excluded).',
    ].join('\n'),
  },
  {
    id: 'rent',
    title: 'Rent',
    body: '1. The monthly base rent excluding operating costs (the "Base Rent") at the start of the sublease is {{baseRent}}.',
  },
  {
    id: 'operatingCosts',
    title: 'Operating Costs',
    body: [
      '1. In addition to the Base Rent, the Subtenant pays the Main Tenant all apportionable operating costs for the Apartment and a proportionate share of commonly used areas.',
      '2. A monthly advance payment on operating costs of {{operatingCosts}} is due. The advance may be adjusted following the annual statement if a balance is owed.',
    ].join('\n'),
  },
  {
    id: 'payment',
    title: 'Payment of Rent and Operating Costs',
    body: [
      '1. The total rent (Base Rent plus operating-cost advance), i.e. {{totalRent}} per month, is payable monthly in advance, at the latest by the {{paymentDue}}, free of charges, to the following account of the Main Tenant:',
      '',
      '   - Account holder: {{bankAccountHolder}}',
      '   - Bank: {{bankName}}',
      '   - IBAN: {{iban}}',
      '   - BIC: {{bic}}',
      '',
      '2. If the sublease begins on a day other than the first of the month, the first total rent is calculated pro rata.',
      '3. Timeliness of payment is determined by receipt of the funds by the Main Tenant. Amounts overdue may bear statutory default interest.',
    ].join('\n'),
  },
  {
    id: 'deposit',
    title: 'Security Deposit',
    body: [
      '1. The Subtenant pays a security deposit of {{deposit}} before handover of the Apartment. The deposit secures all claims of the Main Tenant arising from this agreement.',
      '2. The Main Tenant holds the deposit separately from their own assets.',
      '3. After the end of the sublease and the return of the Apartment, the Main Tenant returns the deposit within {{depositReturnWeeks}} weeks, after deducting any amounts owed for unpaid rent or operating costs, for damage beyond normal wear and tear, for missing inventory, or for cleaning required to restore the agreed condition. The Main Tenant may retain a reasonable portion until the final operating-cost statement is available.',
    ].join('\n'),
  },
  {
    id: 'conditionInventory',
    title: 'Condition, Handover Protocol and Inventory',
    body: [
      '1. The Apartment is handed over in a fully renovated condition at the start of the sublease.',
      '2. The parties record the condition of the Apartment and the meter readings in a handover protocol, and sign the inventory list of furniture and equipment. The same is done on return. Defects known to the Subtenant at handover are deemed accepted unless otherwise agreed in writing.',
      '3. The Main Tenant\'s liability for defects follows the statutory rules; liability for slight negligence is limited except for injury to life, body or health.',
    ].join('\n'),
  },
  {
    id: 'useAndCare',
    title: 'Use and Care of the Apartment',
    body: [
      '1. The Subtenant may use the Apartment exclusively for residential purposes and must treat the property, furniture, rooms, fixtures and installations with care.',
      '2. The Subtenant is responsible for keeping the Apartment properly clean. Pest control costs are borne by the Subtenant where they are responsible for the infestation.',
      '3. The Subtenant must adequately ventilate and heat the rooms and protect them from frost to avoid condensation, mould and other damage (as a rule, airing fully three to four times a day for about ten minutes; keeping large furniture at least 3 cm from walls). The Subtenant is responsible for damage caused by breaching these duties.',
      '4. Smoking is not permitted in common areas and must not disturb other residents. Barbecuing on balconies or in common areas is not permitted.',
      '5. Waste may only be disposed of via the designated containers, observing waste separation. Waste must not be stored on the property or in the building.',
      '6. Damage to the rooms, building, common facilities or co-leased items, and any circumstances materially affecting proper use, must be reported to the Main Tenant without undue delay. The Subtenant is liable for damage caused by late reporting.',
    ].join('\n'),
  },
  {
    id: 'houseRules',
    title: 'House Rules and Consideration for Neighbours',
    optional: true,
    body: [
      '1. The Subtenant observes quiet hours between {{quietHoursStart}} and {{quietHoursEnd}}, as well as on Sundays and public holidays.',
      '2. Parties or gatherings that unreasonably disturb other residents are not permitted. The Subtenant takes general care to avoid noise nuisance.',
      '3. The Subtenant keeps shared areas (hallways, staircases, courtyard) clean and free of personal belongings and complies with any building house rules (Hausordnung).',
    ].join('\n'),
  },
  {
    id: 'damageLiability',
    title: "Subtenant's Liability and Minor Repairs",
    body: [
      '1. The Subtenant is liable for damage caused by breaching their duties of care or by use of the Apartment contrary to the agreement, including damage caused by members of their household, guests, or other persons present with their knowledge. Normal wear and tear from contractual use is not charged.',
      '2. If the Apartment stands empty during the term and the Main Tenant suffers loss as a result, the Subtenant owes compensation.',
      '3. The Subtenant bears the cost of clearing drain blockages they (or the persons above) caused.',
      '4. The Subtenant pays for minor repairs to items within their frequent and direct access (e.g. fittings for electricity, water, gas; window and door fastenings; heating, cooking and cooling appliances) up to {{minorRepairCap}} per individual case, capped at {{minorRepairPercent}} of the annual base rent per year.',
    ].join('\n'),
  },
  {
    id: 'pets',
    title: 'Pets',
    optional: true,
    body: [
      '1. Keeping pets requires the Main Tenant\'s consent. Small animals kept in usual numbers and without unreasonable nuisance are permitted without permission. Consent may be refused or revoked for good cause, in particular where the animals cause unreasonable nuisance or damage. Keeping dangerous animals (including fighting dogs) is prohibited.',
      '2. The Subtenant is liable for all damage caused by keeping animals.',
    ].join('\n'),
  },
  {
    id: 'smokeDetectors',
    title: 'Smoke Detectors',
    body: [
      '1. The Apartment is equipped with smoke detectors in accordance with statutory requirements. The Subtenant must tolerate their installation and upkeep.',
      '2. The Subtenant must not remove batteries from, or otherwise disable, the smoke detectors at any time.',
    ].join('\n'),
  },
  {
    id: 'insurance',
    title: 'Insurance',
    optional: true,
    body:
      '1. The Subtenant is advised to maintain personal liability insurance and household contents insurance for the duration of the sublease. The Main Tenant\'s insurance does not cover the Subtenant\'s personal belongings.',
  },
  {
    id: 'alterations',
    title: 'Alterations',
    body: [
      '1. The Subtenant may not carry out structural or other alterations (conversions, fixtures, installations) beyond contractual use without the Main Tenant\'s prior consent. Where consent is given, the Subtenant is responsible for any permits and bears all costs, and is liable for proper workmanship and any resulting damage.',
      '2. On move-out the Subtenant must, at the Main Tenant\'s request, restore the original condition at their own cost, unless the parties agree otherwise.',
      '3. The Main Tenant may carry out alterations necessary to maintain the building, avert danger or remedy damage after timely notice; the Subtenant keeps the affected rooms accessible by appointment.',
    ].join('\n'),
  },
  {
    id: 'cosmeticRepairs',
    title: 'Cosmetic Repairs',
    body:
      'The Subtenant is not obliged to carry out cosmetic repairs (Schönheitsreparaturen) during the term or on move-out. These are the responsibility of the Main Tenant.',
  },
  {
    id: 'access',
    title: 'Access by the Main Tenant',
    body: [
      '1. The Subtenant exercises domestic authority (Hausrecht) in the Apartment.',
      '2. The Main Tenant may enter the Apartment for good reason — to inspect its condition, carry out repairs, read meters, or show it to prospective tenants near the end of the term — by prior appointment and at reasonable times, giving at least 24 hours\' notice except in emergencies.',
    ].join('\n'),
  },
  {
    id: 'endOfLease',
    title: 'End of the Sublease',
    body: [
      '1. On termination the Apartment must be returned to the Main Tenant fully vacated, in clean condition, with the furniture and equipment complete and in their handover condition apart from normal wear and tear.',
      '2. The Subtenant returns all keys received from, or made by, the Subtenant.',
      '3. The Subtenant removes any door, bell and mailbox name plates they affixed and is responsible for a proper final cleaning.',
    ].join('\n'),
  },
  {
    id: 'generalProvisions',
    title: 'General Provisions',
    body: [
      '1. The Subtenant affixes and removes their own door, bell and mailbox name plates at their own cost.',
      '2. The Subtenant may set off against the rent only with undisputed or legally established claims; the right to set off claims for defects or overpaid rent, or to exercise a right of retention, remains unaffected and must be announced in text form at least one month before the rent falls due.',
      '3. All amounts stated in this agreement are in {{currencyName}}.',
    ].join('\n'),
  },
  {
    id: 'energyCertificate',
    title: 'Energy Certificate',
    optional: true,
    body:
      'The Main Tenant presents the building\'s energy certificate for inspection. Its content is not part of this agreement and does not constitute any assurance of particular characteristics or energy values; the Subtenant derives no warranty or other rights from it.',
  },
  {
    id: 'dataProtection',
    title: 'Data Protection',
    optional: true,
    body:
      'The parties process each other\'s personal data only as necessary to perform this agreement and in accordance with applicable data-protection law (GDPR). Data is not shared with third parties except where required to perform the agreement or by law.',
  },
  {
    id: 'governingLaw',
    title: 'Governing Law',
    body:
      'This agreement is governed exclusively by the substantive law of the Federal Republic of Germany, excluding its conflict-of-laws rules where these would lead to the application of foreign law.',
  },
  {
    id: 'noSideAgreements',
    title: 'No Side Agreements',
    body:
      'The provisions of this agreement are exhaustive. No oral or written side agreements have been made.',
  },
  {
    id: 'writtenForm',
    title: 'Written Form',
    body:
      'Any amendments or additions to this agreement require written form to be effective and must be signed by both parties.',
  },
  {
    id: 'severability',
    title: 'Severability',
    body:
      'Should individual provisions of this agreement be or become wholly or partly invalid, the validity of the remaining provisions is unaffected. The invalid provision is replaced by a valid one that comes closest to the economic purpose intended by the parties. The same applies to any gaps in the agreement.',
  },
];

function currencySymbol(currency: string): string {
  switch (currency) {
    case 'EUR':
      return '€';
    case 'USD':
      return '$';
    case 'GBP':
      return '£';
    default:
      return `${currency} `;
  }
}

function money(value: number | undefined, currency: string): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return `${currencySymbol(currency)}${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Replace every `{{key}}` with its value, falling back to a blank line. */
export function fillPlaceholders(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value != null && value !== '' ? value : BLANK;
  });
}

function buildVariables(data: SubleaseContractData): Record<string, string | undefined> {
  const currency = data.rent.currency ?? 'EUR';
  const base = data.rent.baseRent;
  const ops = data.rent.operatingCostsAdvance;
  const total = base != null ? base + (ops ?? 0) : undefined;

  return {
    mainTenantName: data.mainTenant.name,
    mainTenantEmail: data.mainTenant.email,
    subtenantName: data.subtenant.name,
    subtenantEmail: data.subtenant.email,
    propertyAddress: data.property.address,
    floorClause: data.property.floor ? `, ${data.property.floor}` : '',
    districtClause: data.property.district ? `, ${data.property.district}` : '',
    rooms: data.property.rooms != null ? String(data.property.rooms) : undefined,
    ancillaryRooms: data.property.ancillaryRooms,
    startDate: formatDate(data.term.startDate),
    endDate: formatDate(data.term.endDate),
    fixedTermReason: data.term.fixedTermReason,
    baseRent: money(base, currency),
    operatingCosts: money(ops, currency),
    totalRent: money(total, currency),
    deposit: money(data.rent.deposit, currency),
    depositReturnWeeks: String(data.rent.depositReturnWeeks ?? 12),
    paymentDue: data.rent.paymentDue ?? 'third business day of each calendar month',
    minorRepairCap: money(data.rent.minorRepairCap ?? 100, currency),
    minorRepairPercent: `${data.rent.minorRepairYearlyPercent ?? 8}%`,
    bankAccountHolder: data.rent.bank?.accountHolder,
    bankName: data.rent.bank?.bank,
    iban: data.rent.bank?.iban,
    bic: data.rent.bank?.bic,
    keyFrontDoor: data.keys?.frontDoor != null ? String(data.keys.frontDoor) : undefined,
    keyApartment: data.keys?.apartment != null ? String(data.keys.apartment) : undefined,
    keyMailbox: data.keys?.mailbox != null ? String(data.keys.mailbox) : undefined,
    quietHoursStart: data.houseRules?.quietHoursStart ?? '22:00',
    quietHoursEnd: data.houseRules?.quietHoursEnd ?? '07:00',
    currencyName: currency,
    placeAndDate: data.placeAndDate,
  };
}

/** Returns the enabled clauses in order (optional clauses can be disabled). */
export function resolveClauses(data: SubleaseContractData): ContractClause[] {
  const disabled = new Set(data.disabledClauses ?? []);
  const enabled = SUBLEASE_CLAUSES.filter((c) => !(c.optional && disabled.has(c.id)));
  const extras: ContractClause[] = (data.additionalClauses ?? []).map((c, i) => ({
    id: `custom_${i}` as ClauseId,
    title: c.title,
    body: c.body,
  }));
  return [...enabled, ...extras];
}

/**
 * Maps the fields captured by the in-app agreement (monthly rent, deposit,
 * dates, free-text terms) onto the richer contract data, so a signed agreement
 * can be rendered as a full sublease contract. Free-text `additionalTerms`
 * become a custom clause.
 */
export function buildSubleaseContractData(input: {
  mainTenant: ContractParty;
  subtenant: ContractParty;
  property: SubleaseContractData['property'];
  monthlyRent: number;
  operatingCostsAdvance?: number;
  deposit?: number | null;
  startDate?: string;
  endDate?: string | null;
  fixedTermReason?: string;
  additionalTerms?: string | null;
  currency?: string;
  keys?: SubleaseContractData['keys'];
  houseRules?: SubleaseContractData['houseRules'];
  bank?: NonNullable<SubleaseContractData['rent']>['bank'];
  placeAndDate?: string;
  disabledClauses?: ClauseId[];
}): SubleaseContractData {
  const additionalClauses = input.additionalTerms?.trim()
    ? [{ title: 'Additional Terms', body: input.additionalTerms.trim() }]
    : [];

  return {
    mainTenant: input.mainTenant,
    subtenant: input.subtenant,
    property: { furnished: true, ...input.property },
    term: {
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      fixedTermReason: input.fixedTermReason,
    },
    rent: {
      baseRent: input.monthlyRent,
      operatingCostsAdvance: input.operatingCostsAdvance,
      deposit: input.deposit ?? undefined,
      currency: input.currency ?? 'EUR',
      bank: input.bank,
    },
    keys: input.keys,
    houseRules: input.houseRules,
    disabledClauses: input.disabledClauses,
    additionalClauses,
    placeAndDate: input.placeAndDate,
  };
}

export function renderSubleaseContractMarkdown(data: SubleaseContractData): string {
  const vars = buildVariables(data);
  const clauses = resolveClauses(data);

  const header = fillPlaceholders(
    [
      '# Sublease Agreement for a Furnished Apartment',
      '',
      '**Between**',
      '',
      '{{mainTenantName}} ({{mainTenantEmail}})',
      ...(data.mainTenant.address ? data.mainTenant.address.split('\n').map((l) => l.trim()) : []),
      '',
      '— hereinafter the "Main Tenant" —',
      '',
      '**and**',
      '',
      '{{subtenantName}} ({{subtenantEmail}})',
      ...(data.subtenant.address ? data.subtenant.address.split('\n').map((l) => l.trim()) : []),
      '',
      '— hereinafter the "Subtenant" —',
      '',
      'the following sublease agreement is concluded:',
    ].join('\n'),
    vars,
  );

  const sections = clauses
    .map((clause, index) => {
      const body = fillPlaceholders(clause.body, vars);
      return `## ${index + 1}. ${clause.title}\n\n${body}`;
    })
    .join('\n\n');

  const signatures = fillPlaceholders(
    [
      '## Signatures',
      '',
      'The Subtenant confirms by their signature that they have received a complete copy of this agreement signed by the Main Tenant.',
      '',
      'Place, date: {{placeAndDate}}',
      '',
      '| Main Tenant | Subtenant |',
      '| --- | --- |',
      '| _____________________ | _____________________ |',
      '| {{mainTenantName}} | {{subtenantName}} |',
      '',
      '> Beta template — this records what the parties agreed in good faith and is not legal advice. Have it reviewed locally before relying on it.',
    ].join('\n'),
    vars,
  );

  return `${header}\n\n${sections}\n\n${signatures}\n`;
}
