/**
 * Font families and weights for the PDF Builder
 */

/**
 * Default font families available in QuestPDF
 */
export const FONT_FAMILIES = [
  { label: "Default", value: "default" },
  { label: "Arial", value: "Arial" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Georgia", value: "Georgia" },
  { label: "Verdana", value: "Verdana" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
  { label: "Segoe UI", value: "Segoe UI" },
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Lato", value: "Lato" },
] as const;

/**
 * Font weight options
 */
export const FONT_WEIGHTS = [
  { label: "Thin (100)", value: "thin" },
  { label: "Extra Light (200)", value: "extraLight" },
  { label: "Light (300)", value: "light" },
  { label: "Normal (400)", value: "normal" },
  { label: "Medium (500)", value: "medium" },
  { label: "Semi Bold (600)", value: "semiBold" },
  { label: "Bold (700)", value: "bold" },
  { label: "Extra Bold (800)", value: "extraBold" },
  { label: "Black (900)", value: "black" },
] as const;

/**
 * Font style options
 */
export const FONT_STYLES = [
  { label: "Normal", value: "normal" },
  { label: "Italic", value: "italic" },
  { label: "Oblique", value: "oblique" },
] as const;

/**
 * Text decoration options
 */
export const TEXT_DECORATIONS = [
  { label: "None", value: "none" },
  { label: "Underline", value: "underline" },
  { label: "Strikethrough", value: "strikethrough" },
] as const;

/**
 * Text alignment options
 */
export const TEXT_ALIGNMENTS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
  { label: "Justify", value: "justify" },
  { label: "Start", value: "start" },
  { label: "End", value: "end" },
] as const;

/**
 * Default font settings
 */
export const DEFAULT_FONT_SETTINGS = {
  fontFamily: "default",
  fontSize: 12,
  fontWeight: "normal",
  fontStyle: "normal",
  color: "#000000",
  textDecoration: "none",
  lineHeight: 1.2,
  letterSpacing: 0,
  textAlignment: "left",
} as const;
