/**
 * Component Property Types
 * Type-safe property definitions for all 53 component types
 * Aligned with backend LayoutNodeDto.Properties and Zod schemas
 */

import type { ComponentType } from "./component";

// ============================================================================
// Common Types
// ============================================================================

/**
 * Unit type for measurements
 */
export type UnitValue = "pt" | "cm" | "inch" | "mm" | "%";

/**
 * Table column definition
 */
export interface TableColumn {
  type: "relative" | "constant";
  value: number;
}

/**
 * Table cell definition with spanning and positioning
 * Aligned with backend TableCellDefinition
 */
export interface TableCellData {
  /** Number of rows this cell spans (default: 1) */
  rowSpan?: number;
  /** Number of columns this cell spans (default: 1) */
  columnSpan?: number;
  /** Explicit 1-based row position (optional) */
  row?: number;
  /** Explicit 1-based column position (optional) */
  column?: number;
  /** Cell content - can be any LayoutNode */
  content?: unknown;
}

/**
 * Table row definition
 * Aligned with backend TableRowDefinition
 */
export interface TableRowData {
  /** Cells in this row */
  cells: TableCellData[];
}

/**
 * Canvas drawing command
 */
export interface CanvasDrawingCommand {
  type:
    | "moveTo"
    | "lineTo"
    | "bezierCurveTo"
    | "quadraticCurveTo"
    | "arc"
    | "rect"
    | "fill"
    | "stroke"
    | "setFillColor"
    | "setStrokeColor"
    | "setLineWidth";
  params: (number | string)[];
}

/**
 * Text span for rich text
 */
export interface TextSpan {
  text: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: "normal" | "italic" | "oblique";
    color?: string;
    textDecoration?: "none" | "underline" | "strikethrough";
  };
}

// ============================================================================
// Container Component Properties (7)
// Backend range: 100-106
// ============================================================================

export interface ColumnProperties {
  /** Space between child elements in points */
  spacing?: number;
}

export interface RowProperties {
  /** Space between child elements in points */
  spacing?: number;
}

export interface TableProperties {
  /** Column definitions */
  columns: TableColumn[];
  /** Row definitions (managed via children) */
  rows?: unknown[];
  /** Table header that repeats on each page */
  header?: unknown;
  /** Table footer */
  footer?: unknown;
}

/** Layers has no specific properties - uses children for layers */
export type LayersProperties = Record<string, never>;

export interface DecorationProperties {
  /** Content before main content (header) */
  before?: unknown;
  /** Content after main content (footer) */
  after?: unknown;
}

export interface InlinedProperties {
  /** Horizontal space between items */
  spacing?: number;
  /** Vertical space between wrapped lines */
  verticalSpacing?: number;
  /** Align items to text baseline */
  baselineAlignment?: boolean;
}

export interface MultiColumnProperties {
  /** Number of columns (1-10) */
  columnCount: number;
  /** Space between columns */
  spacing?: number;
}

// ============================================================================
// Content Component Properties (9)
// Backend range: 200-208
// ============================================================================

export interface TextProperties {
  /** Text content (supports expressions like {{ data.field }}) */
  content: string;
  /** Rich text spans with different styles */
  spans?: TextSpan[];
}

export interface ImageProperties {
  /** Image URL or base64 data */
  source: string;
  /** Image width in points */
  width?: number;
  /** Image height in points */
  height?: number;
  /** How the image should fit within its container */
  fit?:
    | "fill"
    | "contain"
    | "cover"
    | "width"
    | "height"
    | "area"
    | "unproportional";
}

export interface LineProperties {
  /** Line direction */
  orientation?: "horizontal" | "vertical";
  /** Line thickness in points */
  thickness?: number;
  /** Line color (hex) */
  color?: string;
}

export interface PlaceholderProperties {
  /** Optional label text displayed on the placeholder */
  label?: string;
}

export interface HyperlinkProperties {
  /** Target URL for the hyperlink */
  url: string;
}

/**
 * Represents a list item with optional nested children
 */
