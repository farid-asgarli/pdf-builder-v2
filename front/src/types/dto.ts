/**
 * Data Transfer Objects (DTOs)
 * Generated from backend OpenAPI contracts (PDFBuilder.Contracts.DTOs)
 *
 * These types represent the core data structures used in API communication.
 * Keep this file in sync with backend DTO changes.
 */

// ============================================================================
// LAYOUT NODE DTO
// Matches: PDFBuilder.Contracts.DTOs.LayoutNodeDto
// ============================================================================

/**
 * Data transfer object representing a node in the PDF layout tree structure.
 * This is the primary schema for JSON layout definitions.
 */
export interface LayoutNodeDto {
  /**
   * Unique identifier of this node within the layout tree.
   * Optional - used for debugging and error reporting.
   * @maxLength 100
   */
  id?: string;

  /**
   * Component type of this node.
   * Must be a valid component type string (e.g., "Column", "Row", "Text").
   */
  type: string;

  /**
   * Component-specific properties.
   * Properties can contain expressions using {{ expression }} syntax.
   * Values can be primitives, objects, or expression strings.
   */
  properties?: Record<string, unknown>;

  /**
   * Child nodes for container components.
   * Used by Column, Row, Table, and other container components.
   */
  children?: LayoutNodeDto[];

  /**
   * Single child node for wrapper components.
   * Used by styling, sizing, and transformation components.
   */
  child?: LayoutNodeDto;

  /**
   * Style properties that apply to this node and its children.
   * Supports style inheritance down the tree.
   */
  style?: StylePropertiesDto;

  /**
   * Conditional expression that determines if this node should be rendered.
   * Uses {{ expression }} syntax, must evaluate to boolean.
   * @maxLength 500
   */
  visible?: string;

  /**
   * Data binding path for repeating this node.
   * When set, the node will be repeated for each item in the bound array.
   * Uses {{ expression }} syntax to reference a collection.
   * @maxLength 500
   */
  repeatFor?: string;

  /**
   * Variable name to use when iterating with RepeatFor.
   * Default is "item" if not specified.
   * Must be a valid identifier.
   * @maxLength 50
   */
  repeatAs?: string;

  /**
   * Index variable name when iterating with RepeatFor.
   * Default is "index" if not specified.
   * Must be a valid identifier.
   * @maxLength 50
   */
  repeatIndex?: string;
}

// ============================================================================
// STYLE PROPERTIES DTO
// Matches: PDFBuilder.Contracts.DTOs.StylePropertiesDto
// ============================================================================

/**
 * Data transfer object for style properties that can be applied to layout nodes.
 * Supports style inheritance - child nodes inherit parent styles unless overridden.
 */
export interface StylePropertiesDto {
  // ========================================
  // Text Styling Properties
  // ========================================

  /**
   * Font family name.
   * @maxLength 100
   */
  fontFamily?: string;

  /**
   * Font size in points.
   * @minimum 1
   * @maximum 1000
   */
  fontSize?: number;

  /**
   * Font weight (e.g., "Normal", "Bold", "Thin", "Black").
   * @maxLength 50
   */
  fontWeight?: string;

  /**
   * Font style ("Normal" or "Italic").
   * @maxLength 50
   */
  fontStyle?: string;

  /**
   * Text color in hex format (e.g., "#333333").
   */
  color?: string;

  /**
   * Text decoration ("None", "Underline", "Strikethrough").
   * @maxLength 50
   */
  textDecoration?: string;

  /**
   * Line height multiplier.
   * @minimum 0.1
   * @maximum 10
   */
  lineHeight?: number;

  /**
   * Letter spacing in points.
   * @minimum -100
   * @maximum 100
   */
  letterSpacing?: number;

  /**
   * Text alignment ("Left", "Center", "Right", "Justify").
   * @maxLength 50
   */
  textAlignment?: string;

  // ========================================
  // Layout Properties
  // ========================================

  /**
   * Horizontal alignment within parent ("Left", "Center", "Right").
   * @maxLength 50
   */
  horizontalAlignment?: string;

  /**
   * Vertical alignment within parent ("Top", "Middle", "Bottom").
   * @maxLength 50
   */
  verticalAlignment?: string;

  // ========================================
  // Spacing Properties
  // ========================================

  /**
   * Uniform padding on all sides in points.
   * @minimum 0
   * @maximum 1000
   */
  padding?: number;

  /**
   * Top padding in points.
   * @minimum 0
   * @maximum 1000
   */
  paddingTop?: number;

  /**
   * Right padding in points.
   * @minimum 0
   * @maximum 1000
   */
  paddingRight?: number;

  /**
   * Bottom padding in points.
   * @minimum 0
   * @maximum 1000
   */
  paddingBottom?: number;

  /**
   * Left padding in points.
   * @minimum 0
   * @maximum 1000
   */
  paddingLeft?: number;

  /**
   * Horizontal padding (left and right) in points.
   * @minimum 0
   * @maximum 1000
   */
  paddingHorizontal?: number;

  /**
   * Vertical padding (top and bottom) in points.
   * @minimum 0
   * @maximum 1000
   */
  paddingVertical?: number;

  // ========================================
  // Visual Properties
  // ========================================

  /**
   * Background color in hex format.
   */
  backgroundColor?: string;

  /**
   * Border color in hex format.
   */
  borderColor?: string;

  /**
   * Border width in points (all sides).
   * @minimum 0
   * @maximum 100
   */
  borderWidth?: number;

