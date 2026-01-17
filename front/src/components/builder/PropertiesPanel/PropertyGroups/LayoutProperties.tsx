/**
 * LayoutProperties Component
 * Property group for container layout-related properties
 *
 * Features:
 * - Column/Row spacing configuration
 * - Table column definitions
 * - MultiColumn settings (column count, spacing)
 * - Inlined element settings (spacing, baseline alignment)
 * - List spacing configuration
 * - Decoration (before/after content markers)
 * - Real-time two-way binding with canvas store
 */
"use client";

import { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/store/selection-store";
import { useCanvasStore } from "@/store/canvas-store";
import { NumberField, ToggleField, SelectField } from "../fields";
import type { SelectOption } from "../fields/SelectField";
import type { ComponentType, LayoutNode } from "@/types/component";
import type { TableColumn } from "@/types/properties";
import { LayersPanel } from "./LayersPanel";
import {
  Columns,
  Rows,
  Table2,
  LayoutGrid,
  AlignHorizontalJustifyCenter,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for LayoutProperties component
 */
export interface LayoutPropertiesProps {
  /** Component ID to display properties for (overrides selection) */
  componentId?: string;
  /** Whether to use selection store for component ID */
  useSelection?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Table column type options
 */
const COLUMN_TYPE_OPTIONS: SelectOption[] = [
  {
    label: "Relative",
    value: "relative",
    description: "Width as proportion (e.g., 1, 2 = 1:2 ratio)",
  },
  {
    label: "Constant",
    value: "constant",
    description: "Fixed width in points",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the layout type section to show based on component type
 */
function getLayoutType(
  componentType: ComponentType | null
):
  | "column"
  | "row"
  | "table"
  | "layers"
  | "decoration"
  | "inlined"
  | "multiColumn"
  | "list"
  | null {
  if (!componentType) return null;

  switch (componentType) {
    case "Column":
      return "column";
    case "Row":
      return "row";
    case "Table":
      return "table";
    case "Layers":
      return "layers";
    case "Decoration":
      return "decoration";
    case "Inlined":
      return "inlined";
    case "MultiColumn":
      return "multiColumn";
    case "List":
      return "list";
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

// ============================================================================
// Sub-Components for Different Layout Types
// ============================================================================

interface LayoutTypeProps {
  component: LayoutNode;
  onPropertyChange: (property: string, value: unknown) => void;
}

/**
 * Column layout properties
 */
function ColumnLayoutContent({ component, onPropertyChange }: LayoutTypeProps) {
  const properties = getProperties(component);
  const spacing = properties.spacing as number | undefined;
  const childCount = component.children?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Columns className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Column Layout</Label>
      </div>

      <NumberField
        label="Item Spacing"
        value={spacing}
        onChange={(v) => onPropertyChange("spacing", v)}
        unit="px"
        min={0}
        max={100}
        step={1}
        placeholder="0"
        allowEmpty
        helpText="Vertical space between children"
      />

      <div className="bg-muted/50 rounded-md p-2">
        <p className="text-muted-foreground text-xs">
          Children: {childCount} item{childCount !== 1 ? "s" : ""}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          Children stack vertically from top to bottom.
        </p>
      </div>
    </div>
  );
}

/**
 * Row layout properties
 */
function RowLayoutContent({ component, onPropertyChange }: LayoutTypeProps) {
  const properties = getProperties(component);
  const spacing = properties.spacing as number | undefined;
  const childCount = component.children?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Rows className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Row Layout</Label>
      </div>

      <NumberField
        label="Item Spacing"
        value={spacing}
        onChange={(v) => onPropertyChange("spacing", v)}
        unit="px"
        min={0}
        max={100}
        step={1}
        placeholder="0"
        allowEmpty
        helpText="Horizontal space between children"
      />

      <div className="bg-muted/50 rounded-md p-2">
        <p className="text-muted-foreground text-xs">
          Children: {childCount} item{childCount !== 1 ? "s" : ""}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          Children are arranged horizontally from left to right.
        </p>
      </div>
    </div>
  );
}

/**
 * Table column editor row
 */
interface TableColumnRowProps {
  column: TableColumn;
  index: number;
  onChange: (column: TableColumn) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function TableColumnRow({
  column,
  index,
  onChange,
  onRemove,
  canRemove,
}: TableColumnRowProps) {
  return (
    <div className="bg-muted/30 flex items-center gap-2 rounded-md p-2">
      <GripVertical className="text-muted-foreground h-4 w-4 cursor-grab" />
      <span className="text-muted-foreground w-6 text-xs">#{index + 1}</span>
      <SelectField
        label=""
        value={column.type}
        onChange={(v) =>
          onChange({ ...column, type: v as "relative" | "constant" })
        }
        options={COLUMN_TYPE_OPTIONS}
        className="flex-1"
      />
      <NumberField
        label=""
        value={column.value}
        onChange={(v) => onChange({ ...column, value: v ?? 1 })}
        min={column.type === "relative" ? 1 : 10}
        max={column.type === "relative" ? 10 : 500}
        step={column.type === "relative" ? 1 : 10}
        unit={column.type === "constant" ? "px" : undefined}
        className="w-20"
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onRemove}
        disabled={!canRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/**
 * Table layout properties
 */
function TableLayoutContent({ component, onPropertyChange }: LayoutTypeProps) {
  const properties = getProperties(component);
  const columns = (properties.columns as TableColumn[]) ?? [
    { type: "relative", value: 1 },
  ];

  // Handle column update
  const handleColumnChange = (index: number, column: TableColumn) => {
    const newColumns = [...columns];
    newColumns[index] = column;
    onPropertyChange("columns", newColumns);
  };

  // Handle column removal
  const handleRemoveColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index);
    onPropertyChange("columns", newColumns);
  };

  // Handle add column
  const handleAddColumn = () => {
    const newColumns = [...columns, { type: "relative" as const, value: 1 }];
    onPropertyChange("columns", newColumns);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table2 className="text-muted-foreground h-4 w-4" />
          <Label className="text-xs font-medium">Table Columns</Label>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleAddColumn}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Column
        </Button>
      </div>

      <div className="space-y-2">
        {columns.map((column, index) => (
          <TableColumnRow
            key={index}
            column={column}
            index={index}
            onChange={(col) => handleColumnChange(index, col)}
            onRemove={() => handleRemoveColumn(index)}
            canRemove={columns.length > 1}
          />
        ))}
      </div>

      <p className="text-muted-foreground text-[10px]">
        <strong>Relative:</strong> Columns share space proportionally (e.g.,
        1:2:1)
        <br />
        <strong>Constant:</strong> Fixed pixel width
      </p>
    </div>
  );
}

/**
 * Layers layout properties with full layer management panel
 */
function LayersLayoutContent({ component }: LayoutTypeProps) {
  return <LayersPanel componentId={component.id} useSelection={false} />;
}

/**
 * Decoration layout properties
 */
function DecorationLayoutContent({ component }: LayoutTypeProps) {
  const properties = getProperties(component);
  const hasBefore = properties.before !== undefined;
  const hasAfter = properties.after !== undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LayoutGrid className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Decoration</Label>
      </div>

      <div className="bg-muted/50 space-y-2 rounded-md p-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Before content:</span>
          <span className="text-xs">
            {hasBefore ? "Configured" : "Not set"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">After content:</span>
          <span className="text-xs">{hasAfter ? "Configured" : "Not set"}</span>
        </div>
      </div>

      <p className="text-muted-foreground text-[10px]">
        Add child components to define header/footer decorations.
        <br />
        Use the component tree to manage before/after content.
      </p>
    </div>
  );
}

/**
 * Inlined layout properties
 */
function InlinedLayoutContent({
  component,
  onPropertyChange,
}: LayoutTypeProps) {
  const properties = getProperties(component);
  const spacing = properties.spacing as number | undefined;
  const verticalSpacing = properties.verticalSpacing as number | undefined;
  const baselineAlignment = properties.baselineAlignment as boolean | undefined;
  const childCount = component.children?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlignHorizontalJustifyCenter className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Inlined Elements</Label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Horizontal Spacing"
          value={spacing}
          onChange={(v) => onPropertyChange("spacing", v)}
          unit="px"
          min={0}
          max={50}
          step={1}
          placeholder="0"
          allowEmpty
          helpText="Space between items"
        />
        <NumberField
          label="Vertical Spacing"
          value={verticalSpacing}
          onChange={(v) => onPropertyChange("verticalSpacing", v)}
          unit="px"
          min={0}
          max={50}
          step={1}
          placeholder="0"
          allowEmpty
          helpText="Space between rows"
        />
      </div>

      <ToggleField
        label="Baseline Alignment"
        value={baselineAlignment ?? false}
        onChange={(v) => onPropertyChange("baselineAlignment", v)}
        helpText="Align items to text baseline"
      />

      <div className="bg-muted/50 rounded-md p-2">
        <p className="text-muted-foreground text-xs">
          Children: {childCount} item{childCount !== 1 ? "s" : ""}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          Elements flow inline, wrapping to the next line as needed.
        </p>
      </div>
    </div>
  );
}

/**
 * MultiColumn layout properties
 */
function MultiColumnLayoutContent({
  component,
  onPropertyChange,
}: LayoutTypeProps) {
  const properties = getProperties(component);
  const columnCount = (properties.columnCount as number) ?? 2;
  const spacing = properties.spacing as number | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Columns className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Multi-Column Layout</Label>
      </div>

      <NumberField
        label="Number of Columns"
        value={columnCount}
        onChange={(v) => onPropertyChange("columnCount", v ?? 2)}
        min={1}
        max={10}
        step={1}
        helpText="How many columns to distribute content into"
      />

      <NumberField
        label="Column Spacing"
        value={spacing}
        onChange={(v) => onPropertyChange("spacing", v)}
        unit="px"
        min={0}
        max={100}
        step={1}
        placeholder="0"
        allowEmpty
        helpText="Gap between columns"
      />

      <p className="text-muted-foreground text-[10px]">
        Content flows across multiple columns automatically.
        <br />
        Useful for newspaper-style layouts.
      </p>
    </div>
  );
}

/**
 * List layout properties (layout-specific, not content)
 */
function ListLayoutContent({ component, onPropertyChange }: LayoutTypeProps) {
  const properties = getProperties(component);
  const spacing = properties.spacing as number | undefined;
  const childCount = component.children?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Rows className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">List Layout</Label>
      </div>

      <NumberField
        label="Item Spacing"
        value={spacing}
        onChange={(v) => onPropertyChange("spacing", v)}
        unit="px"
        min={0}
        max={50}
        step={1}
        placeholder="0"
        allowEmpty
        helpText="Space between list items"
      />

      <div className="bg-muted/50 rounded-md p-2">
        <p className="text-muted-foreground text-xs">
          List items: {childCount}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          Each child becomes a list item with bullet/number.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LayoutProperties - Container layout property inputs
 */
function LayoutPropertiesComponent({
  componentId,
  useSelection = true,
  className,
}: LayoutPropertiesProps) {
  // Get selected component from stores
  const selectedId = useSelectionStore((state) => state.selectedIds[0] ?? null);
  const getComponent = useCanvasStore((state) => state.getComponent);
  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );

  // Determine which component ID to use
  const targetId = componentId ?? (useSelection ? selectedId : null);

  // Get the component
  const component = useMemo(() => {
    if (!targetId) return null;
    return getComponent(targetId);
  }, [targetId, getComponent]);

  // Get layout type for this component
  const layoutType = useMemo(() => {
    return getLayoutType(component?.type ?? null);
  }, [component?.type]);

  // Handle property change
  const handlePropertyChange = useCallback(
    (property: string, value: unknown) => {
      if (!targetId) return;
      updateComponentProperty(targetId, property, value);
    },
    [targetId, updateComponentProperty]
  );

  // Don't render if no component or no layout type
  if (!component || !layoutType) {
    return null;
  }

  // Render appropriate layout type section
  const renderContent = () => {
    const props = {
      component,
      onPropertyChange: handlePropertyChange,
    };

    switch (layoutType) {
      case "column":
        return <ColumnLayoutContent {...props} />;
      case "row":
        return <RowLayoutContent {...props} />;
      case "table":
        return <TableLayoutContent {...props} />;
      case "layers":
        return <LayersLayoutContent {...props} />;
      case "decoration":
        return <DecorationLayoutContent {...props} />;
      case "inlined":
        return <InlinedLayoutContent {...props} />;
      case "multiColumn":
        return <MultiColumnLayoutContent {...props} />;
      case "list":
        return <ListLayoutContent {...props} />;
      default:
        return null;
    }
  };

  return <div className={cn("space-y-4", className)}>{renderContent()}</div>;
}

export const LayoutProperties = memo(LayoutPropertiesComponent);
LayoutProperties.displayName = "LayoutProperties";

export default LayoutProperties;
