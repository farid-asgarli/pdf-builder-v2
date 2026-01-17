/**
 * Component Category Structure
 * Defines categories for the component palette
 * Aligned with backend ComponentType enum ranges
 */

import {
  LayoutGrid,
  FileText,
  Palette,
  Maximize,
  RotateCcw,
  GitBranch,
  Settings,
  Folder,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentCategory, ComponentType } from "@/types/component";

/**
 * Category icon map for type-safe icon lookup
 */
export const CATEGORY_ICON_MAP: Record<ComponentCategory, LucideIcon> = {
  container: LayoutGrid,
  content: FileText,
  styling: Palette,
  sizing: Maximize,
  transformation: RotateCcw,
  flowControl: GitBranch,
  special: Settings,
  conditional: GitBranch,
};

/**
 * Get category icon component
 */
export function getCategoryIcon(category: ComponentCategory): LucideIcon {
  return CATEGORY_ICON_MAP[category] || Folder;
}

/**
 * Category metadata for UI display
 */
export interface CategoryMetadata {
  /** Category identifier */
  id: ComponentCategory;
  /** Display label */
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Description for tooltips */
  description: string;
  /** Display order in palette (lower = higher) */
  order: number;
  /** Backend enum range start */
  backendRangeStart: number;
  /** Backend enum range end */
  backendRangeEnd: number;
  /** Color for visual distinction */
  color: string;
}

/**
 * Complete category metadata registry
 */
export const CATEGORY_METADATA: Record<ComponentCategory, CategoryMetadata> = {
  container: {
    id: "container",
    label: "Layout",
    icon: "LayoutGrid",
    description:
      "Container components for layout structure (Column, Row, Table)",
    order: 1,
    backendRangeStart: 100,
    backendRangeEnd: 106,
    color: "#3B82F6", // Blue
  },
  content: {
    id: "content",
    label: "Content",
    icon: "FileText",
    description: "Content components for text, images, and data display",
    order: 2,
    backendRangeStart: 200,
    backendRangeEnd: 208,
    color: "#10B981", // Green
  },
  styling: {
    id: "styling",
    label: "Styling",
    icon: "Palette",
    description: "Visual styling components (padding, border, background)",
    order: 3,
    backendRangeStart: 300,
    backendRangeEnd: 305,
    color: "#8B5CF6", // Purple
  },
  sizing: {
    id: "sizing",
    label: "Sizing",
    icon: "Maximize",
    description: "Size and alignment constraints",
    order: 4,
    backendRangeStart: 400,
    backendRangeEnd: 411,
    color: "#F59E0B", // Amber
  },
  transformation: {
    id: "transformation",
    label: "Transform",
    icon: "RotateCcw",
    description: "Transformation components (rotate, scale, translate)",
    order: 5,
    backendRangeStart: 500,
    backendRangeEnd: 504,
    color: "#EF4444", // Red
  },
  flowControl: {
    id: "flowControl",
    label: "Flow Control",
    icon: "GitBranch",
    description: "Page flow and pagination control",
    order: 6,
    backendRangeStart: 600,
    backendRangeEnd: 607,
    color: "#06B6D4", // Cyan
  },
  special: {
    id: "special",
    label: "Special",
    icon: "Settings",
    description: "Special and debug components",
    order: 7,
    backendRangeStart: 700,
    backendRangeEnd: 703,
    color: "#6B7280", // Gray
  },
  conditional: {
    id: "conditional",
    label: "Conditional",
    icon: "GitBranch",
    description: "Conditional rendering and page break control",
    order: 8,
    backendRangeStart: 800,
    backendRangeEnd: 801,
    color: "#EC4899", // Pink
  },
};

/**
 * Get sorted list of categories for palette display
 */
export function getSortedCategories(): CategoryMetadata[] {
  return Object.values(CATEGORY_METADATA).sort((a, b) => a.order - b.order);
}

/**
 * Get category metadata by ID
 */
export function getCategoryMetadata(
  category: ComponentCategory
): CategoryMetadata {
  return CATEGORY_METADATA[category];
}

/**
 * Category component counts (for display)
 */
