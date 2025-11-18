/**
 * WireGuard Scanner Color System
 * Based on project design specifications
 */

export const BRAND_COLORS = {
  // Primary brand colors
  primary: '#FF4081',           // Primary Pink - buttons, active states, highlights
  primaryLight: '#FF6B9D',      // Lighter pink for gradients
  primaryBg: '#FFE4F0',         // Light pink background for success states
  secondary: '#6366F1',         // Secondary Indigo - secondary actions

  // Status colors
  success: '#10B981',           // Green for connected status
  warning: '#F59E0B',           // Yellow for connecting status
  error: '#EF4444',             // Red for errors and disconnected

  // Gray scale
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Base colors
  white: '#FFFFFF',
  black: '#000000',

  // Border and background
  border: '#E0E0E0',            // Disabled states, borders
} as const;

export const STATUS_COLORS = {
  disconnected: BRAND_COLORS.gray[400],
  connecting: BRAND_COLORS.warning,
  connected: BRAND_COLORS.success,
  disconnecting: BRAND_COLORS.warning,
  error: BRAND_COLORS.error,
} as const;

export type BrandColor = keyof typeof BRAND_COLORS;
export type StatusColor = keyof typeof STATUS_COLORS;
