/**
 * Property Section Configuration
 * Determines which property sections to show based on component type
 *
 * This maps each component category/type to the relevant property groups
 * to display in the properties panel.
 */

import type { ComponentType, ComponentCategory } from "@/types/component";
import { getComponentMetadata } from "@/lib/constants/components";

// ============================================================================
// Types
// ============================================================================

/**
 * Property section identifiers
 */
export type PropertySectionId =
  | "content"
  | "sizing"
  | "styling"
  | "layout"
  | "transform"
  | "flow"
  | "advanced";

/**
 * Property section configuration
 */
export interface PropertySectionConfig {
  /** Section identifier */
  id: PropertySectionId;
  /** Display label */
  label: string;
  /** Whether the section is visible for this component */
  visible: boolean;
  /** Whether the section should be initially collapsed */
  defaultCollapsed: boolean;
  /** Order in which sections appear (lower = higher) */
  order: number;
}

// ============================================================================
// Section Visibility Rules
// ============================================================================

/**
 * Components that show content properties (text, images, values)
 */
const CONTENT_COMPONENTS: ComponentType[] = [
  "Text" as ComponentType,
  "Image" as ComponentType,
  "Line" as ComponentType,
  "Placeholder" as ComponentType,
  "Hyperlink" as ComponentType,
  "List" as ComponentType,
  "Canvas" as ComponentType,
  "Barcode" as ComponentType,
  "QRCode" as ComponentType,
];

/**
 * Components that show sizing properties
 */
const SIZING_COMPONENTS: ComponentType[] = [
  "Column" as ComponentType,
  "Row" as ComponentType,
  "Table" as ComponentType,
  "Image" as ComponentType,
  "Canvas" as ComponentType,
  "Width" as ComponentType,
  "Height" as ComponentType,
  "MinWidth" as ComponentType,
  "MaxWidth" as ComponentType,
  "MinHeight" as ComponentType,
  "MaxHeight" as ComponentType,
  "AspectRatio" as ComponentType,
  "Extend" as ComponentType,
  "Shrink" as ComponentType,
  "Unconstrained" as ComponentType,
  "Constrained" as ComponentType,
  "Alignment" as ComponentType,
];

/**
 * Components that show styling properties (padding, border, background)
 */
const STYLING_COMPONENTS: ComponentType[] = [
  "Padding" as ComponentType,
  "Border" as ComponentType,
  "Background" as ComponentType,
  "RoundedCorners" as ComponentType,
  "Shadow" as ComponentType,
  "DefaultTextStyle" as ComponentType,
  "Text" as ComponentType,
];

/**
 * Components that show layout properties (spacing, alignment)
 */
const LAYOUT_COMPONENTS: ComponentType[] = [
  "Column" as ComponentType,
  "Row" as ComponentType,
  "Table" as ComponentType,
  "Layers" as ComponentType,
  "Decoration" as ComponentType,
  "Inlined" as ComponentType,
  "MultiColumn" as ComponentType,
  "List" as ComponentType,
];

/**
 * Components that show transform properties (rotation, scale, translate)
 */
const TRANSFORM_COMPONENTS: ComponentType[] = [
  "Rotate" as ComponentType,
  "Scale" as ComponentType,
  "ScaleToFit" as ComponentType,
  "Translate" as ComponentType,
  "Flip" as ComponentType,
];

/**
 * Components that show flow control properties
 */
const FLOW_COMPONENTS: ComponentType[] = [
  "PageBreak" as ComponentType,
  "EnsureSpace" as ComponentType,
  "ShowEntire" as ComponentType,
  "StopPaging" as ComponentType,
  "Section" as ComponentType,
  "Repeat" as ComponentType,
  "ShowOnce" as ComponentType,
  "SkipOnce" as ComponentType,
  "ShowIf" as ComponentType,
  "PreventPageBreak" as ComponentType,
];

/**
 * Components that show advanced properties (debug, direction, z-index)
 */
