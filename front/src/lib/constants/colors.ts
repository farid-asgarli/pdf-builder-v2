/**
 * Color palettes for the PDF Builder
 */

/**
 * Common color names supported by the backend
 */
export const COMMON_COLORS = [
  "black",
  "white",
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
  "gray",
  "grey",
  "transparent",
] as const;

/**
 * Default color palette for the color picker
 */
export const COLOR_PALETTE = [
  // Grayscale
  "#000000",
  "#333333",
  "#666666",
  "#999999",
  "#CCCCCC",
  "#FFFFFF",
  // Primary colors
  "#FF0000",
  "#00FF00",
  "#0000FF",
  // Secondary colors
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  // Common document colors
  "#1a1a1a", // Dark text
  "#4a4a4a", // Muted text
  "#f5f5f5", // Light background
  "#e0e0e0", // Border color
  "#2563eb", // Primary blue
  "#16a34a", // Success green
  "#dc2626", // Error red
  "#ca8a04", // Warning yellow
] as const;

/**
 * Validate if a string is a valid hex color
 */
export function isValidHexColor(value: string): boolean {
  if (!value.startsWith("#")) return false;
  const hex = value.slice(1);
  return (hex.length === 6 || hex.length === 8) && /^[0-9A-Fa-f]+$/.test(hex);
}

/**
 * Validate if a string is a valid color (hex or named)
 */
export function isValidColor(value: string): boolean {
  if (isValidHexColor(value)) return true;
  return COMMON_COLORS.includes(value.toLowerCase() as (typeof COMMON_COLORS)[number]);
}
