/**
 * Default Property Values for All Components
 * Centralized default values aligned with backend ComponentRegistry
 * Used when creating new component instances
 */

import { ComponentType } from "@/types/component";

/**
 * Type-safe default properties for each component type
 */
export type ComponentDefaults = {
  [K in ComponentType]: Record<string, unknown>;
};

/**
 * Default properties for all components
 * Aligned with backend PDFBuilder.Engine.Services.ComponentRegistry
 */
export const COMPONENT_DEFAULTS: ComponentDefaults = {
  // ============================================================================
  // Container Components (7) - Backend range: 100-106
  // ============================================================================
  [ComponentType.Column]: {
    spacing: 0,
  },
  [ComponentType.Row]: {
    spacing: 0,
  },
  [ComponentType.Table]: {
    columns: [{ type: "relative", value: 1 }],
    rows: [],
    header: null,
    footer: null,
  },
  [ComponentType.Layers]: {},
  [ComponentType.Decoration]: {
    before: null,
    after: null,
  },
  [ComponentType.Inlined]: {
    spacing: 0,
    verticalSpacing: 0,
    baselineAlignment: false,
  },
  [ComponentType.MultiColumn]: {
    columnCount: 2,
    spacing: 10,
  },

  // ============================================================================
  // Content Components (9) - Backend range: 200-208
  // ============================================================================
  [ComponentType.Text]: {
    content: "Text content",
    spans: [],
  },
  [ComponentType.Image]: {
    source: "",
    fit: "contain",
  },
  [ComponentType.Line]: {
    orientation: "horizontal",
    thickness: 1,
    color: "#000000",
  },
  [ComponentType.Placeholder]: {
    label: "Placeholder",
  },
  [ComponentType.Hyperlink]: {
    url: "https://example.com",
  },
  [ComponentType.List]: {
    listType: "unordered",
    spacing: 5,
    bulletCharacter: "•",
  },
  [ComponentType.Canvas]: {
    width: 100,
    height: 100,
    commands: [],
  },
  [ComponentType.Barcode]: {
    value: "1234567890",
    format: "code128",
  },
  [ComponentType.QRCode]: {
    value: "https://example.com",
    size: 100,
  },

  // ============================================================================
  // Styling Components (6) - Backend range: 300-305
  // ============================================================================
  [ComponentType.Padding]: {
    all: 10,
  },
  [ComponentType.Border]: {
    thickness: 1,
    color: "#000000",
  },
  [ComponentType.Background]: {
    color: "#f5f5f5",
  },
  [ComponentType.RoundedCorners]: {
    radius: 5,
  },
  [ComponentType.Shadow]: {
    color: "#00000033",
    blurRadius: 5,
    offsetX: 2,
    offsetY: 2,
  },
  [ComponentType.DefaultTextStyle]: {
    fontSize: 12,
    fontWeight: "normal",
    color: "#000000",
  },

  // ============================================================================
  // Sizing Components (12) - Backend range: 400-411
  // ============================================================================
  [ComponentType.Width]: {
    value: 100,
    unit: "pt",
  },
  [ComponentType.Height]: {
    value: 100,
    unit: "pt",
  },
  [ComponentType.MinWidth]: {
    value: 50,
  },
  [ComponentType.MaxWidth]: {
    value: 200,
  },
  [ComponentType.MinHeight]: {
    value: 50,
  },
  [ComponentType.MaxHeight]: {
    value: 200,
  },
  [ComponentType.Alignment]: {
    horizontal: "center",
    vertical: "middle",
  },
  [ComponentType.AspectRatio]: {
    ratio: 1.777, // 16:9
  },
  [ComponentType.Extend]: {},
  [ComponentType.Shrink]: {},
  [ComponentType.Unconstrained]: {},
  [ComponentType.Constrained]: {},

  // ============================================================================
  // Transformation Components (5) - Backend range: 500-504
  // ============================================================================
  [ComponentType.Rotate]: {
    angle: 0,
  },
  [ComponentType.Scale]: {
    factor: 1,
  },
  [ComponentType.ScaleToFit]: {},
  [ComponentType.Translate]: {
    x: 0,
    y: 0,
  },
  [ComponentType.Flip]: {
    horizontal: false,
    vertical: false,
  },

  // ============================================================================
  // Flow Control Components (8) - Backend range: 600-607
  // ============================================================================
  [ComponentType.PageBreak]: {},
  [ComponentType.EnsureSpace]: {
    minHeight: 100,
  },
  [ComponentType.ShowEntire]: {},
  [ComponentType.StopPaging]: {},
  [ComponentType.Section]: {
    name: "Section",
  },
  [ComponentType.Repeat]: {},
  [ComponentType.ShowOnce]: {},
  [ComponentType.SkipOnce]: {},

  // ============================================================================
  // Special Components (4) - Backend range: 700-703
  // ============================================================================
  [ComponentType.ContentDirection]: {
    direction: "ltr",
  },
  [ComponentType.ZIndex]: {
    index: 0,
  },
  [ComponentType.DebugArea]: {
    label: "Debug",
    color: "#FF0000",
  },
  [ComponentType.DebugPointer]: {
    label: "Pointer",
    color: "#FF0000",
  },

  // ============================================================================
  // Conditional Components (2) - Backend range: 800-801
  // ============================================================================
  [ComponentType.ShowIf]: {
    condition: "{{ true }}",
  },
  [ComponentType.PreventPageBreak]: {},
};

/**
 * Get default properties for a component type
 */
export function getDefaultPropertiesForType(
  type: ComponentType
): Record<string, unknown> {
  return { ...COMPONENT_DEFAULTS[type] };
}

/**
 * Check if a component type has any default properties
 */
export function hasDefaultProperties(type: ComponentType): boolean {
  return Object.keys(COMPONENT_DEFAULTS[type]).length > 0;
}

/**
 * Merge user properties with defaults
 * User properties take precedence over defaults
 */
export function mergeWithDefaults(
  type: ComponentType,
  properties: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...COMPONENT_DEFAULTS[type],
    ...properties,
  };
}
