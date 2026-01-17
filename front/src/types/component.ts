/**
 * Component-related TypeScript types
 * Defines all PDF component types and their metadata
 * Aligned with backend PDFBuilder.Core.Domain.ComponentType
 *
 * Total: 53 components
 */

/**
 * All supported component types in the PDF Builder
 * Maps to backend QuestPDF components
 * String values match backend enum names for JSON serialization
 *
 * Backend enum numeric ranges for reference:
 * - Container: 100-106 (7 components)
 * - Content: 200-208 (9 components, includes List)
 * - Styling: 300-305 (6 components)
 * - Sizing: 400-411 (12 components)
 * - Transformation: 500-504 (5 components)
 * - FlowControl: 600-607 (8 components)
 * - Special: 700-703 (4 components)
 * - Conditional: 800-801 (2 components)
 */
export enum ComponentType {
  // ========================================
  // Container/Layout Components (7)
  // Backend range: 100-106
  // ========================================
  Column = "Column", // Backend: 100
  Row = "Row", // Backend: 101
  Table = "Table", // Backend: 102
  Layers = "Layers", // Backend: 103
  Decoration = "Decoration", // Backend: 104
  Inlined = "Inlined", // Backend: 105
  MultiColumn = "MultiColumn", // Backend: 106

  // ========================================
  // Content Components (9)
  // Backend range: 200-208
  // Note: List is categorized as Content but allows children
  // ========================================
  Text = "Text", // Backend: 200
  Image = "Image", // Backend: 201
  Line = "Line", // Backend: 202
  Placeholder = "Placeholder", // Backend: 203
  Hyperlink = "Hyperlink", // Backend: 204
  List = "List", // Backend: 205
  Canvas = "Canvas", // Backend: 206
  Barcode = "Barcode", // Backend: 207
  QRCode = "QRCode", // Backend: 208

  // ========================================
  // Styling Components (6)
  // Backend range: 300-305
  // ========================================
  Padding = "Padding", // Backend: 300
  Border = "Border", // Backend: 301
  Background = "Background", // Backend: 302
  RoundedCorners = "RoundedCorners", // Backend: 303
  Shadow = "Shadow", // Backend: 304
  DefaultTextStyle = "DefaultTextStyle", // Backend: 305

  // ========================================
  // Sizing Components (12)
  // Backend range: 400-411
  // ========================================
  Width = "Width", // Backend: 400
  Height = "Height", // Backend: 401
  MinWidth = "MinWidth", // Backend: 402
  MaxWidth = "MaxWidth", // Backend: 403
  MinHeight = "MinHeight", // Backend: 404
  MaxHeight = "MaxHeight", // Backend: 405
  Alignment = "Alignment", // Backend: 406
  AspectRatio = "AspectRatio", // Backend: 407
  Extend = "Extend", // Backend: 408
  Shrink = "Shrink", // Backend: 409
  Unconstrained = "Unconstrained", // Backend: 410
  Constrained = "Constrained", // Backend: 411

  // ========================================
  // Transformation Components (5)
  // Backend range: 500-504
  // ========================================
  Rotate = "Rotate", // Backend: 500
  Scale = "Scale", // Backend: 501
  ScaleToFit = "ScaleToFit", // Backend: 502
  Translate = "Translate", // Backend: 503
  Flip = "Flip", // Backend: 504

  // ========================================
  // Flow Control Components (8)
  // Backend range: 600-607
  // ========================================
  PageBreak = "PageBreak", // Backend: 600
  EnsureSpace = "EnsureSpace", // Backend: 601
  ShowEntire = "ShowEntire", // Backend: 602
  StopPaging = "StopPaging", // Backend: 603
  Section = "Section", // Backend: 604
  Repeat = "Repeat", // Backend: 605
  ShowOnce = "ShowOnce", // Backend: 606
  SkipOnce = "SkipOnce", // Backend: 607

