/**
 * Analytics Event Names - Comprehensive tracking for SundaySquares
 */
export enum EventName {
  // Tier 1 - Core Business Events
  POOL_CREATED = 'pool_created',
  POOL_PAYMENT_INITIATED = 'pool_payment_initiated',
  POOL_PAYMENT_COMPLETED = 'pool_payment_completed',
  POOL_ACTIVATED = 'pool_activated',
  POOL_SHARED = 'pool_shared',
  SQUARE_CLAIMED = 'square_claimed',
  SQUARE_DELETED = 'square_deleted',
  LOGIN_ATTEMPTED = 'login_attempted',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',

  // Tier 2 - Engagement Events
  NUMBERS_RANDOMIZED = 'numbers_randomized',
  GRID_LOCKED = 'grid_locked',
  GRID_UNLOCKED = 'grid_unlocked',
  QUARTER_WINNER_SAVED = 'quarter_winner_saved',
  SCORE_UPDATED = 'score_updated',
  THEME_CHANGED = 'theme_changed',
  SOUND_TOGGLED = 'sound_toggled',
  DASHBOARD_OPENED = 'dashboard_opened',
  DASHBOARD_TAB_CHANGED = 'dashboard_tab_changed',
  OWNER_DASHBOARD_OPENED = 'owner_dashboard_opened',
  PAYMENT_VERIFIED = 'payment_verified',
  PAYMENT_LINK_OPENED = 'payment_link_opened',
  PAYMENT_METHOD_SELECTED = 'payment_method_selected',

  // Game Management
  POOL_RESET = 'pool_reset',
  SQUARES_CLEARED = 'squares_cleared',
  POOL_CODE_REGENERATED = 'pool_code_regenerated',
  ADMIN_PIN_CHANGED = 'admin_pin_changed',
  TEAM_NAME_CHANGED = 'team_name_changed',
  POOL_TITLE_CHANGED = 'pool_title_changed',
  PRIZE_DISTRIBUTION_CHANGED = 'prize_distribution_changed',
  PAYMENT_SETTINGS_CHANGED = 'payment_settings_changed',
  PRICE_PER_SQUARE_CHANGED = 'price_per_square_changed',

  // Navigation & UI
  PAGE_VIEW = 'page_view',
  SIDEBAR_TOGGLED = 'sidebar_toggled',
  MODAL_OPENED = 'modal_opened',
  MODAL_CLOSED = 'modal_closed',
  PRINT_INITIATED = 'print_initiated',
  EXPORT_INITIATED = 'export_initiated',
  INVITE_LINK_COPIED = 'invite_link_copied',
  LOGIN_VIEW_CHANGED = 'login_view_changed',

  // Session & Auth
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  LOGOUT = 'logout',
  DEEP_LINK_USED = 'deep_link_used',

  // Tier 3 - Debugging & Error Events
  ERROR_OCCURRED = 'error_occurred',
  DB_SYNC_ERROR = 'db_sync_error',
  DB_SYNC_SUCCESS = 'db_sync_success',
  PAYMENT_ERROR = 'payment_error',
  VALIDATION_ERROR = 'validation_error',
  UNCAUGHT_ERROR = 'uncaught_error',
  UNHANDLED_REJECTION = 'unhandled_rejection',
}

/**
 * Event Properties - Type-safe payloads for each event
 */
export interface EventProperties {
  // Pool events
  pool_code?: string;
  pool_title?: string;
  license_key?: string;
  price_per_square?: number;
  is_paid?: boolean;

  // Square events
  square_id?: string;
  square_row?: number;
  square_col?: number;
  owner_name?: string;
  payment_method?: 'venmo' | 'cashapp' | 'cash';
  is_paid_square?: boolean;
  is_pending_square?: boolean;

  // Game events
  quarter?: 'q1' | 'q2' | 'q3' | 'final';
  winner_name?: string;
  home_score?: string;
  away_score?: string;
  home_team?: string;
  away_team?: string;

  // Login events
  login_type?: 'admin' | 'player' | 'owner';
  login_method?: 'code' | 'pin';

  // UI events
  theme?: 'stadium' | 'classic' | 'neon';
  sound_enabled?: boolean;
  tab_name?: string;
  view_name?: string;
  modal_name?: string;

  // Prize distribution
  q1_percent?: number;
  q2_percent?: number;
  q3_percent?: number;
  final_percent?: number;

  // Stats
  squares_claimed?: number;
  squares_paid?: number;
  squares_pending?: number;
  total_pot?: number;
  collected?: number;

  // Error events
  error_message?: string;
  error_stack?: string;
  error_type?: string;
  error_source?: string;

  // Meta
  timestamp?: number;
  session_id?: string;
  page_url?: string;
  referrer?: string;
}

/**
 * User Properties - Traits for user identification
 */
export interface UserProperties {
  role?: 'admin' | 'player' | 'owner';
  pools_created?: number;
  pools_joined?: number;
  squares_claimed?: number;
  total_spent?: number;
  first_seen?: string;
  last_seen?: string;
}

/**
 * Group Properties - For pool-level analytics
 */
export interface GroupProperties {
  pool_code: string;
  pool_title?: string;
  created_at?: string;
  price_per_square?: number;
  is_locked?: boolean;
  is_paid?: boolean;
  squares_claimed?: number;
  squares_paid?: number;
  total_pot?: number;
}
