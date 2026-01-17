/**
 * StylingProperties Component
 * Property group for styling-related properties
 *
 * Features:
 * - Padding configuration (all sides, horizontal/vertical, individual)
 * - Border settings (thickness, color, individual sides)
 * - Background color
 * - Rounded corners radius
 * - Shadow configuration (color, blur, offset)
 * - Default text style (font, size, color, weight, etc.)
 * - Real-time two-way binding with canvas store
 */
"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/store/selection-store";
import { useCanvasStore } from "@/store/canvas-store";
import { NumberField, ColorPicker, FontPicker, SelectField } from "../fields";
import type { SelectOption } from "../fields/SelectField";
import type { ComponentType, LayoutNode } from "@/types/component";
import {
  Square,
  Palette,
  BoxSelect,
  CircleDot,
  Type,
  MoreHorizontal,
  Link2,
  Link2Off,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for StylingProperties component
 */
export interface StylingPropertiesProps {
  /** Component ID to display properties for (overrides selection) */
  componentId?: string;
  /** Whether to use selection store for component ID */
  useSelection?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Padding mode type
 */
type PaddingMode = "all" | "axis" | "individual";

// ============================================================================
// Constants
// ============================================================================

/**
 * Font weight options
 */
const FONT_WEIGHT_OPTIONS: SelectOption[] = [
  { label: "Thin (100)", value: "100" },
  { label: "Light (300)", value: "300" },
  { label: "Normal (400)", value: "400" },
  { label: "Medium (500)", value: "500" },
  { label: "Semi-Bold (600)", value: "600" },
  { label: "Bold (700)", value: "700" },
  { label: "Extra Bold (800)", value: "800" },
  { label: "Black (900)", value: "900" },
];

/**
 * Font style options
 */
const FONT_STYLE_OPTIONS: SelectOption[] = [
  { label: "Normal", value: "normal" },
  { label: "Italic", value: "italic" },
  { label: "Oblique", value: "oblique" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the styling type section to show based on component type
 */
function getStylingType(
  componentType: ComponentType | null
):
  | "padding"
  | "border"
  | "background"
  | "roundedCorners"
  | "shadow"
  | "defaultTextStyle"
  | "text"
  | null {
  if (!componentType) return null;

  switch (componentType) {
    case "Padding":
      return "padding";
    case "Border":
      return "border";
    case "Background":
      return "background";
    case "RoundedCorners":
      return "roundedCorners";
    case "Shadow":
      return "shadow";
    case "DefaultTextStyle":
      return "defaultTextStyle";
    case "Text":
      return "text";
    default:
      return null;
  }
}

/**
 * Get properties from component
 */
function getProperties(component: LayoutNode | null): Record<string, unknown> {
  return component?.properties ?? {};
}

/**
 * Determine padding mode from properties
 */
function getPaddingMode(properties: Record<string, unknown>): PaddingMode {
  const hasIndividual =
    properties.top !== undefined ||
    properties.right !== undefined ||
    properties.bottom !== undefined ||
    properties.left !== undefined;

  const hasAxis =
    properties.horizontal !== undefined || properties.vertical !== undefined;

  if (hasIndividual) return "individual";
  if (hasAxis) return "axis";
  return "all";
}

// ============================================================================
// Sub-Components for Different Styling Types
// ============================================================================

interface StylingTypeProps {
  component: LayoutNode;
  onPropertyChange: (property: string, value: unknown) => void;
  onPropertiesChange: (properties: Record<string, unknown>) => void;
}

/**
 * Padding properties
 */
function PaddingContent({
  component,
  onPropertyChange,
  onPropertiesChange,
}: StylingTypeProps) {
  const properties = getProperties(component);

  // Determine initial mode from existing properties
  const initialMode = getPaddingMode(properties);
  const [paddingMode, setPaddingMode] = useState<PaddingMode>(initialMode);
  const [linkSides, setLinkSides] = useState(true);

  // Extract values
  const all = properties.all as number | undefined;
  const horizontal = properties.horizontal as number | undefined;
  const vertical = properties.vertical as number | undefined;
  const top = properties.top as number | undefined;
  const right = properties.right as number | undefined;
  const bottom = properties.bottom as number | undefined;
  const left = properties.left as number | undefined;

  // Handle mode change with property cleanup
  const handleModeChange = (newMode: PaddingMode) => {
    setPaddingMode(newMode);

    // Clear other mode properties when switching
    if (newMode === "all") {
      onPropertiesChange({
        all: all ?? horizontal ?? vertical ?? top ?? 0,
        horizontal: undefined,
        vertical: undefined,
        top: undefined,
        right: undefined,
        bottom: undefined,
        left: undefined,
      });
    } else if (newMode === "axis") {
      onPropertiesChange({
        all: undefined,
        horizontal: horizontal ?? all ?? left ?? right ?? 0,
        vertical: vertical ?? all ?? top ?? bottom ?? 0,
        top: undefined,
        right: undefined,
        bottom: undefined,
        left: undefined,
      });
    } else {
      onPropertiesChange({
        all: undefined,
        horizontal: undefined,
        vertical: undefined,
        top: top ?? vertical ?? all ?? 0,
        right: right ?? horizontal ?? all ?? 0,
        bottom: bottom ?? vertical ?? all ?? 0,
        left: left ?? horizontal ?? all ?? 0,
      });
    }
  };

  // Handle linked individual padding change
  const handleLinkedChange = (value: number | undefined) => {
    if (linkSides) {
      onPropertiesChange({
        top: value,
        right: value,
        bottom: value,
        left: value,
      });
    } else {
      onPropertyChange("top", value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BoxSelect className="text-muted-foreground h-4 w-4" />
          <Label className="text-xs font-medium">Padding</Label>
        </div>
        {/* Mode Switcher */}
        <div className="flex gap-1">
          <Button
            variant={paddingMode === "all" ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => handleModeChange("all")}
          >
            All
          </Button>
          <Button
            variant={paddingMode === "axis" ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => handleModeChange("axis")}
          >
            Axis
          </Button>
          <Button
            variant={paddingMode === "individual" ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => handleModeChange("individual")}
          >
            Each
          </Button>
        </div>
      </div>

      {/* All Sides */}
      {paddingMode === "all" && (
        <NumberField
          label="All Sides"
          value={all}
          onChange={(v) => onPropertyChange("all", v)}
          unit="px"
          min={0}
          max={100}
          step={1}
          placeholder="0"
          allowEmpty
        />
      )}

      {/* Axis (Horizontal/Vertical) */}
      {paddingMode === "axis" && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Horizontal"
            value={horizontal}
            onChange={(v) => onPropertyChange("horizontal", v)}
            unit="px"
            min={0}
            max={100}
            step={1}
            placeholder="0"
            allowEmpty
          />
          <NumberField
            label="Vertical"
            value={vertical}
            onChange={(v) => onPropertyChange("vertical", v)}
            unit="px"
            min={0}
            max={100}
            step={1}
            placeholder="0"
            allowEmpty
          />
        </div>
      )}

      {/* Individual Sides */}
      {paddingMode === "individual" && (
        <>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant={linkSides ? "default" : "outline"}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setLinkSides(!linkSides)}
              aria-label={linkSides ? "Unlink sides" : "Link sides"}
            >
              {linkSides ? (
                <Link2 className="h-3 w-3" />
              ) : (
                <Link2Off className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Top"
              value={top}
              onChange={
                linkSides
                  ? handleLinkedChange
                  : (v) => onPropertyChange("top", v)
              }
              unit="px"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              allowEmpty
            />
            <NumberField
              label="Right"
              value={right}
              onChange={(v) => onPropertyChange("right", v)}
              unit="px"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              allowEmpty
              disabled={linkSides}
            />
            <NumberField
              label="Bottom"
              value={bottom}
              onChange={(v) => onPropertyChange("bottom", v)}
              unit="px"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              allowEmpty
              disabled={linkSides}
            />
            <NumberField
              label="Left"
              value={left}
              onChange={(v) => onPropertyChange("left", v)}
              unit="px"
              min={0}
              max={100}
              step={1}
              placeholder="0"
              allowEmpty
              disabled={linkSides}
            />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Border properties
 */
function BorderContent({
  component,
  onPropertyChange,
  onPropertiesChange,
}: StylingTypeProps) {
  const properties = getProperties(component);
  const [showIndividual, setShowIndividual] = useState(
    properties.top !== undefined ||
      properties.right !== undefined ||
      properties.bottom !== undefined ||
      properties.left !== undefined
  );

  const thickness = properties.thickness as number | undefined;
  const color = (properties.color as string) ?? "#000000";
  const top = properties.top as number | undefined;
  const right = properties.right as number | undefined;
  const bottom = properties.bottom as number | undefined;
  const left = properties.left as number | undefined;

  const handleShowIndividualChange = (show: boolean) => {
    setShowIndividual(show);
    if (!show) {
      // Clear individual values, keep thickness
      onPropertiesChange({
        thickness: thickness ?? top ?? 1,
        top: undefined,
        right: undefined,
        bottom: undefined,
        left: undefined,
      });
    } else {
      // Set individual values from thickness
      onPropertiesChange({
        thickness: undefined,
        top: thickness ?? 1,
        right: thickness ?? 1,
        bottom: thickness ?? 1,
        left: thickness ?? 1,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Square className="text-muted-foreground h-4 w-4" />
          <Label className="text-xs font-medium">Border</Label>
        </div>
        <Button
          variant={showIndividual ? "default" : "ghost"}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => handleShowIndividualChange(!showIndividual)}
        >
          <MoreHorizontal className="mr-1 h-3 w-3" />
          Each Side
        </Button>
      </div>

      <ColorPicker
        label="Color"
        value={color}
        onChange={(v) => onPropertyChange("color", v ?? "#000000")}
        showPalette
      />

      {!showIndividual ? (
        <NumberField
          label="Thickness"
          value={thickness}
          onChange={(v) => onPropertyChange("thickness", v)}
          unit="px"
          min={0}
          max={20}
          step={0.5}
          placeholder="0"
          allowEmpty
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Top"
            value={top}
            onChange={(v) => onPropertyChange("top", v)}
            unit="px"
            min={0}
            max={20}
            step={0.5}
            placeholder="0"
            allowEmpty
          />
          <NumberField
            label="Right"
            value={right}
            onChange={(v) => onPropertyChange("right", v)}
            unit="px"
            min={0}
            max={20}
            step={0.5}
            placeholder="0"
            allowEmpty
          />
          <NumberField
            label="Bottom"
            value={bottom}
            onChange={(v) => onPropertyChange("bottom", v)}
            unit="px"
            min={0}
            max={20}
            step={0.5}
            placeholder="0"
            allowEmpty
          />
          <NumberField
            label="Left"
            value={left}
            onChange={(v) => onPropertyChange("left", v)}
            unit="px"
            min={0}
            max={20}
            step={0.5}
            placeholder="0"
            allowEmpty
          />
        </div>
      )}
    </div>
  );
}

/**
 * Background properties
 */
function BackgroundContent({ component, onPropertyChange }: StylingTypeProps) {
  const properties = getProperties(component);
  const color = (properties.color as string) ?? "#FFFFFF";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Background</Label>
      </div>
      <ColorPicker
        label="Color"
        value={color}
        onChange={(v) => onPropertyChange("color", v ?? "#FFFFFF")}
        showPalette
        supportsExpression
        helpText="Background fill color"
      />
    </div>
  );
}

/**
 * Rounded corners properties
 */
function RoundedCornersContent({
  component,
  onPropertyChange,
}: StylingTypeProps) {
  const properties = getProperties(component);
  const radius = (properties.radius as number) ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CircleDot className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Rounded Corners</Label>
      </div>
      <NumberField
        label="Corner Radius"
        value={radius}
        onChange={(v) => onPropertyChange("radius", v ?? 0)}
        unit="px"
        min={0}
        max={100}
        step={1}
        helpText="Border radius for all corners"
      />
    </div>
  );
}

/**
 * Shadow properties
 */
function ShadowContent({ component, onPropertyChange }: StylingTypeProps) {
  const properties = getProperties(component);
  const color = (properties.color as string) ?? "rgba(0,0,0,0.25)";
  const blurRadius = (properties.blurRadius as number) ?? 5;
  const offsetX = (properties.offsetX as number) ?? 0;
  const offsetY = (properties.offsetY as number) ?? 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Square className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Shadow</Label>
      </div>

      <ColorPicker
        label="Shadow Color"
        value={color}
        onChange={(v) => onPropertyChange("color", v ?? "rgba(0,0,0,0.25)")}
        helpText="Color with alpha for shadow opacity"
      />

      <NumberField
        label="Blur Radius"
        value={blurRadius}
        onChange={(v) => onPropertyChange("blurRadius", v ?? 5)}
        unit="px"
        min={0}
        max={50}
        step={1}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Offset X"
          value={offsetX}
          onChange={(v) => onPropertyChange("offsetX", v ?? 0)}
          unit="px"
          min={-50}
          max={50}
          step={1}
        />
        <NumberField
          label="Offset Y"
          value={offsetY}
          onChange={(v) => onPropertyChange("offsetY", v ?? 2)}
          unit="px"
          min={-50}
          max={50}
          step={1}
        />
      </div>
    </div>
  );
}

/**
 * Default text style properties
 */
function DefaultTextStyleContent({
  component,
  onPropertyChange,
}: StylingTypeProps) {
  const properties = getProperties(component);
  const fontFamily = properties.fontFamily as string | undefined;
  const fontSize = properties.fontSize as number | undefined;
  const fontWeight = (properties.fontWeight as string) ?? "400";
  const fontStyle = (properties.fontStyle as string) ?? "normal";
  const color = (properties.color as string) ?? "#000000";
  const lineHeight = properties.lineHeight as number | undefined;
  const letterSpacing = properties.letterSpacing as number | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Type className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Default Text Style</Label>
      </div>

      <FontPicker
        label="Font Family"
        value={fontFamily}
        onChange={(v) => onPropertyChange("fontFamily", v)}
        allowEmpty
        placeholder="Inherit"
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Font Size"
          value={fontSize}
          onChange={(v) => onPropertyChange("fontSize", v)}
          unit="pt"
          min={6}
          max={144}
          step={1}
          placeholder="Inherit"
          allowEmpty
        />
        <ColorPicker
          label="Color"
          value={color}
          onChange={(v) => onPropertyChange("color", v ?? "#000000")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Weight"
          value={fontWeight}
          onChange={(v) => onPropertyChange("fontWeight", v)}
          options={FONT_WEIGHT_OPTIONS}
        />
        <SelectField
          label="Style"
          value={fontStyle}
          onChange={(v) => onPropertyChange("fontStyle", v)}
          options={FONT_STYLE_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Line Height"
          value={lineHeight}
          onChange={(v) => onPropertyChange("lineHeight", v)}
          min={0.5}
          max={3}
          step={0.1}
          placeholder="Auto"
          allowEmpty
          helpText="Multiplier (e.g., 1.5)"
        />
        <NumberField
          label="Letter Spacing"
          value={letterSpacing}
          onChange={(v) => onPropertyChange("letterSpacing", v)}
          unit="pt"
          min={-5}
          max={20}
          step={0.5}
          placeholder="0"
          allowEmpty
        />
      </div>
    </div>
  );
}

/**
 * Text component styling (simplified version for Text component)
 */
function TextStylingContent({
  component: _component,
  onPropertyChange: _onPropertyChange,
}: StylingTypeProps) {
  // Text component doesn't have direct styling properties
  // but might inherit from DefaultTextStyle parent
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Type className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Text Styling</Label>
      </div>
      <p className="text-muted-foreground text-xs">
        Text styling is inherited from parent DefaultTextStyle components.
        <br />
        Wrap this Text component in a DefaultTextStyle to apply custom styles.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * StylingProperties - Styling-related property inputs
 */
function StylingPropertiesComponent({
  componentId,
  useSelection = true,
  className,
}: StylingPropertiesProps) {
  // Get selected component from stores
  const selectedId = useSelectionStore((state) => state.selectedIds[0] ?? null);
  const getComponent = useCanvasStore((state) => state.getComponent);
  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );
  const updateComponentProperties = useCanvasStore(
    (state) => state.updateComponentProperties
  );

  // Determine which component ID to use
  const targetId = componentId ?? (useSelection ? selectedId : null);

  // Get the component
  const component = useMemo(() => {
    if (!targetId) return null;
    return getComponent(targetId);
  }, [targetId, getComponent]);

  // Get styling type for this component
  const stylingType = useMemo(() => {
    return getStylingType(component?.type ?? null);
  }, [component?.type]);

  // Handle single property change
  const handlePropertyChange = useCallback(
    (property: string, value: unknown) => {
      if (!targetId) return;
      updateComponentProperty(targetId, property, value);
    },
    [targetId, updateComponentProperty]
  );

  // Handle multiple property changes at once
  const handlePropertiesChange = useCallback(
    (properties: Record<string, unknown>) => {
      if (!targetId) return;
      updateComponentProperties(targetId, properties);
    },
    [targetId, updateComponentProperties]
  );

  // Don't render if no component or no styling type
  if (!component || !stylingType) {
    return null;
  }

  // Render appropriate styling type section
  const renderContent = () => {
    const props = {
      component,
      onPropertyChange: handlePropertyChange,
      onPropertiesChange: handlePropertiesChange,
    };

    switch (stylingType) {
      case "padding":
        return <PaddingContent {...props} />;
      case "border":
        return <BorderContent {...props} />;
      case "background":
        return <BackgroundContent {...props} />;
      case "roundedCorners":
        return <RoundedCornersContent {...props} />;
      case "shadow":
        return <ShadowContent {...props} />;
      case "defaultTextStyle":
        return <DefaultTextStyleContent {...props} />;
      case "text":
        return <TextStylingContent {...props} />;
      default:
        return null;
    }
  };

  return <div className={cn("space-y-4", className)}>{renderContent()}</div>;
}

export const StylingProperties = memo(StylingPropertiesComponent);
StylingProperties.displayName = "StylingProperties";

export default StylingProperties;
