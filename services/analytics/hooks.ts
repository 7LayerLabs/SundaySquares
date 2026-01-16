import { useEffect, useRef, useCallback } from 'react';
import { track, identify, group, reset, isAnalyticsEnabled, EventName } from './index';
import type { EventProperties, UserProperties, GroupProperties } from './types';

/**
 * Main analytics hook - provides all tracking functions
 */
export function useAnalytics() {
  const trackEvent = useCallback(
    (eventName: EventName, properties?: EventProperties) => {
      track(eventName, properties);
    },
    []
  );

  const identifyUser = useCallback(
    (userId: string, properties?: UserProperties) => {
      identify(userId, properties);
    },
    []
  );

  const setGroup = useCallback(
    (poolCode: string, properties?: GroupProperties) => {
      group(poolCode, properties);
    },
    []
  );

  const resetUser = useCallback(() => {
    reset();
  }, []);

  return {
    track: trackEvent,
    identify: identifyUser,
    group: setGroup,
    reset: resetUser,
    isEnabled: isAnalyticsEnabled(),
    EventName,
  };
}

/**
 * Hook to automatically track component mount/unmount
 */
export function useTrackMount(
  eventName: EventName,
  properties?: EventProperties,
  options?: { trackUnmount?: boolean; unmountEventName?: EventName }
) {
  const hasTrackedMount = useRef(false);

  useEffect(() => {
    // Only track mount once (handles strict mode double-mounting)
    if (!hasTrackedMount.current) {
      track(eventName, properties);
      hasTrackedMount.current = true;
    }

    return () => {
      if (options?.trackUnmount) {
        track(
          options.unmountEventName || EventName.MODAL_CLOSED,
          properties
        );
      }
    };
  }, []); // Empty deps - only run on mount/unmount
}

/**
 * Hook to track time spent on a view
 */
export function useTrackDuration(
  viewName: string,
  eventName: EventName = EventName.PAGE_VIEW
) {
  const startTimeRef = useRef<number>(Date.now());
  const viewNameRef = useRef(viewName);

  useEffect(() => {
    startTimeRef.current = Date.now();
    viewNameRef.current = viewName;

    return () => {
      const duration = Date.now() - startTimeRef.current;
      track(eventName, {
        view_name: viewNameRef.current,
        timestamp: duration,
      });
    };
  }, [viewName, eventName]);
}

/**
 * Hook to track when a value changes
 */
export function useTrackChange<T>(
  value: T,
  eventName: EventName,
  getProperties: (newValue: T, oldValue: T | undefined) => EventProperties
) {
  const previousValueRef = useRef<T | undefined>(undefined);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousValueRef.current = value;
      return;
    }

    // Only track if value actually changed
    if (previousValueRef.current !== value) {
      const properties = getProperties(value, previousValueRef.current);
      track(eventName, properties);
      previousValueRef.current = value;
    }
  }, [value, eventName, getProperties]);
}

/**
 * Hook to track clicks with automatic event binding
 */
export function useTrackClick(
  eventName: EventName,
  properties?: EventProperties
) {
  return useCallback(() => {
    track(eventName, properties);
  }, [eventName, properties]);
}

/**
 * Hook to identify user on session start
 */
export function useIdentifyOnMount(
  getUserId: () => string | null,
  getUserProperties: () => UserProperties | undefined,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      const properties = getUserProperties();
      identify(userId, properties);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook to associate user with a pool group
 */
export function usePoolGroup(
  poolCode: string | null,
  poolProperties?: Omit<GroupProperties, 'pool_code'>
) {
  useEffect(() => {
    if (poolCode) {
      group(poolCode, {
        pool_code: poolCode,
        ...poolProperties,
      });
    }
  }, [poolCode, poolProperties]);
}
