/**
 * SizingProperties Component
 * Property group for width, height, and size constraints
 *
 * Features:
 * - Width and height inputs with two-way binding
 * - Min/max constraint inputs
 * - Aspect ratio lock toggle
 * - Real-time sync with resize handles
 * - Dimension visibility based on component type
 */
"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NumberField } from "../fields/NumberField";
import { useSyncResizeWithProperties } from "@/hooks/useSyncResizeWithProperties";
import type { ComponentType } from "@/types/component";
import { Link2, Link2Off, Maximize2, Minimize2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for SizingProperties component
 */
export interface SizingPropertiesProps {
  /** Component ID to display properties for */
  componentId?: string;
  /** Component type (for determining which controls to show) */
  componentType?: ComponentType;
  /** Whether to use selection store for component ID */
  useSelection?: boolean;
  /** Whether the section is collapsed */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get constraints visibility based on component type
 */
function showConstraints(type: ComponentType | null): boolean {
  if (!type) return false;

  // Don't show constraints for these types
  const noConstraints = [
    "PageBreak",
    "ShowOnce",
    "SkipOnce",
    "Section",
    "DebugPointer",
    "ContentDirection",
  ];

  return !noConstraints.includes(type);
}

// ============================================================================
// Component
// ============================================================================

/**
 * SizingProperties - Width/height/constraint property inputs
 */
function SizingPropertiesComponent({
  componentId,
  componentType: explicitType,
  useSelection = true,
  collapsed = false,
  onCollapsedChange,
  className,
}: SizingPropertiesProps) {
  // Use the sync hook for two-way binding (includes flow context)
  const {
    componentType: syncedType,
    sizing,
    syncState,
    flowContext,
    setWidth,
    setHeight,
    setConstraints,
    toggleAspectRatioLock,
    hasSizingProperties,
  } = useSyncResizeWithProperties({
    componentId,
    useSelection,
  });

  // Use explicit type if provided, otherwise use synced type
  const componentType = explicitType ?? syncedType;

  // Use flow context for resize direction (parent-aware)
  const resizeDirection = flowContext.resizeDirection;

  const canShowConstraints = useMemo(
    () => showConstraints(componentType),
    [componentType]
  );

  // Don't render if component doesn't support sizing
  if (!hasSizingProperties || resizeDirection === "none") {
    return null;
  }

  // Use flow context for width/height resizability
  const showWidth = flowContext.widthResizable;
  const showHeight = flowContext.heightResizable;
  const showAspectRatio = showWidth && showHeight && componentType === "Image";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with collapse toggle */}
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => onCollapsedChange?.(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Maximize2 className="text-muted-foreground h-4 w-4" />
          <h3 className="text-sm font-semibold">Size</h3>
        </div>

        {/* Resize state indicator */}
        {syncState.isComponentBeingResized && (
          <span className="text-primary animate-pulse text-xs">
            Resizing...
          </span>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Flow Context Notice */}
          {flowContext.constraintReason && (
            <p className="text-muted-foreground bg-muted/50 rounded px-2 py-1 text-xs">
              {flowContext.constraintReason}
              {flowContext.parentType && (
                <span className="block text-[10px] opacity-70">
                  Parent: {flowContext.parentType}
                </span>
              )}
            </p>
          )}

          {/* Width and Height Row */}
          <div className="grid grid-cols-2 gap-3">
            {showWidth && (
              <NumberField
                label="Width"
                value={sizing.width}
                onChange={setWidth}
                unit="px"
                min={sizing.minWidth ?? 1}
                max={sizing.maxWidth}
                step={1}
                placeholder="Auto"
                disabled={syncState.isComponentBeingResized}
                helpText={
                  syncState.isComponentBeingResized
                    ? "Drag handle to resize"
                    : undefined
                }
              />
            )}

            {showHeight && (
              <NumberField
                label="Height"
                value={sizing.height}
                onChange={setHeight}
                unit="px"
                min={sizing.minHeight ?? 1}
                max={sizing.maxHeight}
                step={1}
                placeholder="Auto"
                disabled={syncState.isComponentBeingResized}
                helpText={
                  syncState.isComponentBeingResized
                    ? "Drag handle to resize"
                    : undefined
                }
              />
            )}
          </div>

          {/* Aspect Ratio Lock (for images) */}
          {showAspectRatio && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">Lock Aspect Ratio</Label>
              <Button
                variant={sizing.maintainAspectRatio ? "default" : "outline"}
                size="sm"
                onClick={toggleAspectRatioLock}
                className="h-7 w-7 p-0"
                aria-label={
                  sizing.maintainAspectRatio
                    ? "Unlock aspect ratio"
                    : "Lock aspect ratio"
                }
              >
                {sizing.maintainAspectRatio ? (
                  <Link2 className="h-4 w-4" />
                ) : (
                  <Link2Off className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Aspect Ratio Value (if locked) */}
          {showAspectRatio &&
            sizing.maintainAspectRatio &&
            sizing.aspectRatio && (
              <div className="text-muted-foreground text-xs">
                Aspect Ratio: {sizing.aspectRatio.toFixed(2)}
              </div>
            )}

          {/* Constraints Section */}
          {canShowConstraints && (
            <div className="space-y-3 border-t pt-2">
              <div className="flex items-center gap-2">
                <Minimize2 className="text-muted-foreground h-3.5 w-3.5" />
                <Label className="text-xs font-medium">Constraints</Label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {showWidth && (
                  <>
                    <NumberField
                      label="Min Width"
                      value={sizing.minWidth}
                      onChange={(v) => setConstraints({ minWidth: v })}
                      unit="px"
                      min={0}
                      max={sizing.maxWidth}
                      step={1}
                      placeholder="None"
                      allowEmpty
                    />
                    <NumberField
                      label="Max Width"
                      value={sizing.maxWidth}
                      onChange={(v) => setConstraints({ maxWidth: v })}
                      unit="px"
                      min={sizing.minWidth ?? 0}
                      step={1}
                      placeholder="None"
                      allowEmpty
                    />
                  </>
                )}

                {showHeight && (
                  <>
                    <NumberField
                      label="Min Height"
                      value={sizing.minHeight}
                      onChange={(v) => setConstraints({ minHeight: v })}
                      unit="px"
                      min={0}
                      max={sizing.maxHeight}
                      step={1}
                      placeholder="None"
                      allowEmpty
                    />
                    <NumberField
                      label="Max Height"
                      value={sizing.maxHeight}
                      onChange={(v) => setConstraints({ maxHeight: v })}
                      unit="px"
                      min={sizing.minHeight ?? 0}
                      step={1}
                      placeholder="None"
                      allowEmpty
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const SizingProperties = memo(SizingPropertiesComponent);
SizingProperties.displayName = "SizingProperties";

export default SizingProperties;
