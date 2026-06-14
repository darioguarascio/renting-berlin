import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchFilterLayout from './SearchFilterLayout';

vi.mock('./SaveSearchButton', () => ({
  default: () => <div data-testid="save-search-button" />,
}));

vi.mock('./SavedSearchesSidebar', () => ({
  default: () => <div data-testid="saved-searches-sidebar" />,
}));

afterEach(() => {
  cleanup();
});

function getDesktopFiltersPanel() {
  const aside = document.querySelector('aside.hidden.lg\\:block');
  if (!aside) throw new Error('Desktop filters aside not found');
  return within(aside as HTMLElement);
}

describe('SearchFilterLayout', () => {
  it('shows the filter form for authenticated users', () => {
    render(
      <SearchFilterLayout
        searchType="listings"
        filters={{}}
        isAuthenticated
        loginRedirect="/offers"
        clearFiltersHref="/offers"
        filtersRequireAuth={true}
        filterForm={<div>Filter form</div>}
      >
        <div>Results</div>
      </SearchFilterLayout>,
    );

    expect(getDesktopFiltersPanel().getByText('Filter form')).toBeInTheDocument();
    expect(getDesktopFiltersPanel().queryByText('Sign up to filter listings')).not.toBeInTheDocument();
  });

  it('locks listing filters for guests when auth is required', () => {
    render(
      <SearchFilterLayout
        searchType="listings"
        filters={{}}
        isAuthenticated={false}
        loginRedirect="/offers"
        clearFiltersHref="/offers"
        filtersRequireAuth={true}
        filterForm={<div>Filter form</div>}
      >
        <div>Results</div>
      </SearchFilterLayout>,
    );

    const panel = getDesktopFiltersPanel();
    expect(panel.queryByText('Filter form')).not.toBeInTheDocument();
    expect(panel.getByText('Sign up to filter listings')).toBeInTheDocument();
    expect(panel.getByRole('link', { name: 'Sign up free' })).toHaveAttribute(
      'href',
      '/signup?redirect=%2Foffers',
    );
  });

  it('does not lock filters when auth is not required', () => {
    render(
      <SearchFilterLayout
        searchType="tenant_requests"
        filters={{}}
        isAuthenticated={false}
        loginRedirect="/requests"
        clearFiltersHref="/requests"
        filterForm={<div>Request filters</div>}
      >
        <div>Results</div>
      </SearchFilterLayout>,
    );

    const panel = getDesktopFiltersPanel();
    expect(panel.getByText('Request filters')).toBeInTheDocument();
    expect(panel.queryByText('Sign up to filter listings')).not.toBeInTheDocument();
  });
});
