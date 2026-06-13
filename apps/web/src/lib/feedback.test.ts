import { describe, expect, it } from 'vitest';

function isMutualFeedback(
  rows: Array<{ authorId: string; subjectId: string }>,
  landlordId: string,
  tenantId: string,
) {
  if (rows.length < 2) return false;
  const tenantReviewedLandlord = rows.some((row) => row.authorId === tenantId && row.subjectId === landlordId);
  const landlordReviewedTenant = rows.some((row) => row.authorId === landlordId && row.subjectId === tenantId);
  return tenantReviewedLandlord && landlordReviewedTenant;
}

describe('published feedback rules', () => {
  it('requires both tenant and landlord feedback', () => {
    expect(
      isMutualFeedback(
        [{ authorId: 'tenant', subjectId: 'landlord' }],
        'landlord',
        'tenant',
      ),
    ).toBe(false);

    expect(
      isMutualFeedback(
        [
          { authorId: 'tenant', subjectId: 'landlord' },
          { authorId: 'landlord', subjectId: 'tenant' },
        ],
        'landlord',
        'tenant',
      ),
    ).toBe(true);
  });
});
