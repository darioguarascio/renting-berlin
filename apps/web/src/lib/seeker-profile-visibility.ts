import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import { conversations, favorites, listingViews, listings, messages } from '../db/schema';
import type { TenantRequestFull } from '../types/tenant-request';
import {
  redactTenantRequestForViewer,
  resolveSeekerProfileAccess,
  type SeekerProfileAccess,
  type SeekerProfileLockedReason,
  type SeekerVisibility,
} from './seeker-profile-access';

async function getSeekerIdsWithVisitedListings(seekerIds: string[], viewerId: string): Promise<Set<string>> {
  if (seekerIds.length === 0) return new Set();

  const rows = await db
    .selectDistinct({ seekerId: listingViews.viewerId })
    .from(listingViews)
    .innerJoin(listings, eq(listingViews.listingId, listings.id))
    .where(and(inArray(listingViews.viewerId, seekerIds), eq(listings.publisherId, viewerId)));

  return new Set(rows.map((row) => row.seekerId));
}

async function getSeekerIdsWithFavoritedListings(seekerIds: string[], viewerId: string): Promise<Set<string>> {
  if (seekerIds.length === 0) return new Set();

  const rows = await db
    .selectDistinct({ seekerId: favorites.userId })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .where(and(inArray(favorites.userId, seekerIds), eq(listings.publisherId, viewerId)));

  return new Set(rows.map((row) => row.seekerId));
}

async function getSeekerIdsWithMessagedListings(seekerIds: string[], viewerId: string): Promise<Set<string>> {
  if (seekerIds.length === 0) return new Set();

  const rows = await db
    .selectDistinct({ seekerId: conversations.inquirerId })
    .from(conversations)
    .innerJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      and(
        inArray(conversations.inquirerId, seekerIds),
        eq(conversations.publisherId, viewerId),
        isNotNull(conversations.listingId),
        eq(messages.senderId, conversations.inquirerId),
      ),
    );

  return new Set(rows.map((row) => row.seekerId));
}

export async function viewerHasSeekerRelationship(
  seekerId: string,
  viewerId: string,
  visibility: SeekerVisibility,
): Promise<boolean> {
  if (visibility === 'visited_listings') {
    return (await getSeekerIdsWithVisitedListings([seekerId], viewerId)).has(seekerId);
  }
  if (visibility === 'favorited_listings') {
    return (await getSeekerIdsWithFavoritedListings([seekerId], viewerId)).has(seekerId);
  }
  if (visibility === 'messaged_listings') {
    return (await getSeekerIdsWithMessagedListings([seekerId], viewerId)).has(seekerId);
  }
  return false;
}

export async function resolveSeekerProfileAccessForViewer(
  profiles: Array<{ seekerId: string; visibility: SeekerVisibility }>,
  viewer: { id: string } | null,
  ownerSeekerId?: string,
): Promise<Map<string, SeekerProfileAccess>> {
  const result = new Map<string, SeekerProfileAccess>();
  const viewerId = viewer?.id ?? null;
  const isAuthenticated = !!viewerId;

  const visitedSeekerIds = new Set<string>();
  const favoritedSeekerIds = new Set<string>();
  const messagedSeekerIds = new Set<string>();

  if (viewerId) {
    const visitedProfiles = profiles.filter((p) => p.visibility === 'visited_listings');
    const favoritedProfiles = profiles.filter((p) => p.visibility === 'favorited_listings');
    const messagedProfiles = profiles.filter((p) => p.visibility === 'messaged_listings');

    const [visited, favorited, messaged] = await Promise.all([
      getSeekerIdsWithVisitedListings(
        visitedProfiles.map((p) => p.seekerId),
        viewerId,
      ),
      getSeekerIdsWithFavoritedListings(
        favoritedProfiles.map((p) => p.seekerId),
        viewerId,
      ),
      getSeekerIdsWithMessagedListings(
        messagedProfiles.map((p) => p.seekerId),
        viewerId,
      ),
    ]);

    visited.forEach((id) => visitedSeekerIds.add(id));
    favorited.forEach((id) => favoritedSeekerIds.add(id));
    messaged.forEach((id) => messagedSeekerIds.add(id));
  }

  for (const profile of profiles) {
    const isOwner = ownerSeekerId === profile.seekerId || viewerId === profile.seekerId;
    let hasRelationship = false;

    if (profile.visibility === 'visited_listings') {
      hasRelationship = visitedSeekerIds.has(profile.seekerId);
    } else if (profile.visibility === 'favorited_listings') {
      hasRelationship = favoritedSeekerIds.has(profile.seekerId);
    } else if (profile.visibility === 'messaged_listings') {
      hasRelationship = messagedSeekerIds.has(profile.seekerId);
    }

    result.set(
      profile.seekerId,
      resolveSeekerProfileAccess({
        visibility: profile.visibility,
        seekerId: profile.seekerId,
        isOwner,
        isAuthenticated,
        viewerId,
        hasRelationship,
      }),
    );
  }

  return result;
}

export interface SeekerDisplayRow {
  request: TenantRequestFull;
  canViewFull: boolean;
  lockedReason: SeekerProfileLockedReason | null;
}

export async function prepareSeekerDisplayRows(
  items: TenantRequestFull[],
  viewer: { id: string } | null,
): Promise<SeekerDisplayRow[]> {
  const accessBySeeker = await resolveSeekerProfileAccessForViewer(
    items.map((item) => ({ seekerId: item.seekerId, visibility: item.visibility })),
    viewer,
  );

  return items.map((request) => {
    const access = accessBySeeker.get(request.seekerId) ?? {
      canViewFull: false,
      lockedReason: 'login' as const,
    };
    const displayRequest = access.canViewFull ? request : redactTenantRequestForViewer(request);
    return {
      request: displayRequest,
      canViewFull: access.canViewFull,
      lockedReason: access.lockedReason,
    };
  });
}