export const CATEGORY_COMPONENT_COUNTS: Record<ComponentCategory, number> = {
  container: 7, // Column, Row, Table, Layers, Decoration, Inlined, MultiColumn
  content: 9, // Text, Image, Line, Placeholder, Hyperlink, List, Canvas, Barcode, QRCode
  styling: 6, // Padding, Border, Background, RoundedCorners, Shadow, DefaultTextStyle
  sizing: 12, // Width, Height, MinWidth, MaxWidth, MinHeight, MaxHeight, Alignment, AspectRatio, Extend, Shrink, Unconstrained, Constrained
  transformation: 5, // Rotate, Scale, ScaleToFit, Translate, Flip
  flowControl: 8, // PageBreak, EnsureSpace, ShowEntire, StopPaging, Section, Repeat, ShowOnce, SkipOnce
  special: 4, // ContentDirection, ZIndex, DebugArea, DebugPointer
  conditional: 2, // ShowIf, PreventPageBreak
};

/**
 * Components grouped by category (type enums only)
 */
export const COMPONENTS_BY_CATEGORY: Record<
  ComponentCategory,
  ComponentType[]
> = {
  container: [
    "Column" as ComponentType,
    "Row" as ComponentType,
    "Table" as ComponentType,
    "Layers" as ComponentType,
    "Decoration" as ComponentType,
    "Inlined" as ComponentType,
    "MultiColumn" as ComponentType,
  ],
  content: [
    "Text" as ComponentType,
    "Image" as ComponentType,
    "Line" as ComponentType,
    "Placeholder" as ComponentType,
    "Hyperlink" as ComponentType,
    "List" as ComponentType,
    "Canvas" as ComponentType,
    "Barcode" as ComponentType,
    "QRCode" as ComponentType,
  ],
  styling: [
    "Padding" as ComponentType,
    "Border" as ComponentType,
    "Background" as ComponentType,
    "RoundedCorners" as ComponentType,
    "Shadow" as ComponentType,
    "DefaultTextStyle" as ComponentType,
  ],
  sizing: [
    "Width" as ComponentType,
    "Height" as ComponentType,
    "MinWidth" as ComponentType,
    "MaxWidth" as ComponentType,
    "MinHeight" as ComponentType,
    "MaxHeight" as ComponentType,
    "Alignment" as ComponentType,
    "AspectRatio" as ComponentType,
    "Extend" as ComponentType,
    "Shrink" as ComponentType,
    "Unconstrained" as ComponentType,
    "Constrained" as ComponentType,
  ],
  transformation: [
    "Rotate" as ComponentType,
    "Scale" as ComponentType,
    "ScaleToFit" as ComponentType,
    "Translate" as ComponentType,
    "Flip" as ComponentType,
  ],
  flowControl: [
    "PageBreak" as ComponentType,
    "EnsureSpace" as ComponentType,
    "ShowEntire" as ComponentType,
    "StopPaging" as ComponentType,
    "Section" as ComponentType,
    "Repeat" as ComponentType,
    "ShowOnce" as ComponentType,
    "SkipOnce" as ComponentType,
  ],
  special: [
    "ContentDirection" as ComponentType,
    "ZIndex" as ComponentType,
    "DebugArea" as ComponentType,
    "DebugPointer" as ComponentType,
  ],
  conditional: ["ShowIf" as ComponentType, "PreventPageBreak" as ComponentType],
};

/**
 * Priority tier definitions for implementation ordering
 */
export interface PriorityTierInfo {
  tier: 1 | 2 | 3 | 4;
  label: string;
  description: string;
}

export const PRIORITY_TIERS: PriorityTierInfo[] = [
  {
    tier: 1,
    label: "Essential (MVP)",
    description: "Core components required for basic PDF generation",
  },
  {
    tier: 2,
    label: "Common",
    description: "Frequently used components for typical documents",
  },
  {
    tier: 3,
    label: "Advanced",
    description: "Advanced features for complex layouts",
  },
  {
    tier: 4,
    label: "Specialized",
    description: "Specialized components for edge cases",
  },
];

/**
 * Quick filter presets for the palette
 */
export interface FilterPreset {
  id: string;
  label: string;
  categories: ComponentCategory[];
  description: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "all",
    label: "All Components",
    categories: [
      "container",
      "content",
      "styling",
      "sizing",
      "transformation",
      "flowControl",
      "special",
      "conditional",
    ],
    description: "Show all available components",
  },
  {
    id: "essential",
    label: "Essential",
    categories: ["container", "content"],
    description: "Layout and content components",
  },
  {
    id: "styling",
    label: "Styling",
    categories: ["styling", "sizing", "transformation"],
    description: "Visual styling and sizing",
  },
  {
    id: "advanced",
    label: "Advanced",
    categories: ["flowControl", "special", "conditional"],
    description: "Flow control and special components",
  },
];