export interface ListItemDto {
  /** Text content of the list item (supports {{ expression }} syntax) */
  content: string;
  /** Optional nested list items */
  children?: ListItemDto[];
  /** Override list type for this item */
  type?: "ordered" | "unordered" | "none";
}

export interface ListProperties {
  /** Ordered (numbered), unordered (bulleted), or none */
  listType?: "ordered" | "unordered" | "none";
  /** Space between list items in points */
  spacing?: number;
  /** Character used for unordered list bullets (default: "•") */
  bulletCharacter?: string;
  /** List items array */
  items?: ListItemDto[];
  /** Indentation per nesting level in points (default: 20) */
  indentSize?: number;
  /** Starting number for ordered lists (default: 1) */
  startIndex?: number;
  /** Number format for ordered lists */
  numberFormat?: "decimal" | "alpha" | "alpha-lower" | "roman" | "roman-lower";
  /** Color of bullet/number in hex format */
  bulletColor?: string;
  /** Size of bullet character in points */
  bulletSize?: number;
  /** Font family for list text */
  fontFamily?: string;
  /** Font size for list text in points */
  fontSize?: number;
  /** Text color in hex format */
  color?: string;
}

export interface CanvasProperties {
  /** Canvas width in points */
  width: number;
  /** Canvas height in points */
  height: number;
  /** Vector drawing commands */
  commands?: CanvasDrawingCommand[];
}

export interface BarcodeProperties {
  /** Data to encode in the barcode */
  value: string;
  /** Barcode format type */
  format:
    | "code128"
    | "ean8"
    | "ean13"
    | "upca"
    | "code39"
    | "dataMatrix"
    | "pdf417";
}

export interface QRCodeProperties {
  /** Data to encode in the QR code */
  value: string;
  /** QR code size in points */
  size?: number;
}

// ============================================================================
// Styling Component Properties (6)
// Backend range: 300-305
// ============================================================================

export interface PaddingProperties {
  /** Padding on all sides */
  all?: number;
  /** Top padding */
  top?: number;
  /** Right padding */
  right?: number;
  /** Bottom padding */
  bottom?: number;
  /** Left padding */
  left?: number;
  /** Left and right padding */
  horizontal?: number;
  /** Top and bottom padding */
  vertical?: number;
}

export interface BorderProperties {
  /** Border thickness in points */
  thickness?: number;
  /** Border color (hex) */
  color?: string;
  /** Top border thickness */
  top?: number;
  /** Right border thickness */
  right?: number;
  /** Bottom border thickness */
  bottom?: number;
  /** Left border thickness */
  left?: number;
}

export interface BackgroundProperties {
  /** Background color (hex) */
  color: string;
}

export interface RoundedCornersProperties {
  /** Uniform corner radius on all corners in points */
  all?: number;
  /** Top-left corner radius in points */
  topLeft?: number;
  /** Top-right corner radius in points */
  topRight?: number;
  /** Bottom-left corner radius in points */
  bottomLeft?: number;
  /** Bottom-right corner radius in points */
  bottomRight?: number;
}

export interface ShadowProperties {
  /** Shadow color (hex with alpha) */
  color?: string;
  /** Shadow blur radius in points */
  blurRadius?: number;
  /** Horizontal shadow offset */
  offsetX?: number;
  /** Vertical shadow offset */
  offsetY?: number;
}

export interface DefaultTextStyleProperties {
  /** Font family name */
  fontFamily?: string;
  /** Font size in points */
  fontSize?: number;
  /** Text weight/boldness */
  fontWeight?: string;
  /** Text style */
  fontStyle?: "normal" | "italic" | "oblique";
  /** Text color (hex) */
  color?: string;
  /** Line height multiplier */
  lineHeight?: number;
  /** Space between letters in points */
  letterSpacing?: number;
}

// ============================================================================
// Sizing Component Properties (12)
// Backend range: 400-411
// ============================================================================

export interface WidthProperties {
  /** Width value */
  value: number;
  /** Measurement unit */
  unit?: UnitValue;
}