const ADVANCED_COMPONENTS: ComponentType[] = [
  "ContentDirection" as ComponentType,
  "ZIndex" as ComponentType,
  "DebugArea" as ComponentType,
  "DebugPointer" as ComponentType,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a component type is in a list
 */
function isInList(type: ComponentType, list: ComponentType[]): boolean {
  return list.includes(type);
}

/**
 * Get property sections configuration for a component type
 */
export function getPropertySections(
  type: ComponentType
): PropertySectionConfig[] {
  const metadata = getComponentMetadata(type);
  const hasProperties = metadata.propertySchema.length > 0;

  const sections: PropertySectionConfig[] = [
    {
      id: "content",
      label: "Content",
      visible: isInList(type, CONTENT_COMPONENTS),
      defaultCollapsed: false,
      order: 1,
    },
    {
      id: "sizing",
      label: "Size & Position",
      visible: isInList(type, SIZING_COMPONENTS),
      defaultCollapsed: false,
      order: 2,
    },
    {
      id: "layout",
      label: "Layout",
      visible: isInList(type, LAYOUT_COMPONENTS),
      defaultCollapsed: false,
      order: 3,
    },
    {
      id: "styling",
      label: "Styling",
      visible: isInList(type, STYLING_COMPONENTS),
      defaultCollapsed: false,
      order: 4,
    },
    {
      id: "transform",
      label: "Transform",
      visible: isInList(type, TRANSFORM_COMPONENTS),
      defaultCollapsed: false,
      order: 5,
    },
    {
      id: "flow",
      label: "Flow Control",
      visible: isInList(type, FLOW_COMPONENTS),
      defaultCollapsed: false,
      order: 6,
    },
    {
      id: "advanced",
      label: "Advanced",
      visible: isInList(type, ADVANCED_COMPONENTS) || hasProperties,
      defaultCollapsed: true,
      order: 7,
    },
  ];

  // Filter to only visible sections and sort by order
  return sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);
}

/**
 * Get properties grouped by section for a component
 */
export function getPropertiesBySection(
  type: ComponentType
): Record<PropertySectionId, string[]> {
  const metadata = getComponentMetadata(type);
  const propertyNames = metadata.propertySchema.map((p) => p.name);

  // Content properties
  const contentProps = ["content", "source", "value", "url", "label", "spans"];

  // Sizing properties
  const sizingProps = [
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
    "size",
    "ratio",
    "alignment",
  ];

  // Layout properties
  const layoutProps = [
    "spacing",
    "verticalSpacing",
    "horizontalSpacing",
    "columnCount",
    "columns",
    "rows",
    "baselineAlignment",
  ];

  // Styling properties
  const stylingProps = [
    "color",
    "backgroundColor",
    "borderColor",
    "borderWidth",
    "thickness",
    "all",
    "top",
    "right",
    "bottom",
    "left",
    "horizontal",
    "vertical",
    "radius",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "textDecoration",
    "lineHeight",
    "letterSpacing",
  ];

  // Transform properties
  const transformProps = [
    "angle",
    "scaleX",
    "scaleY",
    "scale",
    "translateX",
    "translateY",
    "horizontal",
    "vertical",
  ];

  // Flow properties
  const flowProps = [
    "minHeight",
    "condition",
    "repeatFor",
    "repeatAs",
    "repeatIndex",
  ];

  // Advanced properties
  const advancedProps = [
    "direction",
    "zIndex",
    "showLabel",
    "format",
    "commands",
    "fit",
    "orientation",
    "listType",
    "bulletCharacter",
    "header",
    "footer",
    "before",
    "after",
  ];

  // Filter properties to only include those that exist in the schema
  const filterProps = (props: string[]) =>
    propertyNames.filter((name) => props.includes(name));

  return {
    content: filterProps(contentProps),
    sizing: filterProps(sizingProps),
    layout: filterProps(layoutProps),
    styling: filterProps(stylingProps),
    transform: filterProps(transformProps),
    flow: filterProps(flowProps),
    advanced: filterProps(advancedProps),
  };
}

/**
 * Get category-based section visibility
 */
export function getSectionsByCategory(
  category: ComponentCategory
): PropertySectionId[] {
  const categoryMap: Record<ComponentCategory, PropertySectionId[]> = {
    container: ["layout", "sizing"],
    content: ["content", "sizing", "styling"],
    styling: ["styling"],
    sizing: ["sizing"],
    transformation: ["transform"],
    flowControl: ["flow"],
    special: ["advanced"],
    conditional: ["flow", "advanced"],
  };

  return categoryMap[category] || [];
}

/**
 * Check if a component has any visible properties
 */
export function hasVisibleProperties(type: ComponentType): boolean {
  const sections = getPropertySections(type);
  return sections.length > 0;
}
