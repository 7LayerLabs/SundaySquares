import posthog from 'posthog-js';
import { EventName, EventProperties, UserProperties, GroupProperties } from './types';

// Re-export types for convenience
export { EventName } from './types';
export type { EventProperties, UserProperties, GroupProperties } from './types';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const POSTHOG_DEBUG = import.meta.env.VITE_POSTHOG_DEBUG === 'true';

let isInitialized = false;

/**
 * Initialize PostHog analytics
 * Should be called once at app startup before React renders
 */
export function initAnalytics(): void {
  if (isInitialized) {
    console.warn('[Analytics] Already initialized');
    return;
  }

  if (!POSTHOG_KEY) {
    console.log('[Analytics] PostHog key not configured - analytics disabled');
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (posthog) => {
        if (POSTHOG_DEBUG) {
          posthog.debug();
        }
        console.log('[Analytics] PostHog initialized');
      },
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      bootstrap: {
        distinctID: getStoredDistinctId(),
      },
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
      },
    });

    isInitialized = true;
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
  }
}

/**
 * Get or create a stored distinct ID for user tracking
 */
function getStoredDistinctId(): string | undefined {
  try {
    const stored = localStorage.getItem('posthog_distinct_id');
    if (stored) return stored;
  } catch {
    // localStorage might not be available
  }
  return undefined;
}

/**
 * Check if analytics is enabled and initialized
 */
export function isAnalyticsEnabled(): boolean {
  return isInitialized && !!POSTHOG_KEY;
}

/**
 * Track an event with optional properties
 */
export function track(eventName: EventName, properties?: EventProperties): void {
  if (!isAnalyticsEnabled()) return;

  try {
    posthog.capture(eventName, {
      ...properties,
      timestamp: Date.now(),
      page_url: window.location.href,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Identify a user with optional properties
 * Use for admins, players, and owners
 */
export function identify(userId: string, properties?: UserProperties): void {
  if (!isAnalyticsEnabled()) return;

  try {
    posthog.identify(userId, {
      ...properties,
      last_seen: new Date().toISOString(),
    });

    // Store for persistence
    try {
      localStorage.setItem('posthog_distinct_id', userId);
    } catch {
      // Ignore localStorage errors
    }
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Associate user with a pool (group analytics)
 */
export function group(poolCode: string, properties?: GroupProperties): void {
  if (!isAnalyticsEnabled()) return;

  try {
    posthog.group('pool', poolCode, properties);
  } catch (error) {
    console.error('[Analytics] Failed to set group:', error);
  }
}

/**
 * Reset user identity (on logout)
 */
export function reset(): void {
  if (!isAnalyticsEnabled()) return;

  try {
    posthog.reset();
    try {
      localStorage.removeItem('posthog_distinct_id');
    } catch {
      // Ignore localStorage errors
    }
  } catch (error) {
    console.error('[Analytics] Failed to reset:', error);
  }
}

/**
 * Set user properties without identifying
 */
export function setUserProperties(properties: UserProperties): void {
  if (!isAnalyticsEnabled()) return;

  try {
    posthog.people.set(properties);
  } catch (error) {
    console.error('[Analytics] Failed to set user properties:', error);
  }
}

/**
 * Increment a numeric user property
 */
export function incrementUserProperty(property: keyof UserProperties, value: number = 1): void {
  if (!isAnalyticsEnabled()) return;

  try {
    posthog.people.increment(property as string, value);
  } catch (error) {
    console.error('[Analytics] Failed to increment property:', error);
  }
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!isAnalyticsEnabled()) return false;

  try {
    return posthog.isFeatureEnabled(flagKey) ?? false;
  } catch {
    return false;
  }
}

/**
 * Get feature flag payload
 */
export function getFeatureFlagPayload(flagKey: string): unknown {
  if (!isAnalyticsEnabled()) return null;

  try {
    return posthog.getFeatureFlagPayload(flagKey);
  } catch {
    return null;
  }
}

/**
 * Reload feature flags
 */
export function reloadFeatureFlags(): void {
  if (!isAnalyticsEnabled()) return;

  try {
    posthog.reloadFeatureFlags();
  } catch (error) {
    console.error('[Analytics] Failed to reload feature flags:', error);
  }
}

/**
 * Track page view manually
 */
export function trackPageView(pageName?: string): void {
  if (!isAnalyticsEnabled()) return;

  try {
    posthog.capture('$pageview', {
      page_name: pageName,
      page_url: window.location.href,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track page view:', error);
  }
}

/**
 * Set up global error handlers for uncaught errors
 */
export function setupErrorTracking(): void {
  if (!isAnalyticsEnabled()) return;

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    track(EventName.UNCAUGHT_ERROR, {
      error_message: event.message,
      error_source: `${event.filename}:${event.lineno}:${event.colno}`,
      error_stack: event.error?.stack,
      error_type: 'uncaught_error',
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    track(EventName.UNHANDLED_REJECTION, {
      error_message: event.reason?.message || String(event.reason),
      error_stack: event.reason?.stack,
      error_type: 'unhandled_rejection',
    });
  });

  console.log('[Analytics] Error tracking set up');
}

/**
 * Get the PostHog instance for advanced usage
 */
export function getPostHogInstance(): typeof posthog | null {
  if (!isAnalyticsEnabled()) return null;
  return posthog;
}

// Default export for convenience
export default {
  init: initAnalytics,
  track,
  identify,
  group,
  reset,
  setUserProperties,
  incrementUserProperty,
  isFeatureEnabled,
  getFeatureFlagPayload,
  reloadFeatureFlags,
  trackPageView,
  setupErrorTracking,
  isEnabled: isAnalyticsEnabled,
  getPostHog: getPostHogInstance,
};
