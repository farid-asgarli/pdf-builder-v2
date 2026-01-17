/**
 * RulerGuides Component
 * Provides horizontal/vertical rulers with draggable guide lines
 *
 * Features:
 * - Horizontal/vertical rulers around the canvas
 * - Show dimensions in px, cm, or inches
 * - Draggable guide lines that can be created from rulers
 * - Visual snap indicators when components align with guides
 * - Guide line management (add, remove, drag)
 */
"use client";

import {
  memo,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import type { Point } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

/**
 * Measurement unit for rulers
 */
export type RulerUnit = "px" | "cm" | "inch";

/**
 * Guide line orientation
 */
export type GuideOrientation = "horizontal" | "vertical";

/**
 * Individual guide line data
 */
export interface GuideLine {
  /** Unique identifier */
  id: string;
  /** Orientation of the guide */
  orientation: GuideOrientation;
  /** Position in pixels (x for vertical, y for horizontal) */
  position: number;
  /** Color of the guide line */
  color?: string;
  /** Whether the guide is locked (cannot be moved) */
  locked?: boolean;
  /** Optional label */
  label?: string;
}

/**
 * Props for the RulerGuides component
 */
export interface RulerGuidesProps {
  /** Width of the canvas viewport */
  width: number;
  /** Height of the canvas viewport */
  height: number;
  /** Current zoom level */
  zoom?: number;
  /** Current pan offset */
  pan?: Point;
  /** Ruler thickness in pixels */
  thickness?: number;
  /** Measurement unit to display */
  unit?: RulerUnit;
  /** Whether rulers are visible */
  visible?: boolean;
  /** Array of guide lines to display */
  guides?: GuideLine[];
  /** Callback when a new guide is created */
  onGuideCreate?: (guide: GuideLine) => void;
  /** Callback when a guide is moved */
  onGuideMove?: (id: string, position: number) => void;
  /** Callback when a guide is deleted */
  onGuideDelete?: (id: string) => void;
  /** Callback when guides change */
  onGuidesChange?: (guides: GuideLine[]) => void;
  /** Color for the guide lines */
  guideColor?: string;
  /** Whether to show guide lines */
  showGuides?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for individual draggable guide line
 */
export interface DraggableGuideProps {
  /** Guide line data */
  guide: GuideLine;
  /** Current zoom level */
  zoom: number;
  /** Canvas dimensions */
  canvasSize: { width: number; height: number };
  /** Ruler thickness offset */
  rulerOffset: number;
  /** Whether currently being dragged */
  isDragging: boolean;
  /** Callback when drag starts */
  onDragStart: (id: string) => void;
  /** Callback during drag */
  onDrag: (id: string, position: number) => void;
  /** Callback when drag ends */
  onDragEnd: (id: string) => void;
  /** Callback to delete the guide */
  onDelete: (id: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Default ruler thickness */
const DEFAULT_THICKNESS = 20;

/** Default guide line color */
const DEFAULT_GUIDE_COLOR = "#3b82f6"; // Blue-500

/** Pixels per inch (standard DPI) */
const PIXELS_PER_INCH = 96;

/** Pixels per centimeter */
const PIXELS_PER_CM = PIXELS_PER_INCH / 2.54;

/** Unit conversion factors from pixels */
const UNIT_FACTORS: Record<RulerUnit, number> = {
  px: 1,
  cm: 1 / PIXELS_PER_CM,
  inch: 1 / PIXELS_PER_INCH,
};

/** Unit labels */
const UNIT_LABELS: Record<RulerUnit, string> = {
  px: "px",
  cm: "cm",
  inch: "in",
};

/** Tick spacing per unit */
const TICK_SPACING: Record<RulerUnit, { major: number; minor: number }> = {
  px: { major: 100, minor: 10 },
  cm: { major: PIXELS_PER_CM, minor: PIXELS_PER_CM / 10 },
  inch: { major: PIXELS_PER_INCH, minor: PIXELS_PER_INCH / 8 },
};

/** Ruler colors */
const RULER_COLORS = {
  background: "hsl(var(--muted))",
  tick: "hsl(var(--foreground))",
  tickMinor: "hsl(var(--muted-foreground) / 0.5)",
  text: "hsl(var(--foreground))",
  indicator: "hsl(var(--primary))",
};

/** Guide line minimum distance from edge to be valid */
const GUIDE_MIN_DISTANCE = 5;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for a guide
 */
function generateGuideId(): string {
  return `guide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert pixels to specified unit
 */
function convertToUnit(pixels: number, unit: RulerUnit): number {
  return pixels * UNIT_FACTORS[unit];
}

/**
 * Format a value for display based on unit
 */
function formatValue(pixels: number, unit: RulerUnit): string {
  const value = convertToUnit(pixels, unit);

  if (unit === "px") {
    return `${Math.round(value)}`;
  }

  // For cm and inches, show one decimal place
  return value.toFixed(1);
}

/**
 * Calculate tick marks based on unit and zoom
 */
function calculateTicks(
  length: number,
  zoom: number,
  pan: number,
  unit: RulerUnit
): Array<{ position: number; value: number; isMajor: boolean }> {
  const ticks: Array<{ position: number; value: number; isMajor: boolean }> =
    [];
  const spacing = TICK_SPACING[unit];

  // Adjust spacing based on zoom
  let majorSpacing = spacing.major;
  let minorSpacing = spacing.minor;

  const scaledMajor = majorSpacing * zoom;
  if (scaledMajor < 40) {
    majorSpacing *= 2;
    minorSpacing *= 2;
  } else if (scaledMajor > 200) {
    majorSpacing /= 2;
    minorSpacing /= 2;
  }

  // Calculate visible range
  const startValue = Math.floor(-pan / zoom / minorSpacing) * minorSpacing;
  const endValue =
    Math.ceil((length - pan) / zoom / minorSpacing) * minorSpacing;

  for (let value = startValue; value <= endValue; value += minorSpacing) {
    const position = value * zoom + pan;

    if (position < 0 || position > length) continue;

    const isMajor = Math.abs(value % majorSpacing) < 0.001;
    ticks.push({ position, value, isMajor });
  }

  return ticks;
}

// ============================================================================
// Draggable Guide Line Component
// ============================================================================

/**
 * Individual draggable guide line
 */
const DraggableGuide = memo(function DraggableGuide({
  guide,
  zoom,
  canvasSize,
  rulerOffset,
  isDragging,
  onDragStart,
  // onDrag and onDragEnd are handled at the parent level via window events
  onDelete,
}: Omit<DraggableGuideProps, "onDrag" | "onDragEnd"> & {
  onDrag?: DraggableGuideProps["onDrag"];
  onDragEnd?: DraggableGuideProps["onDragEnd"];
}) {
  const guideRef = useRef<HTMLDivElement>(null);
  const isHorizontal = guide.orientation === "horizontal";
  const color = guide.color || DEFAULT_GUIDE_COLOR;

  // Calculate position with zoom and ruler offset
  const scaledPosition = guide.position * zoom + rulerOffset;

  // Handle mouse down for drag start
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (guide.locked) return;
      e.stopPropagation();
      e.preventDefault();
      onDragStart(guide.id);
    },
    [guide.id, guide.locked, onDragStart]
  );

  // Handle double-click to delete
  const handleDoubleClick = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onDelete(guide.id);
    },
    [guide.id, onDelete]
  );

  // Handle right-click context menu (delete)
  const handleContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(guide.id);
    },
    [guide.id, onDelete]
  );

  return (
    <div
      ref={guideRef}
      className={cn(
        "group absolute z-30",
        guide.locked ? "cursor-not-allowed" : "cursor-move",
        isDragging && "z-50"
      )}
      style={{
        ...(isHorizontal
          ? {
              left: rulerOffset,
              top: scaledPosition,
              width: canvasSize.width,
              height: 1,
            }
          : {
              left: scaledPosition,
              top: rulerOffset,
              width: 1,
              height: canvasSize.height,
            }),
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Guide line */}
      <div
        className={cn(
          "absolute",
          isHorizontal ? "h-px w-full" : "h-full w-px",
          isDragging && "opacity-70"
        )}
        style={{ backgroundColor: color }}
      />

      {/* Wider hit area for easier interaction */}
      <div
        className={cn(
          "absolute",
          isHorizontal
            ? "-top-1.5 h-3 w-full hover:bg-blue-500/10"
            : "-left-1.5 h-full w-3 hover:bg-blue-500/10",
          "transition-colors"
        )}
      />

      {/* Position label on hover */}
      <div
        className={cn(
          "absolute rounded px-1.5 py-0.5 font-mono text-xs shadow-sm",
          "bg-background border-border text-foreground border",
          "opacity-0 transition-opacity group-hover:opacity-100",
          "pointer-events-none whitespace-nowrap",
          isHorizontal ? "-top-6 left-2" : "top-2 -left-12"
        )}
      >
        {Math.round(guide.position)}px
      </div>

      {/* Delete indicator on hover */}
      {!guide.locked && (
        <div
          className={cn(
            "absolute flex h-4 w-4 items-center justify-center rounded-full",
            "bg-destructive text-destructive-foreground",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "cursor-pointer text-xs",
            isHorizontal ? "-top-2 right-2" : "-top-2 left-2"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(guide.id);
          }}
        >
          ×
        </div>
      )}
    </div>
  );
});

DraggableGuide.displayName = "DraggableGuide";

// ============================================================================
// Ruler Component
// ============================================================================

interface RulerProps {
  orientation: "horizontal" | "vertical";
  length: number;
  thickness: number;
  zoom: number;
  pan: number;
  unit: RulerUnit;
  mousePosition: number | null;
  onGuideCreate: (orientation: GuideOrientation, position: number) => void;
}

/**
 * Single ruler (horizontal or vertical)
 */
const Ruler = memo(function Ruler({
  orientation,
  length,
  thickness,
  zoom,
  pan,
  unit,
  mousePosition,
  onGuideCreate,
}: RulerProps) {
  const isHorizontal = orientation === "horizontal";
  const [isCreating, setIsCreating] = useState(false);
  const [createPosition, setCreatePosition] = useState<number | null>(null);

  // Calculate tick marks
  const ticks = useMemo(
    () => calculateTicks(length, zoom, pan, unit),
    [length, zoom, pan, unit]
  );

  // Handle mouse down on ruler to start creating a guide
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      setIsCreating(true);

      const rect = e.currentTarget.getBoundingClientRect();
      const pos = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
      setCreatePosition(pos);
    },
    [isHorizontal]
  );

  // Handle mouse move while creating
  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (!isCreating) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const pos = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
      setCreatePosition(pos);
    },
    [isCreating, isHorizontal]
  );

  // Handle mouse up to create the guide
  const handleMouseUp = useCallback(
    (_e: ReactMouseEvent) => {
      if (!isCreating || createPosition === null) {
        setIsCreating(false);
        setCreatePosition(null);
        return;
      }

      // Convert screen position to canvas position
      const canvasPos = (createPosition - pan) / zoom;

      // Only create if position is valid
      if (canvasPos >= GUIDE_MIN_DISTANCE) {
        onGuideCreate(isHorizontal ? "horizontal" : "vertical", canvasPos);
      }

      setIsCreating(false);
      setCreatePosition(null);
    },
    [isCreating, createPosition, pan, zoom, isHorizontal, onGuideCreate]
  );

  // Handle mouse leave while creating
  const handleMouseLeave = useCallback(() => {
    setIsCreating(false);
    setCreatePosition(null);
  }, []);

  return (
    <div
      className={cn(
        "relative cursor-crosshair overflow-hidden select-none",
        isHorizontal ? "cursor-s-resize" : "cursor-e-resize"
      )}
      style={{
        width: isHorizontal ? length : thickness,
        height: isHorizontal ? thickness : length,
        backgroundColor: RULER_COLORS.background,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        width={isHorizontal ? length : thickness}
        height={isHorizontal ? thickness : length}
        className="absolute inset-0"
      >
        {/* Tick marks */}
        {ticks.map(({ position, value, isMajor }, index) => {
          const tickLength = isMajor ? thickness * 0.7 : thickness * 0.4;
          const displayValue = formatValue(value, unit);

          if (isHorizontal) {
            return (
              <g key={index}>
                <line
                  x1={position}
                  y1={thickness}
                  x2={position}
                  y2={thickness - tickLength}
                  stroke={isMajor ? RULER_COLORS.tick : RULER_COLORS.tickMinor}
                  strokeWidth={isMajor ? 1 : 0.5}
                />
                {isMajor && (
                  <text
                    x={position + 3}
                    y={thickness - tickLength - 2}
                    fontSize={8}
                    fill={RULER_COLORS.text}
                    className="font-mono"
                  >
                    {displayValue}
                  </text>
                )}
              </g>
            );
          } else {
            return (
              <g key={index}>
                <line
                  x1={thickness}
                  y1={position}
                  x2={thickness - tickLength}
                  y2={position}
                  stroke={isMajor ? RULER_COLORS.tick : RULER_COLORS.tickMinor}
                  strokeWidth={isMajor ? 1 : 0.5}
                />
                {isMajor && (
                  <text
                    x={2}
                    y={position - 3}
                    fontSize={8}
                    fill={RULER_COLORS.text}
                    className="font-mono"
                    transform={`rotate(-90, 2, ${position - 3})`}
                  >
                    {displayValue}
                  </text>
                )}
              </g>
            );
          }
        })}

        {/* Mouse position indicator */}
        {mousePosition !== null &&
          mousePosition >= 0 &&
          mousePosition <= length && (
            <>
              {isHorizontal ? (
                <line
                  x1={mousePosition}
                  y1={0}
                  x2={mousePosition}
                  y2={thickness}
                  stroke={RULER_COLORS.indicator}
                  strokeWidth={1}
                />
              ) : (
                <line
                  x1={0}
                  y1={mousePosition}
                  x2={thickness}
                  y2={mousePosition}
                  stroke={RULER_COLORS.indicator}
                  strokeWidth={1}
                />
              )}
            </>
          )}

        {/* Guide creation preview */}
        {isCreating && createPosition !== null && (
          <>
            {isHorizontal ? (
              <line
                x1={createPosition}
                y1={0}
                x2={createPosition}
                y2={thickness}
                stroke={DEFAULT_GUIDE_COLOR}
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            ) : (
              <line
                x1={0}
                y1={createPosition}
                x2={thickness}
                y2={createPosition}
                stroke={DEFAULT_GUIDE_COLOR}
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}
          </>
        )}
      </svg>

      {/* Tooltip hint */}
      <div
        className={cn(
          "text-muted-foreground absolute text-[10px] opacity-50",
          "pointer-events-none select-none",
          isHorizontal ? "top-0.5 right-1" : "bottom-1 left-0.5"
        )}
        style={isHorizontal ? {} : { writingMode: "vertical-lr" }}
      >
        {UNIT_LABELS[unit]}
      </div>
    </div>
  );
});

Ruler.displayName = "Ruler";

// ============================================================================
// Unit Selector Component
// ============================================================================

interface UnitSelectorProps {
  unit: RulerUnit;
  onUnitChange: (unit: RulerUnit) => void;
  thickness: number;
}

/**
 * Corner unit selector
 */
/** Available ruler units in cycle order */
const RULER_UNITS: RulerUnit[] = ["px", "cm", "inch"];

const UnitSelector = memo(function UnitSelector({
  unit,
  onUnitChange,
  thickness,
}: UnitSelectorProps) {
  const handleClick = useCallback(() => {
    const currentIndex = RULER_UNITS.indexOf(unit);
    const nextIndex = (currentIndex + 1) % RULER_UNITS.length;
    onUnitChange(RULER_UNITS[nextIndex]);
  }, [unit, onUnitChange]);

  return (
    <div
      className={cn(
        "absolute top-0 left-0 z-20 flex items-center justify-center",
        "hover:bg-muted/80 cursor-pointer transition-colors",
        "text-muted-foreground font-mono text-[10px]",
        "border-border/50 border-r border-b"
      )}
      style={{
        width: thickness,
        height: thickness,
        backgroundColor: RULER_COLORS.background,
      }}
      onClick={handleClick}
      title="Click to change unit"
    >
      {UNIT_LABELS[unit]}
    </div>
  );
});

UnitSelector.displayName = "UnitSelector";

// ============================================================================
// Main RulerGuides Component
// ============================================================================

/**
 * Main RulerGuides component with rulers and draggable guide lines
 */
function RulerGuidesComponent({
  width,
  height,
  zoom = 1,
  pan = { x: 0, y: 0 },
  thickness = DEFAULT_THICKNESS,
  unit: initialUnit = "px",
  visible = true,
  guides: externalGuides,
  onGuideCreate,
  onGuideMove,
  onGuideDelete,
  onGuidesChange,
  guideColor = DEFAULT_GUIDE_COLOR,
  showGuides = true,
  className,
}: RulerGuidesProps) {
  // Local state for guides if not externally controlled
  const [internalGuides, setInternalGuides] = useState<GuideLine[]>([]);
  const [activeUnit, setActiveUnit] = useState<RulerUnit>(initialUnit);
  const [mousePosition, setMousePosition] = useState<Point | null>(null);
  const [draggingGuideId, setDraggingGuideId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use external guides if provided, otherwise use internal state
  const guides = externalGuides ?? internalGuides;
  const isControlled = externalGuides !== undefined;

  // Update internal guides and notify parent
  const updateGuides = useCallback(
    (newGuides: GuideLine[]) => {
      if (!isControlled) {
        setInternalGuides(newGuides);
      }
      onGuidesChange?.(newGuides);
    },
    [isControlled, onGuidesChange]
  );

  // Handle guide creation from ruler
  const handleGuideCreate = useCallback(
    (orientation: GuideOrientation, position: number) => {
      const newGuide: GuideLine = {
        id: generateGuideId(),
        orientation,
        position,
        color: guideColor,
      };

      if (onGuideCreate) {
        onGuideCreate(newGuide);
      } else {
        updateGuides([...guides, newGuide]);
      }
    },
    [guides, guideColor, onGuideCreate, updateGuides]
  );

  // Handle guide drag start
  const handleDragStart = useCallback((id: string) => {
    setDraggingGuideId(id);
  }, []);

  // Handle guide drag
  const handleDrag = useCallback(
    (id: string, position: number) => {
      if (onGuideMove) {
        onGuideMove(id, position);
      } else {
        updateGuides(guides.map((g) => (g.id === id ? { ...g, position } : g)));
      }
    },
    [guides, onGuideMove, updateGuides]
  );

  // Handle guide drag end
  const handleDragEnd = useCallback(() => {
    setDraggingGuideId(null);
  }, []);

  // Handle guide delete
  const handleDelete = useCallback(
    (id: string) => {
      if (onGuideDelete) {
        onGuideDelete(id);
      } else {
        updateGuides(guides.filter((g) => g.id !== id));
      }
    },
    [guides, onGuideDelete, updateGuides]
  );

  // Track mouse position for ruler indicators
  const handleMouseMove = useCallback((e: ReactMouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
  }, []);

  // Handle global mouse move/up for dragging
  useEffect(() => {
    if (!draggingGuideId) return;

    const guide = guides.find((g) => g.id === draggingGuideId);
    if (!guide) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const isHorizontal = guide.orientation === "horizontal";

      // Get mouse position relative to container
      const mousePos = isHorizontal
        ? e.clientY - rect.top - thickness
        : e.clientX - rect.left - thickness;

      // Convert to canvas coordinates
      const panValue = isHorizontal ? pan.y : pan.x;
      const canvasPos = (mousePos - panValue) / zoom;

      // Ensure position is valid
      const maxPos = isHorizontal
        ? (height - thickness) / zoom
        : (width - thickness) / zoom;
      const clampedPos = Math.max(
        GUIDE_MIN_DISTANCE,
        Math.min(maxPos - GUIDE_MIN_DISTANCE, canvasPos)
      );

      handleDrag(draggingGuideId, clampedPos);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [
    draggingGuideId,
    guides,
    pan,
    zoom,
    thickness,
    width,
    height,
    handleDrag,
    handleDragEnd,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-auto absolute inset-0", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Corner unit selector */}
      <UnitSelector
        unit={activeUnit}
        onUnitChange={setActiveUnit}
        thickness={thickness}
      />

      {/* Horizontal ruler */}
      <div className="absolute top-0 z-10" style={{ left: thickness }}>
        <Ruler
          orientation="horizontal"
          length={width - thickness}
          thickness={thickness}
          zoom={zoom}
          pan={pan.x}
          unit={activeUnit}
          mousePosition={mousePosition ? mousePosition.x - thickness : null}
          onGuideCreate={handleGuideCreate}
        />
      </div>

      {/* Vertical ruler */}
      <div className="absolute left-0 z-10" style={{ top: thickness }}>
        <Ruler
          orientation="vertical"
          length={height - thickness}
          thickness={thickness}
          zoom={zoom}
          pan={pan.y}
          unit={activeUnit}
          mousePosition={mousePosition ? mousePosition.y - thickness : null}
          onGuideCreate={handleGuideCreate}
        />
      </div>

      {/* Guide lines */}
      {showGuides &&
        guides.map((guide) => (
          <DraggableGuide
            key={guide.id}
            guide={guide}
            zoom={zoom}
            canvasSize={{
              width: width - thickness,
              height: height - thickness,
            }}
            rulerOffset={thickness}
            isDragging={draggingGuideId === guide.id}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onDelete={handleDelete}
          />
        ))}
    </div>
  );
}

export const RulerGuides = memo(RulerGuidesComponent);
RulerGuides.displayName = "RulerGuides";

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to manage ruler guides state
 */
export function useRulerGuides(initialGuides: GuideLine[] = []) {
  const [guides, setGuides] = useState<GuideLine[]>(initialGuides);

  const addGuide = useCallback((guide: GuideLine) => {
    setGuides((prev) => [...prev, guide]);
  }, []);

  const removeGuide = useCallback((id: string) => {
    setGuides((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const updateGuide = useCallback((id: string, updates: Partial<GuideLine>) => {
    setGuides((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  }, []);

  const moveGuide = useCallback((id: string, position: number) => {
    setGuides((prev) =>
      prev.map((g) => (g.id === id ? { ...g, position } : g))
    );
  }, []);

  const clearGuides = useCallback(() => {
    setGuides([]);
  }, []);

  const toggleGuideLock = useCallback((id: string) => {
    setGuides((prev) =>
      prev.map((g) => (g.id === id ? { ...g, locked: !g.locked } : g))
    );
  }, []);

  return {
    guides,
    setGuides,
    addGuide,
    removeGuide,
    updateGuide,
    moveGuide,
    clearGuides,
    toggleGuideLock,
  };
}

/**
 * Hook to get guides at a specific position (for snapping)
 */
export function useGuidesAtPosition(
  guides: GuideLine[],
  position: Point,
  tolerance: number = 5
): { horizontal: GuideLine[]; vertical: GuideLine[] } {
  return useMemo(() => {
    const horizontal = guides.filter(
      (g) =>
        g.orientation === "horizontal" &&
        Math.abs(g.position - position.y) <= tolerance
    );

    const vertical = guides.filter(
      (g) =>
        g.orientation === "vertical" &&
        Math.abs(g.position - position.x) <= tolerance
    );

    return { horizontal, vertical };
  }, [guides, position.x, position.y, tolerance]);
}

/**
 * Hook to check if a component is aligned with any guides
 */
export function useGuideAlignment(
  guides: GuideLine[],
  bounds: { x: number; y: number; width: number; height: number },
  tolerance: number = 5
): { alignedGuides: GuideLine[]; snapSuggestions: Point | null } {
  return useMemo(() => {
    const alignedGuides: GuideLine[] = [];
    let snapX: number | null = null;
    let snapY: number | null = null;

    // Check edges and center
    const checkPoints = {
      horizontal: [
        bounds.y,
        bounds.y + bounds.height / 2,
        bounds.y + bounds.height,
      ],
      vertical: [
        bounds.x,
        bounds.x + bounds.width / 2,
        bounds.x + bounds.width,
      ],
    };

    guides.forEach((guide) => {
      const points = checkPoints[guide.orientation];

      for (const point of points) {
        if (Math.abs(guide.position - point) <= tolerance) {
          alignedGuides.push(guide);

          if (guide.orientation === "horizontal" && snapY === null) {
            snapY = guide.position - point + bounds.y;
          } else if (guide.orientation === "vertical" && snapX === null) {
            snapX = guide.position - point + bounds.x;
          }

          break;
        }
      }
    });

    const snapSuggestions =
      snapX !== null || snapY !== null
        ? { x: snapX ?? bounds.x, y: snapY ?? bounds.y }
        : null;

    return { alignedGuides, snapSuggestions };
  }, [guides, bounds, tolerance]);
}

// ============================================================================
// Export Default
// ============================================================================

export default RulerGuides;
