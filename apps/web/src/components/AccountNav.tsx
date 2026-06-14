import { LinkRowIcon } from './LinkRowIcon';

export type AccountNavItem = {
  href: string;
  label: string;
  description: string;
  icon: string;
  accent?: boolean;
};

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', description: 'Overview', icon: 'dashboard' },
  { href: '/account/listings', label: 'My listings', description: 'Manage your offers', icon: 'listings' },
  { href: '/account/profile-views', label: 'Profile views', description: 'Who viewed your profile', icon: 'profile-views' },
  { href: '/account/settings', label: 'Settings', description: 'Account & sign out', icon: 'settings' },
  { href: '/account/notifications', label: 'Notifications', description: 'Alerts & contact prefs', icon: 'notifications' },
  { href: '/saved-searches', label: 'Saved searches', description: 'Search alerts', icon: 'saved-searches' },
  { href: '/messages', label: 'Messages', description: 'Conversations', icon: 'messages', accent: true },
  { href: '/favorites', label: 'Favorites', description: 'Saved listings', icon: 'favorites' },
];

export const ACCOUNT_DRAWER_ITEMS: AccountNavItem[] = [
  ...ACCOUNT_NAV_ITEMS.filter((item) => item.href !== '/messages' && item.href !== '/favorites'),
  { href: '/listings/new', label: 'New listing', description: 'Publish an offer', icon: 'listings' },
  { href: '/requests/new', label: 'Post seeker profile', description: 'Let landlords find you', icon: 'requests' },
];

export function AccountNavLinks({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {ACCOUNT_NAV_ITEMS.map((item) => {
        const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        return (
          <a
            key={item.href}
            href={item.href}
            className={`link-row ${active ? 'link-row--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
          >
            <LinkRowIcon name={item.icon} accent={item.accent} />
            <span className="link-row__main">
              <span className="link-row__title">{item.label}</span>
              {!active && <span className="link-row__desc">{item.description}</span>}
            </span>
            {active ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-[var(--color-brand)] opacity-60" aria-hidden="true">
                <circle cx="8" cy="8" r="3" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="link-row__chevron size-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m5.75 12.5 4.5-4.5-4.5-4.5" />
              </svg>
            )}
          </a>
        );
      })}
    </>
  );
}

export default function AccountNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="link-rows" aria-label="Account">
      <AccountNavLinks currentPath={currentPath} />
    </nav>
  );
}
