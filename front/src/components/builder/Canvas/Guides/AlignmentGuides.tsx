/**
 * AlignmentGuides Component
 * Visual alignment guides overlay for the canvas during resize/move operations
 *
 * Features:
 * - Snap-to-edge detection (show red lines when aligned)
 * - Smart spacing detection (show when spacing matches)
 * - Center alignment guides (horizontal/vertical)
 * - Distance indicators between components
 *
 * The component renders alignment guides from the interaction store
 * and provides visual feedback during resize and move operations.
 */
"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useInteractionStore } from "@/store/interaction-store";
import type { AlignmentGuide } from "@/store/interaction-store";
import type { Point } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the AlignmentGuides component
 */
export interface AlignmentGuidesProps {
  /** Current canvas zoom level (for scaling UI elements) */
  zoom?: number;
  /** Canvas offset for proper positioning */
  canvasOffset?: Point;
  /** Whether to show edge alignment guides */
  showEdgeGuides?: boolean;
  /** Whether to show center alignment guides */
  showCenterGuides?: boolean;
  /** Whether to show spacing guides */
  showSpacingGuides?: boolean;
  /** Whether to show distance indicators */
  showDistanceIndicators?: boolean;
  /** Color for edge alignment guides */
  edgeGuideColor?: string;
  /** Color for center alignment guides */
  centerGuideColor?: string;
  /** Color for spacing guides */
  spacingGuideColor?: string;
  /** Thickness of guide lines in pixels */
  lineThickness?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for individual guide line
 */
export interface GuideLineProps {
  /** The alignment guide data */
  guide: AlignmentGuide;
  /** Current zoom level */
  zoom: number;
  /** Guide color */
  color?: string;
  /** Line thickness */
  thickness?: number;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
}

/**
 * Props for distance indicator
 */
export interface DistanceIndicatorProps {
  /** Start point of the distance line */
  start: Point;
  /** End point of the distance line */
  end: Point;
  /** The distance value to display */
  distance: number;
  /** Current zoom level */
  zoom: number;
  /** Orientation of the indicator */
  orientation: "horizontal" | "vertical";
  /** Color for the indicator */
  color?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for spacing indicator
 */
export interface SpacingIndicatorProps {
  /** The alignment guide with spacing info */
  guide: AlignmentGuide;
  /** Current zoom level */
  zoom: number;
  /** Color for the indicator */
  color?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default colors for guides */
const GUIDE_COLORS = {
  edge: "#ef4444", // Red-500 - Edge alignment
  center: "#8b5cf6", // Violet-500 - Center alignment
  spacing: "#3b82f6", // Blue-500 - Spacing guides
};

/** Default line thickness */
const DEFAULT_LINE_THICKNESS = 1;

/** Dash pattern for center guides */
const CENTER_DASH_PATTERN = "4 4";

/** Minimum distance to show label */
const MIN_DISTANCE_FOR_LABEL = 20;

/** Label padding */
const LABEL_PADDING = 4;

/** Animation duration for guide appearance */
const ANIMATION_DURATION = 150;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate the length of a guide line
 */
function calculateGuideLength(guide: AlignmentGuide): number {
  const dx = guide.end.x - guide.start.x;
  const dy = guide.end.y - guide.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get the midpoint of a guide
 */
function getGuideMidpoint(guide: AlignmentGuide): Point {
  return {
    x: (guide.start.x + guide.end.x) / 2,
    y: (guide.start.y + guide.end.y) / 2,
  };
}

/**
 * Format distance for display
 */
function formatDistance(distance: number): string {
  if (distance < 1) {
    return "< 1px";
  }
  return `${Math.round(distance)}px`;
}

/**
 * Determine if a guide is a center alignment guide based on label
 */
function isCenterGuide(guide: AlignmentGuide): boolean {
  return guide.label === "center";
}

// ============================================================================
// Guide Line Component
// ============================================================================

/**
 * Individual guide line with optional label
 */
const GuideLine = memo(function GuideLine({
  guide,
  zoom,
  color = GUIDE_COLORS.edge,
  thickness = DEFAULT_LINE_THICKNESS,
  showLabel = true,
  animationDuration = ANIMATION_DURATION,
}: GuideLineProps) {
  const isCenter = isCenterGuide(guide);
  const isSpacing = guide.type === "spacing";
  const guideLength = calculateGuideLength(guide);
  const midpoint = getGuideMidpoint(guide);

  // Scale thickness inversely with zoom for consistent visual
  const scaledThickness = Math.max(thickness / zoom, 1);

  // Determine if we should show a label
  const shouldShowLabel =
    showLabel && guide.label && guideLength >= MIN_DISTANCE_FOR_LABEL;

  // Calculate label position offset
  const labelOffset = isSpacing ? 12 / zoom : 8 / zoom;

  return (
    <g
      className="alignment-guide"
      style={{
        animation: `fadeIn ${animationDuration}ms ease-out`,
      }}
    >
      {/* Guide line */}
      <line
        x1={guide.start.x}
        y1={guide.start.y}
        x2={guide.end.x}
        y2={guide.end.y}
        stroke={color}
        strokeWidth={scaledThickness}
        strokeDasharray={isCenter ? CENTER_DASH_PATTERN : undefined}
        strokeLinecap="round"
        className="pointer-events-none"
        style={{
          filter: isSpacing ? "none" : "drop-shadow(0 0 1px rgba(0,0,0,0.3))",
        }}
      />

      {/* End markers for edge guides */}
      {!isSpacing && !isCenter && (
        <>
          {/* Start marker */}
          <circle
            cx={guide.start.x}
            cy={guide.start.y}
            r={3 / zoom}
            fill={color}
            className="pointer-events-none"
          />
          {/* End marker */}
          <circle
            cx={guide.end.x}
            cy={guide.end.y}
            r={3 / zoom}
            fill={color}
            className="pointer-events-none"
          />
        </>
      )}

      {/* Label */}
      {shouldShowLabel && (
        <LabelBadge
          x={midpoint.x}
          y={
            guide.type === "horizontal" ? midpoint.y - labelOffset : midpoint.y
          }
          offsetX={guide.type === "vertical" ? labelOffset : 0}
          text={guide.label!}
          zoom={zoom}
          color={color}
        />
      )}
    </g>
  );
});

GuideLine.displayName = "GuideLine";

// ============================================================================
// Label Badge Component
// ============================================================================

interface LabelBadgeProps {
  x: number;
  y: number;
  offsetX?: number;
  text: string;
  zoom: number;
  color: string;
}

const LabelBadge = memo(function LabelBadge({
  x,
  y,
  offsetX = 0,
  text,
  zoom,
  color,
}: LabelBadgeProps) {
  // Scale font and padding inversely with zoom
  const fontSize = Math.max(10 / zoom, 8);
  const padding = LABEL_PADDING / zoom;
  const borderRadius = 3 / zoom;

  // Estimate text width (approximate)
  const estimatedWidth = text.length * fontSize * 0.6 + padding * 2;
  const height = fontSize + padding * 2;

  return (
    <g className="pointer-events-none">
      {/* Background */}
      <rect
        x={x + offsetX - estimatedWidth / 2}
        y={y - height / 2}
        width={estimatedWidth}
        height={height}
        rx={borderRadius}
        fill={color}
        opacity={0.9}
      />
      {/* Text */}
      <text
        x={x + offsetX}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={fontSize}
        fontWeight={500}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {text}
      </text>
    </g>
  );
});

LabelBadge.displayName = "LabelBadge";

// ============================================================================
// Distance Indicator Component
// ============================================================================

/**
 * Shows the distance between two points with a measurement line
 */
export const DistanceIndicator = memo(function DistanceIndicator({
  start,
  end,
  distance,
  zoom,
  orientation,
  color = GUIDE_COLORS.spacing,
  className,
}: DistanceIndicatorProps) {
  const scaledThickness = Math.max(1 / zoom, 0.5);
  const arrowSize = 4 / zoom;
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  // Don't render if distance is too small
  if (distance < 5) return null;

  return (
    <g className={cn("distance-indicator pointer-events-none", className)}>
      {/* Main line */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={color}
        strokeWidth={scaledThickness}
        strokeDasharray="2 2"
      />

      {/* Start arrow */}
      {orientation === "horizontal" ? (
        <path
          d={`M ${start.x + arrowSize} ${start.y - arrowSize / 2} L ${start.x} ${start.y} L ${start.x + arrowSize} ${start.y + arrowSize / 2}`}
          stroke={color}
          strokeWidth={scaledThickness}
          fill="none"
        />
      ) : (
        <path
          d={`M ${start.x - arrowSize / 2} ${start.y + arrowSize} L ${start.x} ${start.y} L ${start.x + arrowSize / 2} ${start.y + arrowSize}`}
          stroke={color}
          strokeWidth={scaledThickness}
          fill="none"
        />
      )}

      {/* End arrow */}
      {orientation === "horizontal" ? (
        <path
          d={`M ${end.x - arrowSize} ${end.y - arrowSize / 2} L ${end.x} ${end.y} L ${end.x - arrowSize} ${end.y + arrowSize / 2}`}
          stroke={color}
          strokeWidth={scaledThickness}
          fill="none"
        />
      ) : (
        <path
          d={`M ${end.x - arrowSize / 2} ${end.y - arrowSize} L ${end.x} ${end.y} L ${end.x + arrowSize / 2} ${end.y - arrowSize}`}
          stroke={color}
          strokeWidth={scaledThickness}
          fill="none"
        />
      )}

      {/* Distance label */}
      <LabelBadge
        x={midpoint.x}
        y={midpoint.y}
        offsetX={orientation === "vertical" ? 20 / zoom : 0}
        text={formatDistance(distance)}
        zoom={zoom}
        color={color}
      />
    </g>
  );
});

DistanceIndicator.displayName = "DistanceIndicator";

// ============================================================================
// Spacing Indicator Component
// ============================================================================

/**
 * Visual indicator for equal spacing between components
 */
export const SpacingIndicator = memo(function SpacingIndicator({
  guide,
  zoom,
  color = GUIDE_COLORS.spacing,
  className,
}: SpacingIndicatorProps) {
  const scaledThickness = Math.max(1.5 / zoom, 1);
  const bracketSize = 6 / zoom;
  const isHorizontal =
    guide.end.x - guide.start.x > guide.end.y - guide.start.y;
  const midpoint = getGuideMidpoint(guide);
  const distance = calculateGuideLength(guide);

  // Parse the spacing value from label
  const spacingValue = guide.label
    ? parseInt(guide.label.replace("px", ""), 10)
    : distance;

  return (
    <g className={cn("spacing-indicator pointer-events-none", className)}>
      {/* Main spacing line */}
      <line
        x1={guide.start.x}
        y1={guide.start.y}
        x2={guide.end.x}
        y2={guide.end.y}
        stroke={color}
        strokeWidth={scaledThickness}
        strokeOpacity={0.7}
      />

      {/* Brackets at ends */}
      {isHorizontal ? (
        <>
          {/* Start bracket (vertical line) */}
          <line
            x1={guide.start.x}
            y1={guide.start.y - bracketSize}
            x2={guide.start.x}
            y2={guide.start.y + bracketSize}
            stroke={color}
            strokeWidth={scaledThickness}
          />
          {/* End bracket (vertical line) */}
          <line
            x1={guide.end.x}
            y1={guide.end.y - bracketSize}
            x2={guide.end.x}
            y2={guide.end.y + bracketSize}
            stroke={color}
            strokeWidth={scaledThickness}
          />
        </>
      ) : (
        <>
          {/* Start bracket (horizontal line) */}
          <line
            x1={guide.start.x - bracketSize}
            y1={guide.start.y}
            x2={guide.start.x + bracketSize}
            y2={guide.start.y}
            stroke={color}
            strokeWidth={scaledThickness}
          />
          {/* End bracket (horizontal line) */}
          <line
            x1={guide.end.x - bracketSize}
            y1={guide.end.y}
            x2={guide.end.x + bracketSize}
            y2={guide.end.y}
            stroke={color}
            strokeWidth={scaledThickness}
          />
        </>
      )}

      {/* Spacing label */}
      <LabelBadge
        x={midpoint.x}
        y={midpoint.y}
        offsetX={isHorizontal ? 0 : 20 / zoom}
        text={formatDistance(spacingValue)}
        zoom={zoom}
        color={color}
      />

      {/* Equal spacing indicator dots */}
      <EqualSpacingDots
        start={guide.start}
        end={guide.end}
        count={3}
        zoom={zoom}
        color={color}
      />
    </g>
  );
});

SpacingIndicator.displayName = "SpacingIndicator";

// ============================================================================
// Equal Spacing Dots Component
// ============================================================================

interface EqualSpacingDotsProps {
  start: Point;
  end: Point;
  count: number;
  zoom: number;
  color: string;
}

const EqualSpacingDots = memo(function EqualSpacingDots({
  start,
  end,
  count,
  zoom,
  color,
}: EqualSpacingDotsProps) {
  const dotRadius = 2 / zoom;
  const midpoint = getGuideMidpoint({ start, end } as AlignmentGuide);
  const distance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );

  // Don't show dots if distance is too small
  if (distance < 30) return null;

  const dots = [];
  const spacing = distance / (count + 1);
  const dx = (end.x - start.x) / distance;
  const dy = (end.y - start.y) / distance;

  // Position dots on either side of the midpoint
  for (let i = 1; i <= count; i++) {
    const x = start.x + dx * spacing * i;
    const y = start.y + dy * spacing * i;

    // Skip the center dot (we have a label there)
    const distFromMid = Math.sqrt(
      Math.pow(x - midpoint.x, 2) + Math.pow(y - midpoint.y, 2)
    );
    if (distFromMid < 15 / zoom) continue;

    dots.push(
      <circle
        key={`dot-${i}`}
        cx={x}
        cy={y}
        r={dotRadius}
        fill={color}
        opacity={0.5}
      />
    );
  }

  return <g>{dots}</g>;
});

EqualSpacingDots.displayName = "EqualSpacingDots";

// ============================================================================
// Center Guide Component
// ============================================================================

interface CenterGuideProps {
  guide: AlignmentGuide;
  zoom: number;
  color?: string;
}

const CenterGuide = memo(function CenterGuide({
  guide,
  zoom,
  color = GUIDE_COLORS.center,
}: CenterGuideProps) {
  const scaledThickness = Math.max(1 / zoom, 0.5);
  const iconSize = 8 / zoom;
  const midpoint = getGuideMidpoint(guide);

  return (
    <g className="center-guide pointer-events-none">
      {/* Dashed center line */}
      <line
        x1={guide.start.x}
        y1={guide.start.y}
        x2={guide.end.x}
        y2={guide.end.y}
        stroke={color}
        strokeWidth={scaledThickness}
        strokeDasharray={CENTER_DASH_PATTERN}
        strokeLinecap="round"
        opacity={0.8}
      />

      {/* Center icon (crosshair) */}
      {guide.type === "horizontal" ? (
        <>
          <line
            x1={midpoint.x - iconSize / 2}
            y1={midpoint.y}
            x2={midpoint.x + iconSize / 2}
            y2={midpoint.y}
            stroke={color}
            strokeWidth={scaledThickness * 1.5}
          />
          <line
            x1={midpoint.x}
            y1={midpoint.y - iconSize / 2}
            x2={midpoint.x}
            y2={midpoint.y + iconSize / 2}
            stroke={color}
            strokeWidth={scaledThickness * 1.5}
          />
        </>
      ) : (
        <>
          <line
            x1={midpoint.x - iconSize / 2}
            y1={midpoint.y}
            x2={midpoint.x + iconSize / 2}
            y2={midpoint.y}
            stroke={color}
            strokeWidth={scaledThickness * 1.5}
          />
          <line
            x1={midpoint.x}
            y1={midpoint.y - iconSize / 2}
            x2={midpoint.x}
            y2={midpoint.y + iconSize / 2}
            stroke={color}
            strokeWidth={scaledThickness * 1.5}
          />
        </>
      )}
    </g>
  );
});

CenterGuide.displayName = "CenterGuide";

// ============================================================================
// Main AlignmentGuides Component
// ============================================================================

/**
 * Renders alignment guides overlay on the canvas
 * Displays edge alignment, center alignment, and spacing guides
 */
function AlignmentGuidesComponent({
  zoom = 1,
  canvasOffset = { x: 0, y: 0 },
  showEdgeGuides = true,
  showCenterGuides = true,
  showSpacingGuides = true,
  showDistanceIndicators = true,
  edgeGuideColor = GUIDE_COLORS.edge,
  centerGuideColor = GUIDE_COLORS.center,
  spacingGuideColor = GUIDE_COLORS.spacing,
  lineThickness = DEFAULT_LINE_THICKNESS,
  className,
}: AlignmentGuidesProps) {
  // Get alignment guides from interaction store
  const alignmentGuides = useInteractionStore((state) => state.alignmentGuides);
  const visualSettings = useInteractionStore((state) => state.visualSettings);
  const activeInteraction = useInteractionStore(
    (state) => state.activeInteraction
  );

  // Don't render if no interaction is active or guides are disabled
  const shouldRender = useMemo(() => {
    return (
      activeInteraction !== null &&
      visualSettings.showAlignmentGuides &&
      alignmentGuides.length > 0
    );
  }, [activeInteraction, visualSettings.showAlignmentGuides, alignmentGuides]);

  // Categorize guides by type
  const { edgeGuides, centerGuides, spacingGuides } = useMemo(() => {
    const edge: AlignmentGuide[] = [];
    const center: AlignmentGuide[] = [];
    const spacing: AlignmentGuide[] = [];

    for (const guide of alignmentGuides) {
      if (guide.type === "spacing") {
        spacing.push(guide);
      } else if (isCenterGuide(guide)) {
        center.push(guide);
      } else {
        edge.push(guide);
      }
    }

    return {
      edgeGuides: edge,
      centerGuides: center,
      spacingGuides: spacing,
    };
  }, [alignmentGuides]);

  // Don't render if nothing to show
  if (!shouldRender) {
    return null;
  }

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 z-50 overflow-visible",
        className
      )}
      style={{
        transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
      }}
      aria-hidden="true"
    >
      {/* CSS Animation styles */}
      <defs>
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}
        </style>
      </defs>