  // ========================================
  // Special/Debug Components (4)
  // Backend range: 700-703
  // ========================================
  ContentDirection = "ContentDirection", // Backend: 700
  ZIndex = "ZIndex", // Backend: 701
  DebugArea = "DebugArea", // Backend: 702
  DebugPointer = "DebugPointer", // Backend: 703

  // ========================================
  // Conditional Components (2)
  // Backend range: 800-801
  // ========================================
  ShowIf = "ShowIf", // Backend: 800
  PreventPageBreak = "PreventPageBreak", // Backend: 801
}

/**
 * Component category for palette organization
 * Aligned with backend ComponentRegistry categories
 */
export type ComponentCategory =
  | "container"
  | "content"
  | "styling"
  | "sizing"
  | "transformation"
  | "flowControl"
  | "special"
  | "conditional";

/**
 * Priority tier for implementation order
 * Tier 1: Essential (MVP)
 * Tier 2: Common
 * Tier 3: Advanced
 * Tier 4: Specialized
 */
export type PriorityTier = 1 | 2 | 3 | 4;

/**
 * Property type definitions for component properties
 */
export type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "expression"
  | "enum"
  | "unit"
  | "font"
  | "image"
  | "array"
  | "object";

/**
 * Unit types for sizing properties
 */
export type UnitType = "pt" | "cm" | "inch" | "mm" | "%";

/**
 * Image fit options
 */
export type ImageFit =
  | "fill"
  | "contain"
  | "cover"
  | "width"
  | "height"
  | "area"
  | "unproportional";

/**
 * Text alignment options
 */
export type TextAlignment =
  | "left"
  | "center"
  | "right"
  | "justify"
  | "start"
  | "end";

/**
 * Horizontal alignment options
 */
export type HorizontalAlignment = "left" | "center" | "right" | "start" | "end";

/**
 * Vertical alignment options
 */
export type VerticalAlignment = "top" | "middle" | "center" | "bottom";

/**
 * Font weight options
 */
export type FontWeight =
  | "thin"
  | "extraLight"
  | "light"
  | "normal"
  | "medium"
  | "semiBold"
  | "bold"
  | "extraBold"
  | "black"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

/**
 * Font style options
 */
export type FontStyle = "normal" | "italic" | "oblique";

/**
 * Text decoration options
 */
export type TextDecoration = "none" | "underline" | "strikethrough";

/**
 * Content direction options
 */
export type ContentDirectionType = "ltr" | "rtl";

/**
 * Line orientation options
 */
export type LineOrientation = "horizontal" | "vertical";

/**
 * List type options
 */
export type ListType = "ordered" | "unordered";

/**
 * Barcode format options
 */
export type BarcodeFormat =
  | "code128"
  | "ean8"
  | "ean13"
  | "upca"
  | "code39"
  | "dataMatrix"
  | "pdf417";

/**
 * Property definition for component metadata
 */
export interface PropertyDefinition {
  /** Property name (key in properties object) */
  name: string;
  /** Property data type */
  type: PropertyType;
  /** Display label in the UI */
  label: string;
  /** Help text description */
  description?: string;
  /** Default value when not specified */
  defaultValue: unknown;
  /** Whether the property is required */
  required?: boolean;
  /** Options for enum types */
  options?: { label: string; value: string | number }[];
  /** Minimum value for numbers */
  min?: number;
  /** Maximum value for numbers */
  max?: number;
  /** Step value for number inputs */
  step?: number;
  /** Unit suffix (e.g., "pt", "px") */
  unit?: string;
  /** Whether the field supports expressions {{ data.field }} */
  supportsExpression?: boolean;
  /** Example values for the UI */
  examples?: string[];
}

/**
 * Component metadata for the palette and property panel
 */