  /**
   * Top border width in points.
   * @minimum 0
   * @maximum 100
   */
  borderTop?: number;

  /**
   * Right border width in points.
   * @minimum 0
   * @maximum 100
   */
  borderRight?: number;

  /**
   * Bottom border width in points.
   * @minimum 0
   * @maximum 100
   */
  borderBottom?: number;

  /**
   * Left border width in points.
   * @minimum 0
   * @maximum 100
   */
  borderLeft?: number;

  /**
   * Border radius for rounded corners in points.
   * @minimum 0
   * @maximum 500
   */
  borderRadius?: number;

  /**
   * Opacity (0.0 to 1.0).
   * @minimum 0
   * @maximum 1
   */
  opacity?: number;
}

// ============================================================================
// PAGE SETTINGS DTO
// Matches: PDFBuilder.Contracts.DTOs.PageSettingsDto
// ============================================================================

/**
 * Standard page size presets.
 */
export type PageSizePreset =
  | "A0"
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | "A5"
  | "A6"
  | "A7"
  | "A8"
  | "A9"
  | "A10"
  | "Letter"
  | "Legal"
  | "Tabloid"
  | "Ledger"
  | "Executive"
  | "Custom";

/**
 * Page orientation options.
 */
export type PageOrientation = "Portrait" | "Landscape";

/**
 * Page number position options.
 */
export type PageNumberPosition =
  | "TopLeft"
  | "TopCenter"
  | "TopRight"
  | "BottomLeft"
  | "BottomCenter"
  | "BottomRight";

/**
 * Content direction options.
 */
export type ContentDirection = "LTR" | "RTL";

/**
 * Data transfer object for PDF page settings.
 * Defines page size, orientation, margins, and other page-level properties.
 */
export interface PageSettingsDto {
  /**
   * Page size preset (e.g., "A4", "Letter", "Legal").
   * If specified with "Custom", Width and Height must be provided.
   * @maxLength 50
   */
  pageSize?: PageSizePreset | string;

  /**
   * Custom page width in points (1 inch = 72 points).
   * Only used when PageSize is not specified or is "Custom".
   * @minimum 72
   * @maximum 10000
   */
  width?: number;

  /**
   * Custom page height in points (1 inch = 72 points).
   * Only used when PageSize is not specified or is "Custom".
   * @minimum 72
   * @maximum 10000
   */
  height?: number;

  /**
   * Page orientation ("Portrait" or "Landscape").
   */
  orientation?: PageOrientation;

  /**
   * Uniform margin on all sides in points.
   * @minimum 0
   * @maximum 500
   */
  margin?: number;

  /**
   * Top margin in points.
   * @minimum 0
   * @maximum 500
   */
  marginTop?: number;

  /**
   * Right margin in points.
   * @minimum 0
   * @maximum 500
   */
  marginRight?: number;

  /**
   * Bottom margin in points.
   * @minimum 0
   * @maximum 500
   */
  marginBottom?: number;

  /**
   * Left margin in points.
   * @minimum 0
   * @maximum 500
   */
  marginLeft?: number;

  /**
   * Background color for all pages in hex format.
   */
  backgroundColor?: string;

  /**
   * Whether page numbers should be shown.
   */
  showPageNumbers?: boolean;

  /**
   * Page number format (e.g., "Page {current} of {total}").
   * @maxLength 100
   */
  pageNumberFormat?: string;

  /**
   * Page number position.
   * @maxLength 50
   */
  pageNumberPosition?: PageNumberPosition;

  /**
   * Whether to enable continuous page mode (no page breaks).
   */
  continuousMode?: boolean;

  /**
   * Content direction ("LTR" or "RTL").
   */
  contentDirection?: ContentDirection;
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard to check if a node has children (is a container).
 */
export function hasChildren(node: LayoutNodeDto): boolean {
  return Array.isArray(node.children) && node.children.length > 0;
}

/**
 * Type guard to check if a node has a child (is a wrapper).
 */
export function hasChild(node: LayoutNodeDto): boolean {
  return node.child !== undefined && node.child !== null;
}

/**
 * Type guard to check if a node has repeat binding.
 */
export function isRepeating(node: LayoutNodeDto): boolean {
  return typeof node.repeatFor === "string" && node.repeatFor.length > 0;
}

/**
 * Type guard to check if a node is conditional.
 */
export function isConditional(node: LayoutNodeDto): boolean {
  return typeof node.visible === "string" && node.visible.length > 0;
}

/**
 * Type guard to check if a value is an expression.
 */
export function isExpression(value: unknown): value is string {
  return typeof value === "string" && /\{\{.*\}\}/.test(value);
}

/**
 * Extract expression content from {{ expression }} syntax.
 */
export function extractExpression(value: string): string | null {
  const match = value.match(/\{\{\s*(.+?)\s*\}\}/);
  return match ? match[1] : null;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default page settings for A4 Portrait.
 */
export const DEFAULT_PAGE_SETTINGS: PageSettingsDto = {
  pageSize: "A4",
  orientation: "Portrait",
  margin: 36, // 0.5 inch
  contentDirection: "LTR",
};

/**
 * Default style properties.
 */
export const DEFAULT_STYLE_PROPERTIES: StylePropertiesDto = {
  fontFamily: "Arial",
  fontSize: 12,
  fontWeight: "Normal",
  fontStyle: "Normal",
  color: "#000000",
  textAlignment: "Left",
};