      {/* Edge alignment guides (red lines when aligned) */}
      {showEdgeGuides &&
        visualSettings.showAlignmentGuides &&
        edgeGuides.map((guide) => (
          <GuideLine
            key={guide.id}
            guide={guide}
            zoom={zoom}
            color={edgeGuideColor}
            thickness={lineThickness}
            showLabel={false}
          />
        ))}

      {/* Center alignment guides (purple dashed lines) */}
      {showCenterGuides &&
        visualSettings.showCenterGuides &&
        centerGuides.map((guide) => (
          <CenterGuide
            key={guide.id}
            guide={guide}
            zoom={zoom}
            color={centerGuideColor}
          />
        ))}

      {/* Spacing guides (blue with measurement) */}
      {showSpacingGuides &&
        visualSettings.showSpacingGuides &&
        spacingGuides.map((guide) => (
          <SpacingIndicator
            key={guide.id}
            guide={guide}
            zoom={zoom}
            color={spacingGuideColor}
          />
        ))}

      {/* Distance indicators (optional, for showing exact distances) */}
      {showDistanceIndicators &&
        edgeGuides.length > 0 &&
        edgeGuides.slice(0, 2).map((guide) => {
          const length = calculateGuideLength(guide);
          if (length < MIN_DISTANCE_FOR_LABEL) return null;
          return (
            <DistanceIndicator
              key={`distance-${guide.id}`}
              start={guide.start}
              end={guide.end}
              distance={length}
              zoom={zoom}
              orientation={
                guide.type === "horizontal" ? "horizontal" : "vertical"
              }
              color={edgeGuideColor}
            />
          );
        })}
    </svg>
  );
}

export const AlignmentGuides = memo(AlignmentGuidesComponent);
AlignmentGuides.displayName = "AlignmentGuides";

// ============================================================================
// Selector Hooks for Performance
// ============================================================================

/**
 * Hook to check if any alignment guides are currently visible
 */
export function useHasAlignmentGuides(): boolean {
  const guides = useInteractionStore((state) => state.alignmentGuides);
  const isEnabled = useInteractionStore(
    (state) => state.visualSettings.showAlignmentGuides
  );
  return isEnabled && guides.length > 0;
}

/**
 * Hook to get the count of alignment guides by type
 */
export function useAlignmentGuideCount(): {
  edge: number;
  center: number;
  spacing: number;
  total: number;
} {
  const guides = useInteractionStore((state) => state.alignmentGuides);

  return useMemo(() => {
    let edge = 0;
    let center = 0;
    let spacing = 0;

    for (const guide of guides) {
      if (guide.type === "spacing") {
        spacing++;
      } else if (isCenterGuide(guide)) {
        center++;
      } else {
        edge++;
      }
    }

    return { edge, center, spacing, total: guides.length };
  }, [guides]);
}

export default AlignmentGuides;