export interface HeightProperties {
  /** Height value */
  value: number;
  /** Measurement unit */
  unit?: UnitValue;
}

export interface MinWidthProperties {
  /** Minimum width in points */
  value: number;
}

export interface MaxWidthProperties {
  /** Maximum width in points */
  value: number;
}

export interface MinHeightProperties {
  /** Minimum height in points */
  value: number;
}

export interface MaxHeightProperties {
  /** Maximum height in points */
  value: number;
}

export interface AlignmentProperties {
  /** Horizontal alignment */
  horizontal?: "left" | "center" | "right" | "start" | "end";
  /** Vertical alignment */
  vertical?: "top" | "middle" | "bottom";
  /** Combined position shorthand (overrides horizontal and vertical) */
  position?:
    | "topLeft"
    | "topCenter"
    | "topRight"
    | "middleLeft"
    | "middleCenter"
    | "middleRight"
    | "bottomLeft"
    | "bottomCenter"
    | "bottomRight";
}

export interface AspectRatioProperties {
  /** Aspect ratio (width/height) */
  ratio: number;
}

/** Extend has no specific properties */
export type ExtendProperties = Record<string, never>;

/** Shrink has no specific properties */
export type ShrinkProperties = Record<string, never>;

/** Unconstrained has no specific properties */
export type UnconstrainedProperties = Record<string, never>;

export interface ConstrainedProperties {
  /** Minimum width constraint */
  minWidth?: number;
  /** Maximum width constraint */
  maxWidth?: number;
  /** Minimum height constraint */
  minHeight?: number;
  /** Maximum height constraint */
  maxHeight?: number;
}

// ============================================================================
// Transformation Component Properties (5)
// Backend range: 500-504
// ============================================================================

export interface RotateProperties {
  /** Rotation angle in degrees (-360 to 360) */
  angle: number;
}

export interface ScaleProperties {
  /** Uniform scale factor */
  factor?: number;
  /** Horizontal scale factor */
  factorX?: number;
  /** Vertical scale factor */
  factorY?: number;
}

/** ScaleToFit has no specific properties */
export type ScaleToFitProperties = Record<string, never>;

export interface TranslateProperties {
  /** Horizontal offset in points */
  x?: number;
  /** Vertical offset in points */
  y?: number;
}

export interface FlipProperties {
  /** Mirror horizontally */
  horizontal?: boolean;
  /** Mirror vertically */
  vertical?: boolean;
}

// ============================================================================
// Flow Control Component Properties (8)
// Backend range: 600-607
// ============================================================================

/** PageBreak has no specific properties */
export type PageBreakProperties = Record<string, never>;

export interface EnsureSpaceProperties {
  /** Minimum height required on page */
  minHeight: number;
}

/** ShowEntire has no specific properties */
export type ShowEntireProperties = Record<string, never>;

/** StopPaging has no specific properties */
export type StopPagingProperties = Record<string, never>;

export interface SectionProperties {
  /** Name of the section (for TOC) */
  name: string;
}

/** Repeat has no specific properties - uses LayoutNode repeatFor/repeatAs */
export type RepeatProperties = Record<string, never>;

/** ShowOnce has no specific properties */
export type ShowOnceProperties = Record<string, never>;

/** SkipOnce has no specific properties */
export type SkipOnceProperties = Record<string, never>;

// ============================================================================
// Special Component Properties (4)
// Backend range: 700-703
// ============================================================================

export interface ContentDirectionProperties {
  /** Text and content direction */
  direction: "ltr" | "rtl";
}

export interface ZIndexProperties {
  /** Layer stacking order (higher = on top) */
  index: number;
}

export interface DebugAreaProperties {
  /** Debug label text */
  label?: string;
  /** Debug border color (hex) */
  color?: string;
}

export interface DebugPointerProperties {
  /** Pointer label text */
  label?: string;
  /** Pointer color (hex) */
  color?: string;
}

// ============================================================================
// Conditional Component Properties (2)
// Backend range: 800-801
// ============================================================================

export interface ShowIfProperties {
  /** Expression that evaluates to true/false */
  condition: string;
}

