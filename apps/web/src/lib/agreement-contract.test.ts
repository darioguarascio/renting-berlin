import { describe, expect, it } from 'vitest';
import {
  buildSubleaseContractData,
  fillPlaceholders,
  renderSubleaseContractMarkdown,
  resolveClauses,
  SUBLEASE_CLAUSES,
  type SubleaseContractData,
} from './agreement-contract';

const fullData: SubleaseContractData = {
  mainTenant: { name: 'Pat Owner', email: 'pat@example.com', address: 'Hauptstr. 1\n12345 Berlin' },
  subtenant: { name: 'Sam Tenant', email: 'sam@example.com' },
  property: {
    address: 'XYZ-Straße 123, 12345 Berlin',
    floor: '1st floor',
    district: 'Mitte',
    rooms: 1,
    ancillaryRooms: '1 bathroom with bath/shower and WC',
  },
  term: {
    startDate: '2025-09-01',
    endDate: '2026-02-01',
    fixedTermReason: 'Semester abroad of the Main Tenant',
  },
  rent: {
    baseRent: 750,
    operatingCostsAdvance: 50,
    deposit: 1500,
    bank: { accountHolder: 'Pat Owner', bank: 'N26', iban: 'DE00 0000', bic: 'NTSBDEB1' },
  },
  keys: { frontDoor: 1, apartment: 1, mailbox: 1 },
  placeAndDate: 'Berlin, 15 August 2025',
};

describe('fillPlaceholders', () => {
  it('substitutes known variables', () => {
    expect(fillPlaceholders('Hi {{name}}', { name: 'Sam' })).toBe('Hi Sam');
  });

  it('falls back to a blank for missing or empty values', () => {
    expect(fillPlaceholders('Rent {{rent}}', {})).toContain('___');
    expect(fillPlaceholders('Rent {{rent}}', { rent: '' })).toContain('___');
  });
});

describe('resolveClauses', () => {
  it('includes all clauses by default', () => {
    expect(resolveClauses(fullData)).toHaveLength(SUBLEASE_CLAUSES.length);
  });

  it('drops disabled optional clauses', () => {
    const clauses = resolveClauses({ ...fullData, disabledClauses: ['pets', 'insurance'] });
    expect(clauses.find((c) => c.id === 'pets')).toBeUndefined();
    expect(clauses.find((c) => c.id === 'insurance')).toBeUndefined();
    expect(clauses).toHaveLength(SUBLEASE_CLAUSES.length - 2);
  });

  it('never drops mandatory clauses even if listed', () => {
    const clauses = resolveClauses({ ...fullData, disabledClauses: ['deposit'] });
    expect(clauses.find((c) => c.id === 'deposit')).toBeDefined();
  });

  it('appends additional custom clauses', () => {
    const clauses = resolveClauses({
      ...fullData,
      additionalClauses: [{ title: 'Bikes', body: 'Store bikes in the cellar.' }],
    });
    expect(clauses[clauses.length - 1]).toMatchObject({ title: 'Bikes' });
  });
});

describe('renderSubleaseContractMarkdown', () => {
  it('renders parties, rent and key facts', () => {
    const md = renderSubleaseContractMarkdown(fullData);
    expect(md).toContain('# Sublease Agreement for a Furnished Apartment');
    expect(md).toContain('Pat Owner (pat@example.com)');
    expect(md).toContain('Sam Tenant (sam@example.com)');
    expect(md).toContain('Hauptstr. 1');
    expect(md).toContain('€750.00');
    expect(md).toContain('€50.00');
    // total rent = base + ops
    expect(md).toContain('€800.00');
    expect(md).toContain('€1,500.00');
    expect(md).toContain('1 September 2025');
    expect(md).toContain('1 February 2026');
    expect(md).toContain('DE00 0000');
  });

  it('numbers sections sequentially', () => {
    const md = renderSubleaseContractMarkdown(fullData);
    expect(md).toContain('## 1. Subject of the Lease');
    expect(md).toContain('## 2. Occupants, Registration and Subletting');
  });

  it('shows blanks for missing values', () => {
    const md = renderSubleaseContractMarkdown({
      mainTenant: { name: 'Pat Owner' },
      subtenant: { name: 'Sam Tenant' },
      property: { address: 'Somewhere 1' },
      term: {},
      rent: {},
    });
    expect(md).toContain('___');
    // defaults still applied
    expect(md).toContain('12 weeks');
    expect(md).toContain('22:00');
  });

  it('omits a disabled optional clause from the output', () => {
    const md = renderSubleaseContractMarkdown({ ...fullData, disabledClauses: ['pets'] });
    expect(md).not.toContain('Keeping pets requires');
  });

  it('formats non-EUR currency', () => {
    const md = renderSubleaseContractMarkdown({
      ...fullData,
      rent: { ...fullData.rent, currency: 'GBP', baseRent: 1000, operatingCostsAdvance: undefined },
    });
    expect(md).toContain('£1,000.00');
  });
});

describe('buildSubleaseContractData', () => {
  it('maps agreement fields and turns terms into a clause', () => {
    const data = buildSubleaseContractData({
      mainTenant: { name: 'Pat Owner' },
      subtenant: { name: 'Sam Tenant' },
      property: { address: 'Somewhere 1', rooms: 2 },
      monthlyRent: 900,
      deposit: 1800,
      startDate: '2026-03-01',
      endDate: null,
      additionalTerms: 'Tenant waters the plants.',
    });

    expect(data.rent.baseRent).toBe(900);
    expect(data.rent.deposit).toBe(1800);
    expect(data.property.furnished).toBe(true);
    expect(data.additionalClauses).toEqual([
      { title: 'Additional Terms', body: 'Tenant waters the plants.' },
    ]);

    const md = renderSubleaseContractMarkdown(data);
    expect(md).toContain('Additional Terms');
    expect(md).toContain('Tenant waters the plants.');
  });

  it('omits the additional-terms clause when there are none', () => {
    const data = buildSubleaseContractData({
      mainTenant: { name: 'Pat' },
      subtenant: { name: 'Sam' },
      property: { address: 'Somewhere 1' },
      monthlyRent: 900,
    });
    expect(data.additionalClauses).toEqual([]);
  });
});
