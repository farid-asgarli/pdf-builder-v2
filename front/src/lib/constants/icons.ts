/**
 * Component Icon Mapping
 * Maps component types to their Lucide React icon names
 */

import {
  Rows3,
  Columns3,
  Table,
  Layers,
  LayoutTemplate,
  WrapText,
  Columns4,
  Type,
  Image,
  Minus,
  Square,
  Link,
  List,
  PenTool,
  Barcode,
  QrCode,
  BoxSelect,
  SquareDashed,
  PaintBucket,
  RectangleHorizontal,
  Sun,
  ALargeSmall,
  MoveHorizontal,
  MoveVertical,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignHorizontalDistributeCenter,
  Ratio,
  Expand,
  Shrink,
  Maximize,
  Lock,
  RotateCcw,
  Scale,
  Scaling,
  Move,
  FlipHorizontal,
  SeparatorHorizontal,
  Space,
  Eye,
  OctagonPause,
  BookOpen,
  Repeat,
  CircleDot,
  SkipForward,
  ArrowRightLeft,
  Layers2,
  Bug,
  Target,
  GitBranch,
  ShieldMinus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ComponentType } from "@/types/component";

/**
 * Icon mapping from component type to Lucide icon component
 */
export const COMPONENT_ICONS: Record<ComponentType, LucideIcon> = {
  // Container/Layout Components
  [ComponentType.Column]: Rows3,
  [ComponentType.Row]: Columns3,
  [ComponentType.Table]: Table,
  [ComponentType.Layers]: Layers,
  [ComponentType.Decoration]: LayoutTemplate,
  [ComponentType.Inlined]: WrapText,
  [ComponentType.MultiColumn]: Columns4,

  // Content Components
  [ComponentType.Text]: Type,
  [ComponentType.Image]: Image,
  [ComponentType.Line]: Minus,
  [ComponentType.Placeholder]: Square,
  [ComponentType.Hyperlink]: Link,
  [ComponentType.List]: List,
  [ComponentType.Canvas]: PenTool,
  [ComponentType.Barcode]: Barcode,
  [ComponentType.QRCode]: QrCode,

  // Styling Components
  [ComponentType.Padding]: BoxSelect,
  [ComponentType.Border]: SquareDashed,
  [ComponentType.Background]: PaintBucket,
  [ComponentType.RoundedCorners]: RectangleHorizontal,
  [ComponentType.Shadow]: Sun,
  [ComponentType.DefaultTextStyle]: ALargeSmall,

  // Sizing Components
  [ComponentType.Width]: MoveHorizontal,
  [ComponentType.Height]: MoveVertical,
  [ComponentType.MinWidth]: ArrowLeftToLine,
  [ComponentType.MaxWidth]: ArrowRightToLine,
  [ComponentType.MinHeight]: ArrowUpToLine,
  [ComponentType.MaxHeight]: ArrowDownToLine,
  [ComponentType.Alignment]: AlignHorizontalDistributeCenter,
  [ComponentType.AspectRatio]: Ratio,
  [ComponentType.Extend]: Expand,
  [ComponentType.Shrink]: Shrink,
  [ComponentType.Unconstrained]: Maximize,
  [ComponentType.Constrained]: Lock,

  // Transformation Components
  [ComponentType.Rotate]: RotateCcw,
  [ComponentType.Scale]: Scale,
  [ComponentType.ScaleToFit]: Scaling,
  [ComponentType.Translate]: Move,
  [ComponentType.Flip]: FlipHorizontal,

  // Flow Control Components
  [ComponentType.PageBreak]: SeparatorHorizontal,
  [ComponentType.EnsureSpace]: Space,
  [ComponentType.ShowEntire]: Eye,
  [ComponentType.StopPaging]: OctagonPause,
  [ComponentType.Section]: BookOpen,
  [ComponentType.Repeat]: Repeat,
  [ComponentType.ShowOnce]: CircleDot,
  [ComponentType.SkipOnce]: SkipForward,

  // Special Components
  [ComponentType.ContentDirection]: ArrowRightLeft,
  [ComponentType.ZIndex]: Layers2,
  [ComponentType.DebugArea]: Bug,
  [ComponentType.DebugPointer]: Target,

  // Conditional Components
  [ComponentType.ShowIf]: GitBranch,
  [ComponentType.PreventPageBreak]: ShieldMinus,
};

/**
 * Get the icon component for a given component type
 */
export function getComponentIcon(type: ComponentType): LucideIcon {
  return COMPONENT_ICONS[type] || Square;
}
