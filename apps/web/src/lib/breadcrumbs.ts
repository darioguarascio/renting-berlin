export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const ACCOUNT_CRUMB: BreadcrumbItem = { label: 'My account', href: '/dashboard' };
export const ACCOUNT_CURRENT: BreadcrumbItem = { label: 'My account' };

export function buildAccountBreadcrumbs(options: {
  currentPath: string;
  heading: string;
  sectionHref?: string;
  sectionLabel?: string;
  tail?: BreadcrumbItem[];
}): BreadcrumbItem[] {
  const { currentPath, heading, sectionHref, sectionLabel, tail = [] } = options;
  const isDashboard = currentPath === '/dashboard';

  if (isDashboard) {
    return [ACCOUNT_CURRENT];
  }

  const items: BreadcrumbItem[] = [ACCOUNT_CRUMB];

  const label = sectionLabel ?? heading;
  const href = sectionHref;

  if (tail.length > 0 && href) {
    items.push({ label, href });
    items.push(...tail);
  } else {
    items.push({ label });
  }

  return items;
}