export interface ComponentMetadata {
  /** Component type identifier */
  id: ComponentType;
  /** Display name */
  name: string;
  /** Category for palette grouping */
  category: ComponentCategory;
  /** Lucide icon name */
  icon: string;
  /** Description for tooltips */
  description: string;
  /** Default properties when component is created */
  defaultProperties: Record<string, unknown>;
  /** Property definitions for the properties panel */
  propertySchema: PropertyDefinition[];
  /** Whether the component can have children */
  allowsChildren: boolean;
  /** Whether it's a wrapper (single child) vs container (multiple children) */
  isWrapper?: boolean;
  /** Required parent component types (if any) */
  requiredParent?: ComponentType[];
  /** Implementation priority tier (1-4) */
  priorityTier: PriorityTier;
  /** QuestPDF API reference */
  questPdfApi?: string;
}

/**
 * Style properties that can be inherited by child components
 * Aligned with backend StylePropertiesDto
 */
export interface StyleProperties {
  // Text Styling Properties
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  color?: string;
  textDecoration?: TextDecoration;
  lineHeight?: number;
  letterSpacing?: number;
  textAlignment?: TextAlignment;

  // Layout Properties
  horizontalAlignment?: HorizontalAlignment;
  verticalAlignment?: VerticalAlignment;

  // Spacing Properties (match backend StylePropertiesDto)
  /** Uniform padding on all sides in points */
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;

  // Visual Properties
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderTop?: number;
  borderRight?: number;
  borderBottom?: number;
  borderLeft?: number;
  /** Border radius for rounded corners in points */
  borderRadius?: number;
  /** Opacity (0.0 to 1.0) */
  opacity?: number;
}

/**
 * Layout node representing a component in the canvas tree
 * Aligned with backend LayoutNodeDto
 */
export interface LayoutNode {
  /** Unique node identifier (max 100 chars) */
  id: string;
  /** Component type */
  type: ComponentType;
  /** Component-specific properties */
  properties: Record<string, unknown>;
  /** Children for container components (multiple children) */
  children?: LayoutNode[];
  /** Single child for wrapper components */
  child?: LayoutNode;
  /** Inherited style properties */
  style?: StyleProperties;
  /** Conditional visibility expression */
  visible?: string;
  /** Data binding for repetition */
  repeatFor?: string;
  repeatAs?: string;
  repeatIndex?: string;
  /**
   * Parent node ID (frontend-only, used for tree navigation)
   * Not serialized to backend
   */
  parentId?: string;
}

/**
 * Component registry type for accessing component metadata
 */
export type ComponentRegistry = Record<ComponentType, ComponentMetadata>;

/**
 * Helper function to check if a component is a container (multiple children)
 */
export function isContainerComponent(type: ComponentType): boolean {
  const containers: ComponentType[] = [
    ComponentType.Column,
    ComponentType.Row,
    ComponentType.Table,
    ComponentType.Layers,
    ComponentType.Decoration,
    ComponentType.Inlined,
    ComponentType.MultiColumn,
    ComponentType.List,
  ];
  return containers.includes(type);
}

/**
 * Helper function to check if a component is a wrapper (single child)
 */
export function isWrapperComponent(type: ComponentType): boolean {
  const wrappers: ComponentType[] = [
    ComponentType.Padding,
    ComponentType.Border,
    ComponentType.Background,
    ComponentType.RoundedCorners,
    ComponentType.Shadow,
    ComponentType.DefaultTextStyle,
    ComponentType.Width,
    ComponentType.Height,
    ComponentType.MinWidth,
    ComponentType.MaxWidth,
    ComponentType.MinHeight,
    ComponentType.MaxHeight,
    ComponentType.Alignment,
    ComponentType.AspectRatio,
    ComponentType.Extend,
    ComponentType.Shrink,
    ComponentType.Unconstrained,
    ComponentType.Constrained,
    ComponentType.Rotate,
    ComponentType.Scale,
    ComponentType.ScaleToFit,
    ComponentType.Translate,
    ComponentType.Flip,
    ComponentType.EnsureSpace,
    ComponentType.ShowEntire,
    ComponentType.StopPaging,
    ComponentType.Section,
    ComponentType.Repeat,
    ComponentType.ShowOnce,
    ComponentType.SkipOnce,
    ComponentType.ContentDirection,
    ComponentType.ZIndex,
    ComponentType.DebugArea,
    ComponentType.DebugPointer,
    ComponentType.ShowIf,
    ComponentType.PreventPageBreak,
    ComponentType.Hyperlink,
  ];
  return wrappers.includes(type);
}

