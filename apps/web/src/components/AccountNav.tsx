import { LinkRowIcon } from './LinkRowIcon';

type AccountNavItem = {
  href: string;
  label: string;
  description: string;
  icon: string;
  accent?: boolean;
};

const ITEMS: AccountNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', description: 'Overview', icon: 'dashboard' },
  { href: '/account/listings', label: 'My listings', description: 'Manage your offers', icon: 'listings' },
  { href: '/account/profile-views', label: 'Profile views', description: 'Who viewed your profile', icon: 'profile-views' },
  { href: '/account/settings', label: 'Settings', description: 'Account & sign out', icon: 'settings' },
  { href: '/account/notifications', label: 'Notifications', description: 'Alerts & contact prefs', icon: 'notifications' },
  { href: '/saved-searches', label: 'Saved searches', description: 'Search alerts', icon: 'saved-searches' },
  { href: '/messages', label: 'Messages', description: 'Conversations', icon: 'messages', accent: true },
  { href: '/favorites', label: 'Favorites', description: 'Saved listings', icon: 'favorites' },
];

export default function AccountNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="link-rows" aria-label="Account">
      {ITEMS.map((item) => {
        const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        return (
          <a
            key={item.href}
            href={item.href}
            className={`link-row ${active ? 'bg-[var(--color-brand-muted)]' : ''}`}
          >
            <LinkRowIcon name={item.icon} accent={item.accent} />
            <span className="link-row__main">
              <span className={`link-row__title ${active ? 'text-[var(--color-brand-deep)]' : ''}`}>{item.label}</span>
              {!active && <span className="link-row__desc">{item.description}</span>}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="link-row__chevron size-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5.75 12.5 4.5-4.5-4.5-4.5" />
            </svg>
          </a>
        );
      })}
    </nav>
  );
}