/** PreventPageBreak has no specific properties */
export type PreventPageBreakProperties = Record<string, never>;

// ============================================================================
// Type Mapping
// ============================================================================

/**
 * Maps ComponentType to its specific properties interface
 * Enables type-safe property access based on component type
 */
export type ComponentPropertiesMap = {
  // Container (100-106)
  [ComponentType.Column]: ColumnProperties;
  [ComponentType.Row]: RowProperties;
  [ComponentType.Table]: TableProperties;
  [ComponentType.Layers]: LayersProperties;
  [ComponentType.Decoration]: DecorationProperties;
  [ComponentType.Inlined]: InlinedProperties;
  [ComponentType.MultiColumn]: MultiColumnProperties;

  // Content (200-208)
  [ComponentType.Text]: TextProperties;
  [ComponentType.Image]: ImageProperties;
  [ComponentType.Line]: LineProperties;
  [ComponentType.Placeholder]: PlaceholderProperties;
  [ComponentType.Hyperlink]: HyperlinkProperties;
  [ComponentType.List]: ListProperties;
  [ComponentType.Canvas]: CanvasProperties;
  [ComponentType.Barcode]: BarcodeProperties;
  [ComponentType.QRCode]: QRCodeProperties;

  // Styling (300-305)
  [ComponentType.Padding]: PaddingProperties;
  [ComponentType.Border]: BorderProperties;
  [ComponentType.Background]: BackgroundProperties;
  [ComponentType.RoundedCorners]: RoundedCornersProperties;
  [ComponentType.Shadow]: ShadowProperties;
  [ComponentType.DefaultTextStyle]: DefaultTextStyleProperties;

  // Sizing (400-411)
  [ComponentType.Width]: WidthProperties;
  [ComponentType.Height]: HeightProperties;
  [ComponentType.MinWidth]: MinWidthProperties;
  [ComponentType.MaxWidth]: MaxWidthProperties;
  [ComponentType.MinHeight]: MinHeightProperties;
  [ComponentType.MaxHeight]: MaxHeightProperties;
  [ComponentType.Alignment]: AlignmentProperties;
  [ComponentType.AspectRatio]: AspectRatioProperties;
  [ComponentType.Extend]: ExtendProperties;
  [ComponentType.Shrink]: ShrinkProperties;
  [ComponentType.Unconstrained]: UnconstrainedProperties;
  [ComponentType.Constrained]: ConstrainedProperties;

  // Transformation (500-504)
  [ComponentType.Rotate]: RotateProperties;
  [ComponentType.Scale]: ScaleProperties;
  [ComponentType.ScaleToFit]: ScaleToFitProperties;
  [ComponentType.Translate]: TranslateProperties;
  [ComponentType.Flip]: FlipProperties;

  // Flow Control (600-607)
  [ComponentType.PageBreak]: PageBreakProperties;
  [ComponentType.EnsureSpace]: EnsureSpaceProperties;
  [ComponentType.ShowEntire]: ShowEntireProperties;
  [ComponentType.StopPaging]: StopPagingProperties;
  [ComponentType.Section]: SectionProperties;
  [ComponentType.Repeat]: RepeatProperties;
  [ComponentType.ShowOnce]: ShowOnceProperties;
  [ComponentType.SkipOnce]: SkipOnceProperties;

  // Special (700-703)
  [ComponentType.ContentDirection]: ContentDirectionProperties;
  [ComponentType.ZIndex]: ZIndexProperties;
  [ComponentType.DebugArea]: DebugAreaProperties;
  [ComponentType.DebugPointer]: DebugPointerProperties;

  // Conditional (800-801)
  [ComponentType.ShowIf]: ShowIfProperties;
  [ComponentType.PreventPageBreak]: PreventPageBreakProperties;
};

/**
 * Union of all possible component properties
 */
export type AnyComponentProperties = ComponentPropertiesMap[ComponentType];

/**
 * Get properties type for a specific component type
 */
export type PropertiesFor<T extends ComponentType> = ComponentPropertiesMap[T];