/**
 * Helper function to check if a component is a leaf (no children)
 * Aligned with backend ComponentTypeExtensions.IsLeaf()
 */
export function isLeafComponent(type: ComponentType): boolean {
  const leaves: ComponentType[] = [
    ComponentType.Text,
    ComponentType.Image,
    ComponentType.Line,
    ComponentType.Placeholder,
    ComponentType.Canvas,
    ComponentType.Barcode,
    ComponentType.QRCode,
    ComponentType.PageBreak,
  ];
  return leaves.includes(type);
}

/**
 * Get the category of a component type
 */
export function getComponentCategory(type: ComponentType): ComponentCategory {
  const categoryMap: Record<ComponentType, ComponentCategory> = {
    // Container (100-106 in backend)
    [ComponentType.Column]: "container",
    [ComponentType.Row]: "container",
    [ComponentType.Table]: "container",
    [ComponentType.Layers]: "container",
    [ComponentType.Decoration]: "container",
    [ComponentType.Inlined]: "container",
    [ComponentType.MultiColumn]: "container",
    // Content (200-208 in backend)
    [ComponentType.Text]: "content",
    [ComponentType.Image]: "content",
    [ComponentType.Line]: "content",
    [ComponentType.Placeholder]: "content",
    [ComponentType.Hyperlink]: "content",
    [ComponentType.List]: "content", // List = 205 in backend (Content range)
    [ComponentType.Canvas]: "content",
    [ComponentType.Barcode]: "content",
    [ComponentType.QRCode]: "content",
    // Styling
    [ComponentType.Padding]: "styling",
    [ComponentType.Border]: "styling",
    [ComponentType.Background]: "styling",
    [ComponentType.RoundedCorners]: "styling",
    [ComponentType.Shadow]: "styling",
    [ComponentType.DefaultTextStyle]: "styling",
    // Sizing
    [ComponentType.Width]: "sizing",
    [ComponentType.Height]: "sizing",
    [ComponentType.MinWidth]: "sizing",
    [ComponentType.MaxWidth]: "sizing",
    [ComponentType.MinHeight]: "sizing",
    [ComponentType.MaxHeight]: "sizing",
    [ComponentType.Alignment]: "sizing",
    [ComponentType.AspectRatio]: "sizing",
    [ComponentType.Extend]: "sizing",
    [ComponentType.Shrink]: "sizing",
    [ComponentType.Unconstrained]: "sizing",
    [ComponentType.Constrained]: "sizing",
    // Transformation
    [ComponentType.Rotate]: "transformation",
    [ComponentType.Scale]: "transformation",
    [ComponentType.ScaleToFit]: "transformation",
    [ComponentType.Translate]: "transformation",
    [ComponentType.Flip]: "transformation",
    // Flow Control
    [ComponentType.PageBreak]: "flowControl",
    [ComponentType.EnsureSpace]: "flowControl",
    [ComponentType.ShowEntire]: "flowControl",
    [ComponentType.StopPaging]: "flowControl",
    [ComponentType.Section]: "flowControl",
    [ComponentType.Repeat]: "flowControl",
    [ComponentType.ShowOnce]: "flowControl",
    [ComponentType.SkipOnce]: "flowControl",
    // Special
    [ComponentType.ContentDirection]: "special",
    [ComponentType.ZIndex]: "special",
    [ComponentType.DebugArea]: "special",
    [ComponentType.DebugPointer]: "special",
    // Conditional
    [ComponentType.ShowIf]: "conditional",
    [ComponentType.PreventPageBreak]: "conditional",
  };
  return categoryMap[type];
}
