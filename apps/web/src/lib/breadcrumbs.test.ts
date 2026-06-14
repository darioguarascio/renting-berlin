import { describe, expect, it } from 'vitest';
import { ACCOUNT_CRUMB, ACCOUNT_CURRENT, buildAccountBreadcrumbs } from './breadcrumbs';

describe('buildAccountBreadcrumbs', () => {
  it('returns a single crumb on the dashboard', () => {
    expect(buildAccountBreadcrumbs({ currentPath: '/dashboard', heading: 'Dashboard' })).toEqual([
      ACCOUNT_CURRENT,
    ]);
  });

  it('builds account section crumbs', () => {
    expect(
      buildAccountBreadcrumbs({
        currentPath: '/account/settings',
        heading: 'Settings',
        sectionHref: '/account/settings',
        sectionLabel: 'Settings',
      }),
    ).toEqual([ACCOUNT_CRUMB, { label: 'Settings' }]);
  });

  it('supports nested tail crumbs', () => {
    expect(
      buildAccountBreadcrumbs({
        currentPath: '/account/listings/abc/edit',
        heading: 'Edit listing',
        sectionHref: '/account/listings',
        sectionLabel: 'My listings',
        tail: [{ label: 'Edit listing' }],
      }),
    ).toEqual([
      ACCOUNT_CRUMB,
      { label: 'My listings', href: '/account/listings' },
      { label: 'Edit listing' },
    ]);
  });
});
