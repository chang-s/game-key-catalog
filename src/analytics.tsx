import { PostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import type { ReactNode } from 'react';
import type { Game } from './types';

const posthogToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
const posthogHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

export const analyticsEnabled = Boolean(posthogToken);

export type UiState = 'normal' | 'sticky';
export type DiscoveryMethod = 'browse' | 'search' | 'filter' | 'search_and_filter';

export type FilterState = {
  availability: string;
  platforms: string[];
  genres: string[];
  offers: string[];
};

type AnalyticsProperties = Record<string, string | number | boolean | string[] | FilterState | undefined>;

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!posthogToken) return <>{children}</>;

  return <PostHogProvider
    apiKey={posthogToken}
    options={{
      api_host: posthogHost,
      defaults: '2026-05-30',
      mask_personal_data_properties: true,
    }}
  >
    {children}
  </PostHogProvider>;
}

export function captureAnalyticsEvent(eventName: string, properties?: AnalyticsProperties) {
  if (!analyticsEnabled) return;
  try {
    posthog.capture(eventName, properties);
  } catch {
    // Analytics must never interrupt the catalog interaction.
  }
}

export function gameAnalyticsProperties(game: Game) {
  return {
    game_id: game.id,
    game_title: game.title,
    availability: game.availability,
    platforms: Object.entries(game.platformQuantities)
      .filter(([, quantity]) => (quantity ?? 0) > 0)
      .map(([platform]) => platform),
  };
}

export function filterStateKey(filters: FilterState) {
  return JSON.stringify({
    availability: filters.availability,
    platforms: [...filters.platforms].sort(),
    genres: [...filters.genres].sort(),
    offers: [...filters.offers].sort(),
  });
}

export function hasActiveFilters(filters: FilterState) {
  return filters.availability !== 'Available'
    || filters.platforms.length > 0
    || filters.genres.length > 0
    || filters.offers.length > 0;
}

export function discoveryMethod(query: string, filters: FilterState): DiscoveryMethod {
  const hasSearch = query.trim().length > 0;
  const hasFilters = hasActiveFilters(filters);
  if (hasSearch && hasFilters) return 'search_and_filter';
  if (hasSearch) return 'search';
  if (hasFilters) return 'filter';
  return 'browse';
}
