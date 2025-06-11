/**
 * Central constants for Blueprint Buddy
 * All magic numbers, strings, and configuration values should be defined here
 */

// Dimensions
export const DIMENSIONS = {
  MIN: {
    WIDTH: 6,
    HEIGHT: 6,
    DEPTH: 6,
  },
  MAX: {
    WIDTH: 120,
    HEIGHT: 96,
    DEPTH: 48,
  },
  INCH_TO_FEET: 12,
  BOARD_FEET_DIVISOR: 144,
  WASTE_FACTOR: {
    SOLID_WOOD: 1.15,
    SHEET_GOODS: 1.10,
  },
} as const;

// Furniture Standards
export const FURNITURE_STANDARDS = {
  TABLE: {
    HEIGHT: { MIN: 28, MAX: 30, IDEAL: 29 },
    CLEARANCE: 24,
  },
  CHAIR: {
    SEAT_HEIGHT: { MIN: 16, MAX: 18 },
    BACK_ANGLE: { MIN: 10, MAX: 15 },
  },
  BOOKSHELF: {
    DEPTH: { MIN: 8, MAX: 16, TYPICAL: 12 },
    SHELF_SPACING: { MIN: 12, MAX: 16 },
  },
  DESK: {
    HEIGHT: { MIN: 28, MAX: 30 },
    DEPTH: { MIN: 24, MAX: 30 },
  },
} as const;

// Material Constants
export const MATERIALS = {
  DEFAULT_THICKNESS: {
    SOLID_WOOD: 0.75,
    PLYWOOD: 0.75,
    MDF: 0.75,
  },
  MIN_THICKNESS: 0.5,
  MAX_SPAN: {
    LIGHT_LOAD: 36,
    MEDIUM_LOAD: 28,
    HEAVY_LOAD: 20,
  },
} as const;

// Engineering Constants
export const ENGINEERING = {
  SAFETY_FACTOR: {
    MIN: 2,
    RECOMMENDED: 2.5,
    HIGH: 3,
  },
  LOAD_CAPACITY: {
    TABLE: 50, // lbs/ft²
    SHELF: 25, // lbs/ft²
    CHAIR: 300, // lbs concentrated
  },
  MAX_DEFLECTION_RATIO: 360, // span/360
  HEIGHT_TO_BASE_RATIO_MAX: 3,
} as const;

// UI Constants
export const UI = {
  TOAST_DURATION: 5000,
  ANIMATION_DURATION: 200,
  MAX_SUGGESTIONS: 3,
  MAX_MESSAGE_LENGTH: 1000,
  DEBOUNCE_DELAY: 300,
  PAGE_SIZE: 20,
} as const;

// API Constants
export const API = {
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  COST_LIMIT_PER_SESSION: 1.00,
  TOKEN_LIMITS: {
    INPUT: 2000,
    OUTPUT: 1000,
  },
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  DIMENSIONS: {
    TOO_SMALL: 'Dimensions are below minimum size requirements',
    TOO_LARGE: 'Dimensions exceed maximum size limits',
    UNSTABLE: 'Height to base ratio may cause stability issues',
  },
  MATERIALS: {
    INCOMPATIBLE: 'Selected material is not compatible with joinery method',
    OUTDOOR_REQUIRED: 'Material not suitable for outdoor use',
    COST_EXCEEDED: 'Material cost exceeds budget constraints',
  },
  STRUCTURE: {
    WEAK_JOINTS: 'Joint strength insufficient for expected loads',
    SPAN_EXCEEDED: 'Span exceeds safe limits for material thickness',
    SAFETY_FACTOR_LOW: 'Design does not meet minimum safety factor',
  },
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  DESIGNER: '/designer',
  PLANS: '/plans',
  PLAN: '/plan/:id',
  AUTH: {
    CALLBACK: '/auth/callback',
    RESET_PASSWORD: '/auth/reset-password',
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  CURRENT_DESIGN: 'blueprint_buddy_current_design',
  USER_PREFERENCES: 'blueprint_buddy_preferences',
  RECENT_MATERIALS: 'blueprint_buddy_recent_materials',
} as const; 