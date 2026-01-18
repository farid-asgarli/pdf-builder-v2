# PDF Builder Frontend - Complete Architecture Guide

## Table of Contents

1. [Project Overview](#project-overview)
2. [Complete Project Structure](#complete-project-structure)
3. [Component Specifications](#component-specifications)
4. [Tech Stack](#tech-stack)
5. [Development Phases](#development-phases)
6. [Backend Integration](#backend-integration)

---

## Project Overview

**Purpose:**
Visual, no-code PDF template builder for non-technical users to create insurance contracts and documents using a Figma-like interface.

**Core Features:**

- Canvas-based drag-and-drop layout builder
- Flow-based layout (Column/Row) - NOT absolute positioning
- Component palette with 54+ PDF components
- Monaco editor for expression syntax (`{{ data.field }}`)
- Real-time preview with backend integration
- Template save/load functionality
- Properties panel for component configuration

**Architecture Pattern:**

- Component-based architecture (React Server Components + Client Components)
- State management with Zustand
- API integration with React Query
- Canvas rendering with custom React components

---

**⚠️ IMPORTANT: Backend Integration Note**

The backend is **already fully ready** to handle all resize and adjustment functionality. The backend simply receives width/height/padding values in JSON - it doesn't know or care whether those values were:

- Typed into a text field
- Set via drag handles
- Calculated from expressions

**Resize handles are purely a frontend UX enhancement.** No backend changes are needed for this functionality.

```
Example:
Frontend: User drags resize handle → width becomes 200px
Backend:  Receives { "width": 200 } in JSON → Renders PDF with 200px width
```

---

## Complete Project Structure

```
pdfbuilder-frontend/
├── src/
│   ├── app/                                    # Next.js 16 App Router
│   │   ├── (auth)/                            # Auth routes group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/                       # Protected routes group
│   │   │   ├── templates/
│   │   │   │   ├── page.tsx               # Templates list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx           # Template detail/edit
│   │   │   │   └── new/
│   │   │   │       └── page.tsx           # New template
│   │   │   └── builder/
│   │   │       └── [templateId]/
│   │   │           └── page.tsx           # Main canvas builder
│   │   ├── api/                               # API route handlers (if needed)
│   │   │   └── upload/
│   │   │       └── route.ts               # Image upload proxy
│   │   ├── layout.tsx                         # Root layout
│   │   ├── page.tsx                           # Home/landing page
│   │   └── globals.css                        # Global styles
│   │
│   ├── components/                            # React Components
│   │   ├── builder/                           # Canvas Builder Components
│   │   │   ├── Canvas/
│   │   │   │   ├── Canvas.tsx                 # Main canvas area
│   │   │   │   ├── CanvasGrid.tsx             # Background grid
│   │   │   │   ├── CanvasToolbar.tsx          # Zoom, undo/redo controls
│   │   │   │   ├── SelectionBox.tsx           # Component selection visual
│   │   │   │   ├── ResizeHandles/             # Visual resize system
│   │   │   │   │   ├── ResizeHandles.tsx      # 8-point resize handles
│   │   │   │   │   ├── CornerHandle.tsx       # Corner drag handles
│   │   │   │   │   ├── EdgeHandle.tsx         # Edge drag handles
│   │   │   │   │   ├── RotationHandle.tsx     # Rotation control
│   │   │   │   │   └── DimensionTooltip.tsx   # Size display during resize
│   │   │   │   ├── Guides/                    # Visual alignment aids
│   │   │   │   │   ├── AlignmentGuides.tsx    # Smart guides when resizing
│   │   │   │   │   ├── SnapGrid.tsx           # Snap-to-grid overlay
│   │   │   │   │   └── RulerGuides.tsx        # Ruler measurements
│   │   │   │   └── Interactions/              # Interactive adjusters
│   │   │   │       ├── PaddingAdjuster.tsx    # Visual padding drag
│   │   │   │       ├── SpacingAdjuster.tsx    # Gap between components
│   │   │   │       └── TableColumnResizer.tsx # Table column width dragger
│   │   │   ├── ComponentPalette/
│   │   │   │   ├── ComponentPalette.tsx       # Sidebar component list
│   │   │   │   ├── ComponentCategory.tsx      # Collapsible categories
│   │   │   │   └── ComponentCard.tsx          # Draggable component card
│   │   │   ├── ComponentTree/
│   │   │   │   ├── ComponentTree.tsx          # Hierarchical tree view
│   │   │   │   ├── TreeNode.tsx               # Recursive tree node
│   │   │   │   └── TreeActions.tsx            # Node actions (delete, duplicate)
│   │   │   ├── CanvasModeSelector/            # Header/Footer/Content mode switching
│   │   │   │   ├── CanvasModeSelector.tsx     # Mode tabs (Content/Header/Footer)
│   │   │   │   ├── ModeTab.tsx                # Individual mode tab
│   │   │   │   └── ModeIndicator.tsx          # "Editing: Header" banner
│   │   │   ├── HeaderFooterEditor/            # Header/Footer editing
│   │   │   │   ├── HeaderEditor.tsx           # Header-specific canvas
│   │   │   │   ├── FooterEditor.tsx           # Footer-specific canvas
│   │   │   │   ├── PagePreview.tsx            # Full page preview
│   │   │   │   └── RepeatIndicator.tsx        # "Repeats on every page" visual
│   │   │   ├── PageContext/                   # Page variables
│   │   │   │   ├── PageVariables.tsx          # Page variable reference panel
│   │   │   │   └── PageExpressionHelper.tsx   # Monaco autocomplete helper
│   │   │   ├── PropertiesPanel/
│   │   │   │   ├── PropertiesPanel.tsx        # Right sidebar properties
│   │   │   │   ├── PropertySection.tsx        # Collapsible property groups
│   │   │   │   ├── fields/                    # Property input fields
│   │   │   │   │   ├── TextField.tsx
│   │   │   │   │   ├── NumberField.tsx
│   │   │   │   │   ├── ColorPicker.tsx
│   │   │   │   │   ├── FontPicker.tsx
│   │   │   │   │   ├── AlignmentPicker.tsx
│   │   │   │   │   ├── ExpressionEditor.tsx   # Monaco integration
│   │   │   │   │   └── ImageUploader.tsx
│   │   │   │   └── PropertyGroups/
│   │   │   │       ├── StylingProperties.tsx
│   │   │   │       ├── SizingProperties.tsx
│   │   │   │       ├── ContentProperties.tsx
│   │   │   │       └── LayoutProperties.tsx
│   │   │   ├── Renderers/                     # Canvas component renderers
│   │   │   │   ├── ColumnRenderer.tsx         # Visual column in canvas
│   │   │   │   ├── RowRenderer.tsx            # Visual row in canvas
│   │   │   │   ├── TableRenderer.tsx          # Visual table in canvas
│   │   │   │   ├── TextRenderer.tsx           # Visual text in canvas
│   │   │   │   ├── ImageRenderer.tsx          # Visual image in canvas
│   │   │   │   └── index.ts                   # Renderer registry
│   │   │   ├── TopBar/
│   │   │   │   ├── TopBar.tsx                 # Top navigation bar
│   │   │   │   ├── TemplateInfo.tsx           # Template name, meta
│   │   │   │   ├── Actions.tsx                # Save, Preview, Export
│   │   │   │   └── ViewModeToggle.tsx         # Canvas/Code view toggle
│   │   │   └── Preview/
│   │   │       ├── PreviewPanel.tsx           # PDF preview pane
│   │   │       ├── PreviewToolbar.tsx         # Page navigation
│   │   │       └── PdfViewer.tsx              # Embedded PDF viewer
│   │   │
│   │   ├── templates/                         # Template Management
│   │   │   ├── TemplateCard.tsx               # Template grid card
│   │   │   ├── TemplateList.tsx               # Template listing
│   │   │   ├── TemplateFilters.tsx            # Filter/search templates
│   │   │   └── TemplateActions.tsx            # Duplicate, delete, export
│   │   │
│   │   ├── monaco/                            # Monaco Editor Integration
│   │   │   ├── MonacoExpressionEditor.tsx     # Expression editor wrapper
│   │   │   ├── ExpressionAutocomplete.tsx     # Data field autocomplete
│   │   │   └── ExpressionValidator.tsx        # Syntax validation
│   │   │
│   │   ├── ui/                                # Reusable UI Components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── separator.tsx
│   │   │   └── toast.tsx
│   │   │
│   │   └── common/                            # Common Components
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── lib/                                   # Utilities & Libraries
│   │   ├── api/                               # API Client
│   │   │   ├── client.ts                      # Axios instance
│   │   │   ├── endpoints/
│   │   │   │   ├── pdf.ts                     # PDF generation API
│   │   │   │   ├── templates.ts               # Template CRUD API
│   │   │   │   └── validation.ts              # Validation API
│   │   │   └── types.ts                       # API types (generated)
│   │   ├── canvas/                            # Canvas Logic
│   │   │   ├── dnd.ts                         # Drag and drop handlers
│   │   │   ├── selection.ts                   # Component selection logic
│   │   │   ├── layout-calculator.ts           # Flow layout calculations
│   │   │   └── history.ts                     # Undo/redo stack
│   │   ├── schema/                            # JSON Schema
│   │   │   ├── layout-node.ts                 # LayoutNode type definitions
│   │   │   ├── component-properties.ts        # Component property types
│   │   │   ├── validators.ts                  # Zod schemas
│   │   │   └── defaults.ts                    # Default property values
│   │   ├── utils/                             # Utility Functions
│   │   │   ├── cn.ts                          # className utility
│   │   │   ├── color.ts                       # Color helpers
│   │   │   ├── format.ts                      # Formatters
│   │   │   └── file.ts                        # File upload helpers
│   │   └── constants/                         # Constants
│   │       ├── components.ts                  # Component metadata
│   │       ├── colors.ts                      # Color palettes
│   │       └── fonts.ts                       # Font families
│   │
│   ├── hooks/                                 # Custom React Hooks
│   │   ├── useCanvas.ts                       # Canvas state management
│   │   ├── useComponentSelection.ts           # Selection state
│   │   ├── useHistory.ts                      # Undo/redo hook
│   │   ├── useDragAndDrop.ts                  # DnD functionality
│   │   ├── useResize.ts                       # Component resize logic
│   │   ├── useTransform.ts                    # Rotation/scale/translate
│   │   ├── useAlignment.ts                    # Alignment guides
│   │   ├── useTemplate.ts                     # Template CRUD operations
│   │   ├── usePdfGeneration.ts                # PDF generation hook
│   │   └── useDebounce.ts                     # Debounce hook
│   │
│   ├── store/                                 # State Management (Zustand)
│   │   ├── canvas-store.ts                    # Canvas state (layout tree)
│   │   ├── selection-store.ts                 # Selected component state
│   │   ├── interaction-store.ts               # Resize/transform interaction state
│   │   ├── history-store.ts                   # Undo/redo history
│   │   ├── preview-store.ts                   # Preview panel state
│   │   └── template-store.ts                  # Current template metadata
│   │
│   ├── types/                                 # TypeScript Types
│   │   ├── canvas.ts                          # Canvas-related types
│   │   ├── component.ts                       # Component types
│   │   ├── template.ts                        # Template types
│   │   └── api.ts                             # API request/response types
│   │
│   └── config/                                # Configuration
│       ├── site.ts                            # Site metadata
│       ├── api.ts                             # API endpoints config
│       └── monaco.ts                          # Monaco editor config
│
├── public/                                    # Static Assets
│   ├── icons/                                 # Component icons
│   │   ├── column.svg
│   │   ├── row.svg
│   │   ├── table.svg
│   │   └── ...
│   └── fonts/                                 # Custom fonts (if any)
│
├── .env.local                                 # Environment variables
├── .eslintrc.json                             # ESLint configuration
├── .prettierrc                                # Prettier configuration
├── components.json                            # shadcn/ui configuration
├── next.config.mjs                            # Next.js configuration
├── package.json                               # Dependencies
├── postcss.config.mjs                         # PostCSS configuration
├── tailwind.config.ts                         # Tailwind configuration
├── tsconfig.json                              # TypeScript configuration
└── README.md                                  # Project documentation
```

---

## Component Specifications

### **Component Metadata Structure**

Each of the 54 backend components needs frontend metadata:

```typescript
interface ComponentMetadata {
  id: ComponentType;
  name: string;
  category:
    | "container"
    | "content"
    | "styling"
    | "sizing"
    | "transformation"
    | "flowControl"
    | "special";
  icon: string;
  description: string;
  defaultProperties: Record<string, any>;
  propertySchema: PropertyDefinition[];
  allowsChildren: boolean;
  requiredParent?: ComponentType[];
  previewComponent: React.ComponentType;
}
```

### **Component Categories for Palette**

1. **Layout (7 components)**
   - Column, Row, Table, Layers, Decoration, Inlined, MultiColumn

2. **Content (8 components)**
   - Text, Image, Line, Placeholder, Hyperlink, List, Canvas, QRCode/Barcode

3. **Styling (6 components)**
   - Padding, Border, Background, RoundedCorners, Shadow, DefaultTextStyle

4. **Sizing (12 components)**
   - Width, Height, MinWidth, MaxWidth, MinHeight, MaxHeight
   - AlignLeft, AlignCenter, AlignRight, AlignTop, AlignMiddle, AlignBottom
   - AspectRatio, Extend, Shrink, Unconstrained

5. **Transform (5 components)**
   - Rotate, Scale, ScaleToFit, Translate, Flip

6. **Flow (8 components)**
   - PageBreak, EnsureSpace, ShowEntire, StopPaging, Section, Repeat, ShowOnce, SkipOnce

7. **Advanced (3 components)**
   - ContentDirection, ZIndex, DebugArea

---

## Visual Resize & Adjustment System

### **Overview**

The canvas provides visual, interactive controls for adjusting component dimensions and properties. This is **frontend-only** - the backend simply receives the final numeric values.

### **Backend Integration Note**

⚠️ **IMPORTANT:** The backend is already fully ready for resize functionality. It accepts width/height/padding values regardless of how they were set in the UI. Resize handles are purely a frontend UX enhancement.

```
Frontend: User drags handle → width becomes 200px
          ↓
Backend:  Receives { "width": 200 } in JSON
          ↓
Backend:  Renders PDF with 200px width
```

The backend doesn't know or care about resize handles - it just applies the values.

### **Resize Features**

#### **1. Visual Resize Handles**

Every resizable component displays 8 drag handles when selected:

```
┌─────┬─────┬─────┐
│  1  │  2  │  3  │  Corner handles (1,3,7,9): Resize both dimensions
├─────┼─────┼─────┤
│  4  │     │  5  │  Edge handles (2,4,5,6): Resize one dimension
├─────┼─────┼─────┤
│  7  │  8  │  9  │
└─────┴─────┴─────┘
```

**Handle Types:**

- **Corner handles:** Resize width AND height simultaneously
- **Edge handles:** Resize width OR height only
- **Rotation handle:** Appears above component (for Rotate wrapper)

**Visual Feedback:**

- Cursor changes based on handle direction (↔ ↕ ↗ ↖ ↘ ↙)
- Dimension tooltip shows current size (e.g., "250 × 100px")
- Ghost outline during resize
- Real-time property panel updates

#### **2. Resize Constraints**

All resizes respect component and layout constraints:

**Component-Level Constraints:**

```typescript
// From component metadata
{
  minWidth: 50,
  maxWidth: 1000,
  minHeight: 20,
  maxHeight: 800,
  maintainAspectRatio: true  // For images
}
```

**Flow Layout Constraints:**

- Column children: Can resize width (within parent), height auto from content
- Row children: Can resize height (within parent), width auto from content
- Table cells: Width via column resizers, height auto or fixed
- Text: Width resizable (wraps text), height auto from wrapped content
- Images: Both dimensions resizable, aspect ratio lock optional

**Constraint Enforcement:**

- Handle turns red when at constraint limit
- Handle won't move beyond min/max
- Shift+drag locks aspect ratio (for images, containers)
- Cursor shows "not-allowed" when resize would violate constraint

#### **3. Interactive Adjustments**

Beyond basic width/height, users can visually adjust:

**Padding Adjuster:**

```
┌─────────────────┐
│ ╔═════════════╗ │ ← Drag these lines to adjust padding
│ ║   Content   ║ │
│ ╚═════════════╝ │
└─────────────────┘
```

- Click component → padding indicators appear
- Drag indicator lines to adjust padding
- Shows padding value tooltip during drag
- Uniform or per-side (top/right/bottom/left)

**Spacing Adjuster (Column/Row):**

```
┌─────────────┐
│  Component  │
├─────────────┤ ← Drag this gap to adjust spacing
│  Component  │
└─────────────┘
```

- Appears between children in Column/Row
- Drag to increase/decrease spacing
- Snaps to 5px increments

**Table Column Resizer:**

```
│ Column 1 │ Column 2 │ Column 3 │
           ↕          ↕  ← Drag these dividers
```

- Drag column dividers to adjust width
- Updates all rows simultaneously
- Shows column width tooltip

**Border Thickness:**

- Circular slider in properties panel
- Visual preview on component

#### **4. Alignment Guides**

Smart guides appear during resize/move operations:

**Snap-to-Edge:**

```
┌──────────┐
│          │
│  Guide   │  ← Red line appears when aligned
│          │     with another component
└──────────┘
```

**Snap-to-Grid:**

- Optional 10px or 5px grid
- Components snap to grid intersections
- Toggle: Canvas toolbar

**Smart Spacing:**

- Detects equal spacing between components
- Shows spacing value when matched
- Visual indicator when spacing matches

**Center Alignment:**

- Horizontal center guide
- Vertical center guide
- Shows when component is centered in parent

#### **5. Transform Controls**

For transformation components (Rotate, Scale, Translate):

**Rotation Handle:**

```
      ↻  ← Rotation handle
┌──────────┐
│          │
│ Component│
│          │
└──────────┘
```

- Appears above component
- Drag in circular motion
- Shows angle tooltip (e.g., "45°")
- Snaps to 15° increments (configurable)

**Scale Handles:**

- Same as resize handles
- Shows scale percentage (e.g., "150%")
- Maintains aspect ratio by default

**Translation Drag:**

- Entire component becomes draggable
- Shows offset values (e.g., "X: +10, Y: -5")
- Snaps to grid if enabled

### **Allowed vs. Not Allowed**

#### ✅ **Allowed (Flow-Respecting):**

- Width/height adjustment within constraints
- Padding visual adjustment
- Spacing between components
- Table column widths
- Component reordering within containers
- Rotation/scale/translate via wrapper components

#### ❌ **NOT Allowed (Breaking Flow):**

- Free absolute X/Y positioning (no drag anywhere on canvas)
- Overlapping components (except Layers component)
- Moving components outside their container
- Arbitrary rotation without Rotate wrapper
- Arbitrary scaling without Scale wrapper

### **Two-Way Binding**

All adjustments sync bidirectionally:

```
Resize Handle Drag
       ↓
Update Canvas Store
       ↓
Re-render Component
       ↓
Update Properties Panel

       ↕  (Works both ways)

Properties Panel Input
       ↓
Update Canvas Store
       ↓
Re-render Component
       ↓
Update Resize Handles
```

**Implementation:**

- Single source of truth: Canvas store
- React Query for debounced updates
- No race conditions

### **Resize Modes**

**Free Resize Mode (Default):**

- Drag any handle to any size (within constraints)
- Most flexible

**Proportional Resize Mode:**

- Hold Shift while dragging
- Maintains aspect ratio
- Useful for images, perfect squares

**Snap Mode:**

- Hold Ctrl/Cmd while dragging
- Snaps to 10px increments
- Useful for pixel-perfect layouts

**Constraint Mode:**

- Hold Alt while dragging
- Ignores min/max constraints temporarily (visual only)
- Useful for previewing "what if"

### **Performance Considerations**

- Debounce property updates during drag (16ms / 60fps)
- Use `requestAnimationFrame` for smooth handle movement
- Memoize renderer components
- Only re-render affected subtree
- Throttle alignment guide calculations

---

## Tech Stack

### **Core Framework**

- **Next.js 16+** with App Router
- **React 19** (Server Components + Client Components)
- **TypeScript 5+**

### **Styling**

- **Tailwind CSS 4** - Utility-first CSS
- **shadcn/ui** - Accessible component library
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library

### **State Management**

- **Zustand** - Lightweight state management
- **React Query (TanStack Query)** - Server state management
- **Immer** - Immutable state updates

### **Canvas & DnD**

- **@dnd-kit** - Modern drag and drop
- **react-konva** or **Custom Canvas** - Canvas rendering (evaluate both)

### **Monaco Editor**

- **@monaco-editor/react** - Expression editor
- **monaco-languageclient** - Language server integration (optional)

### **Form & Validation**

- **React Hook Form** - Form management
- **Zod** - Schema validation

### **API & Networking**

- **Axios** - HTTP client
- **React Query** - API state management

### **PDF Preview**

- **react-pdf** or **PDF.js** - PDF rendering in browser

### **Development Tools**

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Commitlint** - Commit message linting

---

## Development Phases

### **Phase 0: Project Setup (Week 1, Days 1-2)**

#### Goals

- Initialize Next.js 16 project
- Configure Tailwind, shadcn/ui
- Set up project structure

#### Tasks

- [ ] Create Next.js 16 app with TypeScript
- [ ] Configure Tailwind CSS 4
- [ ] Install and configure shadcn/ui
- [ ] Set up ESLint, Prettier
- [ ] Configure path aliases (@/components, @/lib, etc.)
- [ ] Create folder structure
- [ ] Set up environment variables
- [ ] Configure API client (Axios)

#### Deliverables

- ✅ Project scaffolded
- ✅ All tooling configured
- ✅ Basic routing structure

---

### **Phase 1: Component Metadata System (Week 1, Days 3-4)**

#### Goals

- Define all 54 components' metadata
- Create component registry
- Build type system

#### Tasks

- [ ] Create `ComponentType` enum (54 types)
- [ ] Define `ComponentMetadata` interface
- [ ] Create metadata for all components in `/lib/constants/components.ts`
- [ ] Define property schemas using Zod
- [ ] Create default property values for each component
- [ ] Build component category structure
- [ ] Create TypeScript types for LayoutNode structure

#### Deliverables

- ✅ Complete component registry
- ✅ Type-safe component metadata
- ✅ Property schemas defined

---

### **Phase 2: State Management Foundation (Week 1, Days 5-7)**

#### Goals

- Implement Zustand stores
- Build undo/redo system
- Create state persistence

#### Tasks

#### Canvas Store

- [ ] Create `canvas-store.ts`
- [ ] Implement layout tree state (LayoutNode hierarchy)
- [ ] Add component CRUD operations (add, update, delete, move)
- [ ] Implement tree traversal utilities
- [ ] Add validation on state mutations

#### Selection Store

- [ ] Create `selection-store.ts`
- [ ] Track selected component(s)
- [ ] Multi-selection support
- [ ] Selection change handlers

#### History Store

- [ ] Create `history-store.ts`
- [ ] Implement undo/redo stack
- [ ] State snapshot system
- [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

#### Interaction Store (NEW)

- [ ] Create `interaction-store.ts`
- [ ] Track resize interaction state
- [ ] Track rotation interaction state
- [ ] Track translation interaction state
- [ ] Visual settings (grid, rulers, guides)
- [ ] Actions for starting/updating/ending interactions

#### Template Store

- [ ] Create `template-store.ts`
- [ ] Current template metadata
- [ ] Save state (dirty flag)
- [ ] Auto-save timer

#### Deliverables

- ✅ Complete state management
- ✅ Undo/redo working
- ✅ State persistence ready

---

### **Phase 3: Component Palette & Tree (Week 2, Days 1-3)**

#### Goals

- Build draggable component palette
- Implement hierarchical tree view
- Create component search/filter

#### Tasks

#### Component Palette

- [ ] Create `ComponentPalette.tsx`
- [ ] Implement category collapsible sections
- [ ] Build draggable component cards with @dnd-kit
- [ ] Add component icons
- [ ] Implement search functionality
- [ ] Add component tooltips with descriptions

#### Component Tree

- [ ] Create `ComponentTree.tsx`
- [ ] Implement recursive tree rendering
- [ ] Add expand/collapse functionality
- [ ] Show component type and name
- [ ] Add drag to reorder in tree
- [ ] Implement right-click context menu
  - Delete component
  - Duplicate component
  - Copy/paste

#### Deliverables

- ✅ Functional component palette
- ✅ Interactive component tree
- ✅ Basic drag and drop working

---

### **Phase 4: Canvas Core & Resize System (Week 2, Days 4-7)**

#### Goals

- Build main canvas area
- Implement drop zones for containers
- Visual component rendering
- **Implement visual resize handles**
- **Two-way property binding**

#### Tasks

#### Canvas Container

- [ ] Create `Canvas.tsx` main component
- [ ] Implement zoom controls (25%, 50%, 100%, 150%, 200%)
- [ ] Add pan functionality
- [ ] Create grid background
- [ ] Implement ruler guides (optional)

#### Drop Zone System

- [ ] Create drop zone detection for containers
- [ ] Visual drop indicators (highlight on hover)
- [ ] Handle component insertion at specific positions
- [ ] Validate drop targets (e.g., can't drop container in Text)

#### Component Renderers

- [ ] Create base `ComponentRenderer.tsx`
- [ ] Implement visual renderers for Tier 1 components:
  - [ ] ColumnRenderer - Show vertical stacking
  - [ ] RowRenderer - Show horizontal layout
  - [ ] TableRenderer - Show grid structure
  - [ ] TextRenderer - Show text with expressions
  - [ ] ImageRenderer - Show placeholder or actual image
  - [ ] PaddingRenderer - Visual padding indicators
  - [ ] BorderRenderer - Visual borders
  - [ ] BackgroundRenderer - Background color

#### Selection Visual

- [ ] Create `SelectionBox.tsx`
- [ ] Highlight selected component
- [ ] Show component bounds
- [ ] Multi-select visual feedback

#### **Visual Resize System (NEW - Critical)**

- [ ] Create `ResizeHandles.tsx` component
  - [ ] 8 drag points (4 corners + 4 edges)
  - [ ] Cursor changes based on handle (↔ ↕ ↗ ↖ ↘ ↙)
  - [ ] Handle visibility based on component type
- [ ] Create `CornerHandle.tsx` - Resize both dimensions
- [ ] Create `EdgeHandle.tsx` - Resize one dimension
- [ ] Create `DimensionTooltip.tsx` - Show size during resize
- [ ] Implement `useResize` hook
  - [ ] Mouse down/move/up event handlers
  - [ ] Calculate new size from mouse position
  - [ ] Enforce min/max constraints from component metadata
  - [ ] Aspect ratio locking with Shift key
  - [ ] Snap to grid with Ctrl/Cmd key
  - [ ] Update canvas store during resize
- [ ] Implement real-time visual feedback
  - [ ] Ghost outline during resize
  - [ ] Dimension tooltip (e.g., "250 × 100px")
  - [ ] Red handles when at constraint limit
- [ ] Two-way binding
  - [ ] Handle drag → updates store → updates properties panel
  - [ ] Properties panel input → updates store → updates handles
  - [ ] No race conditions, single source of truth

#### **Resize Constraints**

- [ ] Respect component min/max width/height
- [ ] Prevent negative sizes
- [ ] Container-aware constraints (can't be smaller than children)
- [ ] Flow layout constraints enforcement
  - [ ] Column children: width resizable, height auto
  - [ ] Row children: height resizable, width auto
  - [ ] Text: width resizable (wraps), height auto
  - [ ] Image: both resizable with aspect ratio option

#### **Interaction Store (NEW)**

- [ ] Create `interaction-store.ts`
- [ ] Track resize state:
  ```typescript
  {
    resizing: {
      componentId: string | null;
      handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;
      startSize: { width: number; height: number };
      currentSize: { width: number; height: number };
      startPosition: { x: number; y: number };
    } | null;
  }
  ```
- [ ] Actions: `startResize`, `updateResize`, `endResize`

#### Deliverables

- ✅ Working canvas with zoom/pan
- ✅ Drag from palette → drop on canvas
- ✅ Visual component rendering
- ✅ Component selection working
- ✅ **Fully functional resize handles**
- ✅ **Two-way property synchronization**
- ✅ **Constraint enforcement**

---

### **Phase 5: Properties Panel & Header/Footer System (Week 3, Days 1-4)**

#### Goals

- Build dynamic properties panel
- Create property input fields
- Integrate Monaco editor for expressions
- **Implement header/footer editing mode**
- **Add page context variables**

#### Tasks

#### Properties Panel Structure

- [ ] Create `PropertiesPanel.tsx`
- [ ] Implement collapsible property sections
- [ ] Show/hide based on component type
- [ ] Display component type and name

#### Property Input Fields

- [ ] Create `TextField.tsx` - Text input with expression support
- [ ] Create `NumberField.tsx` - Number input with units
- [ ] Create `ColorPicker.tsx` - Color selection
- [ ] Create `FontPicker.tsx` - Font family dropdown
- [ ] Create `AlignmentPicker.tsx` - Visual alignment picker
- [ ] Create `ImageUploader.tsx` - Image upload/URL input
- [ ] Create toggle switches, dropdowns, sliders

#### Monaco Expression Editor

- [ ] Create `MonacoExpressionEditor.tsx`
- [ ] Configure Monaco for expression syntax
- [ ] Implement `{{ }}` syntax highlighting
- [ ] Add autocomplete for data fields
- [ ] **Add autocomplete for page variables (`{{ currentPage }}`, `{{ totalPages }}`)**
- [ ] Implement expression validation
- [ ] Show inline errors

#### Property Groups by Component Type

- [ ] `ContentProperties.tsx` - Text content, image source, etc.
- [ ] `StylingProperties.tsx` - Padding, border, background, etc.
- [ ] `SizingProperties.tsx` - Width, height, alignment, etc.
- [ ] `LayoutProperties.tsx` - Spacing for containers

#### **Header/Footer Editing System (NEW)**

##### Canvas Mode Selector

- [ ] Create `CanvasModeSelector.tsx`
  - [ ] Three tabs: "Main Content" | "Header" | "Footer"
  - [ ] Visual indicator of current mode
  - [ ] Mode switching updates canvas store
- [ ] Create `ModeTab.tsx` - Individual clickable tab
- [ ] Create `ModeIndicator.tsx` - Banner showing "Editing: Header" with icon

##### Header/Footer Editors

- [ ] Create `HeaderEditor.tsx`
  - [ ] Separate canvas area for header components
  - [ ] Shows header layout tree
  - [ ] Height constraint (e.g., max 150px)
  - [ ] Visual "Repeats on every page" indicator
- [ ] Create `FooterEditor.tsx`
  - [ ] Separate canvas area for footer components
  - [ ] Shows footer layout tree
  - [ ] Height constraint (e.g., max 100px)
  - [ ] Page number helper UI
- [ ] Create `PagePreview.tsx`
  - [ ] Mini preview showing header + content + footer together
  - [ ] Visual page boundaries
  - [ ] Page number simulation

##### Page Context Variables

- [ ] Create `PageVariables.tsx` panel
  - [ ] List of available page variables:
    - `{{ currentPage }}` - Current page number
    - `{{ totalPages }}` - Total page count
    - `{{ section.name }}` - Current section name
    - `{{ template.title }}` - Document title
    - `{{ template.createdDate }}` - Template creation date
  - [ ] Copy-to-clipboard for each variable
  - [ ] Documentation tooltip for each
- [ ] Create `PageExpressionHelper.tsx`
  - [ ] Smart autocomplete in Monaco for page variables
  - [ ] Context-aware suggestions (only show page vars in header/footer)
  - [ ] Preview of evaluated expressions

##### Store Updates

- [ ] Update `canvas-store.ts`:

  ```typescript
  interface CanvasState {
    // Separate trees
    header: LayoutNode | null;
    content: LayoutNode | null; // renamed from 'root'
    footer: LayoutNode | null;

    // Current editing mode
    editingMode: "content" | "header" | "footer";

    // Page settings
    pageSettings: {
      size: "A4" | "Letter" | "Legal";
      orientation: "portrait" | "landscape";
      margins: { top: number; right: number; bottom: number; left: number };
      headerHeight?: number;
      footerHeight?: number;
    };

    // Actions
    setEditingMode: (mode: "content" | "header" | "footer") => void;
    updateHeader: (header: LayoutNode) => void;
    updateFooter: (footer: LayoutNode) => void;
    getActiveTree: () => LayoutNode | null; // Returns tree based on mode
  }
  ```

##### Component Palette Updates

- [ ] Filter components based on mode
  - Header/Footer: Only allow Text, Image, Row, Column (no tables, complex layouts)
  - Show warning if user tries to add incompatible component
- [ ] Show "Best for headers/footers" badge on recommended components

##### Export Updates

- [ ] Update `exportToJson()` to include all three trees:
  ```json
  {
    "pageSettings": { ... },
    "header": { ... },
    "content": { ... },
    "footer": { ... }
  }
  ```

#### Deliverables

- ✅ Fully functional properties panel
- ✅ All property input types working
- ✅ Monaco editor integrated with page variables
- ✅ Live property updates to canvas
- ✅ **Header/footer editing modes working**
- ✅ **Page context variables available**
- ✅ **Visual indication of repeating headers/footers**

---

### **Phase 6: Backend Integration (Week 3, Days 5-7)**

#### Goals

- Connect to backend API
- Implement PDF generation
- Template CRUD operations

#### Tasks

#### API Client Setup

- [ ] Configure Axios instance with base URL
- [ ] Add request/response interceptors
- [ ] Error handling wrapper
- [ ] TypeScript types from backend OpenAPI

#### React Query Setup

- [ ] Configure QueryClient
- [ ] Create query hooks for templates
- [ ] Create mutation hooks for CRUD
- [ ] Implement optimistic updates

#### PDF Generation

- [ ] Create `usePdfGeneration` hook
- [ ] Build JSON payload from canvas state
- [ ] POST to `/api/pdf/generate`
- [ ] Handle loading/error states
- [ ] Download generated PDF

#### Template Management

- [ ] Implement `GET /api/templates` - List templates
- [ ] Implement `GET /api/templates/{id}` - Load template
- [ ] Implement `POST /api/templates` - Create template
- [ ] Implement `PUT /api/templates/{id}` - Update template
- [ ] Implement `DELETE /api/templates/{id}` - Delete template
- [ ] Auto-save functionality (debounced)

#### Validation Integration

- [ ] Implement pre-validation before PDF generation
- [ ] POST to `/api/validation/validate`
- [ ] Show validation errors in UI
- [ ] Highlight problematic components in tree

#### Deliverables

- ✅ API integration working
- ✅ PDF generation functional
- ✅ Template CRUD complete
- ✅ Validation integrated

---

### **Phase 7: PDF Preview Panel (Week 4, Days 1-2)**

#### Goals

- Real-time PDF preview
- Preview panel UI
- Page navigation

#### Tasks

- [ ] Create `PreviewPanel.tsx`
- [ ] Integrate react-pdf or PDF.js
- [ ] Implement preview refresh on changes (debounced)
- [ ] Add page navigation (prev/next, page number)
- [ ] Zoom controls for preview
- [ ] Loading states during generation
- [ ] Error handling for failed previews

#### Deliverables

- ✅ Working PDF preview
- ✅ Real-time updates on changes
- ✅ Page navigation

---

### **Phase 8: Advanced Canvas Features (Week 4, Days 3-5)**

#### Goals

- Copy/paste functionality
- Keyboard shortcuts
- Component duplication
- Multi-select
- **Advanced resize features**
- **Interactive adjusters**
- **Transform controls**

#### Tasks

#### Keyboard Shortcuts

- [ ] Implement copy (Ctrl+C)
- [ ] Implement paste (Ctrl+V)
- [ ] Implement delete (Delete/Backspace)
- [ ] Implement duplicate (Ctrl+D)
- [ ] Implement select all (Ctrl+A)
- [ ] Implement save (Ctrl+S)

#### Multi-Selection

- [ ] Allow Ctrl+Click for multi-select
- [ ] Shift+Click for range select
- [ ] Bulk delete
- [ ] Bulk property updates (future)

#### Component Operations

- [ ] Copy/paste components
- [ ] Duplicate component with children
- [ ] Move components between containers
- [ ] Reorder components in containers

#### **Advanced Resize Features (NEW)**

- [ ] Create `AlignmentGuides.tsx`
  - [ ] Snap-to-edge detection (show red lines when aligned)
  - [ ] Smart spacing detection (show when spacing matches)
  - [ ] Center alignment guides (horizontal/vertical)
  - [ ] Distance indicators between components
- [ ] Create `SnapGrid.tsx`
  - [ ] Visual grid overlay (10px or 5px)
  - [ ] Snap-to-grid while resizing
  - [ ] Toggle on/off from canvas toolbar
- [ ] Create `RulerGuides.tsx` (optional)
  - [ ] Horizontal/vertical rulers
  - [ ] Show dimensions in px, cm, or inches
  - [ ] Draggable guide lines
- [ ] Implement `useAlignment` hook
  - [ ] Calculate alignment with nearby components
  - [ ] Detect equal spacing
  - [ ] Suggest alignment when within 5px threshold
- [ ] Multi-component proportional resize
  - [ ] Select multiple components
  - [ ] Resize all proportionally
  - [ ] Maintain relative spacing

#### **Transform Controls (NEW)**

- [ ] Create `RotationHandle.tsx`
  - [ ] Appears above component (only for Rotate wrapper)
  - [ ] Drag in circular motion to rotate
  - [ ] Show angle tooltip (e.g., "45°")
  - [ ] Snap to 15° increments (configurable)
  - [ ] Shift+drag for continuous rotation
- [ ] Implement `useTransform` hook
  - [ ] Handle rotation calculations
  - [ ] Handle scale transformations
  - [ ] Handle translation (position offset)
  - [ ] Update transform properties in store
- [ ] Scale handles (for Scale wrapper)
  - [ ] Same as resize handles
  - [ ] Show scale percentage (e.g., "150%")
  - [ ] Maintain aspect ratio by default
- [ ] Translation drag (for Translate wrapper)
  - [ ] Entire component becomes draggable
  - [ ] Show offset tooltip (e.g., "X: +10, Y: -5")
  - [ ] Snap to grid if enabled

#### **Interactive Adjusters (NEW)**

- [ ] Create `PaddingAdjuster.tsx`
  - [ ] Visual padding indicator lines
  - [ ] Drag lines to adjust padding
  - [ ] Shows padding value during drag
  - [ ] Per-side adjustment (top/right/bottom/left)
  - [ ] Uniform padding mode toggle
- [ ] Create `SpacingAdjuster.tsx`
  - [ ] Appears between children in Column/Row
  - [ ] Drag gap handle to adjust spacing
  - [ ] Snaps to 5px increments
  - [ ] Shows spacing value tooltip
- [ ] Create `TableColumnResizer.tsx`
  - [ ] Vertical dividers between columns
  - [ ] Drag to adjust column width
  - [ ] Updates all rows simultaneously
  - [ ] Shows column width tooltip
  - [ ] Double-click to auto-size column

#### **Resize Modes**

- [ ] Implement keyboard modifiers:
  - [ ] Shift: Lock aspect ratio
  - [ ] Ctrl/Cmd: Snap to grid (10px)
  - [ ] Alt: Ignore constraints (preview only)
- [ ] Visual indicators for active mode
- [ ] Mode tooltip in toolbar

#### Deliverables

- ✅ Full keyboard shortcuts
- ✅ Copy/paste working
- ✅ Multi-select functional
- ✅ **Alignment guides working**
- ✅ **Transform controls functional**
- ✅ **Interactive adjusters complete**
- ✅ **Professional resize experience**

---

### **Phase 9: Template Management UI (Week 4, Days 6-7)**

#### Goals

- Templates list page
- Template search/filter
- Template actions

#### Tasks

- [ ] Create templates list page (`/templates`)
- [ ] Implement template cards with preview
- [ ] Add search functionality
- [ ] Add filter by category/tags
- [ ] Implement template actions:
  - [ ] Duplicate template
  - [ ] Delete template (with confirmation)
  - [ ] Export template as JSON
  - [ ] Import template from JSON
- [ ] Create new template flow

#### Deliverables

- ✅ Template management UI
- ✅ Search and filter working
- ✅ All CRUD operations accessible

---

### **Phase 10: Data Context & Test Data (Week 5, Days 1-2)**

#### Goals

- Test data panel for expressions
- Sample data sets
- Data context preview

#### Tasks

- [ ] Create test data editor panel
- [ ] Allow JSON input for test data
- [ ] Provide sample data templates:
  - Insurance contract data
  - Invoice data
  - Report data
- [ ] Show resolved expression values in properties panel
- [ ] Preview with test data
- [ ] Save test data with template

#### Deliverables

- ✅ Test data editor
- ✅ Sample data sets
- ✅ Expression preview with data

---

### **Phase 11: Tier 2 & 3 Components (Week 5, Days 3-5)**

#### Goals

- Implement remaining component renderers
- Advanced property panels
- Special component handling

#### Tasks

#### Tier 2 Component Renderers

- [ ] LineRenderer
- [ ] HyperlinkRenderer
- [ ] LayersRenderer (with layer visualization)
- [ ] DecorationRenderer (header/footer indicators)
- [ ] RoundedCornersRenderer
- [ ] AlignmentRenderers (visual alignment guides)

#### Tier 3 Component Renderers

- [ ] ListRenderer (nested list structure)
- [ ] QRCodeRenderer (QR preview)
- [ ] BarcodeRenderer (barcode preview)
- [ ] RotateRenderer (rotation visual)
- [ ] ScaleRenderer (scale indicator)
- [ ] TranslateRenderer (offset visual)

#### Advanced Properties

- [ ] Table cell editor modal
- [ ] Table column width adjusters
- [ ] Layers panel for z-index management
- [ ] List item editor

#### Deliverables

- ✅ All major component renderers
- ✅ Advanced property editors
- ✅ Complex components functional

---

### **Phase 12: Polish & UX Improvements (Week 5, Days 6-7)**

#### Goals

- Improve user experience
- Add helpful features
- Accessibility

#### Tasks

#### UX Improvements

- [ ] Add onboarding tour for first-time users
- [ ] Implement empty states with helpful hints
- [ ] Add component quick-add shortcuts
- [ ] Implement smart defaults for components
- [ ] Add undo/redo history panel
- [ ] Show unsaved changes indicator

#### Accessibility

- [ ] Keyboard navigation throughout app
- [ ] ARIA labels for all interactive elements
- [ ] Focus management
- [ ] Screen reader announcements

#### Error Handling

- [ ] Global error boundary
- [ ] Friendly error messages
- [ ] Recovery suggestions
- [ ] Error reporting (optional)

#### Deliverables

- ✅ Polished UX
- ✅ Accessible UI
- ✅ Better error handling

---

### **Phase 13: Performance Optimization (Week 6, Days 1-2)**

#### Goals

- Optimize rendering performance
- Reduce bundle size
- Improve load times

#### Tasks

#### Performance

- [ ] Implement React.memo for renderers
- [ ] Virtualize component tree for large documents
- [ ] Debounce preview generation
- [ ] Lazy load Monaco editor
- [ ] Code splitting for routes
- [ ] Optimize re-renders in canvas

#### Bundle Optimization

- [ ] Analyze bundle size
- [ ] Tree-shake unused dependencies
- [ ] Use dynamic imports where appropriate
- [ ] Optimize images and assets

#### Caching

- [ ] Implement React Query caching strategies
- [ ] Cache generated PDFs
- [ ] Cache component metadata

#### Deliverables

- ✅ 50%+ performance improvement
- ✅ Reduced bundle size
- ✅ Fast load times

---

### **Phase 14: Testing & Documentation (Week 6, Days 3-5)**

#### Goals

- Comprehensive testing
- User documentation
- Developer documentation

#### Tasks

#### Testing

- [ ] Unit tests for utilities
- [ ] Component tests with Testing Library
- [ ] Integration tests for critical flows
- [ ] E2E tests with Playwright (optional)
- [ ] Visual regression tests (optional)

#### Documentation

- [ ] User guide with screenshots
- [ ] Video tutorials (optional)
- [ ] Component documentation
- [ ] Expression syntax guide
- [ ] Developer setup guide
- [ ] Deployment guide

#### Deliverables

- ✅ Test coverage >70%
- ✅ Complete documentation
- ✅ User guides ready

---

## Backend Integration

### **API Endpoints Required**

```typescript
// PDF Generation
POST /api/pdf/generate
Request: {
  layout: {
    pageSettings: {
      size: 'A4' | 'Letter' | 'Legal',
      orientation: 'portrait' | 'landscape',
      margins: { top, right, bottom, left },
      headerHeight?: number,
      footerHeight?: number
    },
    header: LayoutNodeDto | null,
    content: LayoutNodeDto,
    footer: LayoutNodeDto | null
  },
  data: Record<string, any>,
  settings?: PdfSettings
}
Response: {
  success: boolean,
  pdfUrl: string,
  fileSize: number,
  pageCount: number
}

// Validation
POST /api/validation/validate
Request: {
  layout: {
    header: LayoutNodeDto | null,
    content: LayoutNodeDto,
    footer: LayoutNodeDto | null
  }
}
Response: {
  isValid: boolean,
  errors: ValidationError[],
  warnings: ValidationWarning[]
}

// Templates
GET    /api/templates
POST   /api/templates
GET    /api/templates/{id}
PUT    /api/templates/{id}
DELETE /api/templates/{id}
POST   /api/templates/{id}/duplicate
```

### **Data Flow**

```
User Action (Canvas - any mode)
  ↓
Update Zustand Store (header/content/footer based on mode)
  ↓
Canvas Re-renders (showing active editing mode)
  ↓
User Clicks "Preview"
  ↓
Convert Store → JSON Layout (all three trees)
  ↓
POST to /api/pdf/generate
Body: {
  layout: {
    pageSettings: { size, orientation, margins },
    header: LayoutNode | null,
    content: LayoutNode,
    footer: LayoutNode | null
  },
  data: { ... }
}
  ↓
Backend Processes with QuestPDF
  - Decoration component wraps content with header/footer
  - Header renders on every page
  - Content flows with pagination
  - Footer renders on every page
  - Page numbers evaluated: {{ currentPage }}, {{ totalPages }}
  ↓
Return PDF URL
  ↓
Display in Preview Panel
```

---

## State Management Structure

### **Canvas Store Example**

```typescript
interface CanvasState {
  // Layout trees (three separate trees)
  header: LayoutNode | null;
  content: LayoutNode | null; // Main content (previously 'root')
  footer: LayoutNode | null;

  // Current editing mode
  editingMode: "content" | "header" | "footer";

  // Page settings
  pageSettings: {
    size: "A4" | "Letter" | "Legal";
    orientation: "portrait" | "landscape";
    margins: { top: number; right: number; bottom: number; left: number };
    headerHeight?: number; // Max header height
    footerHeight?: number; // Max footer height
  };

  // Actions for main content
  addComponent: (
    parentId: string,
    component: LayoutNode,
    index?: number
  ) => void;
  updateComponent: (id: string, updates: Partial<LayoutNode>) => void;
  deleteComponent: (id: string) => void;
  moveComponent: (id: string, newParentId: string, index: number) => void;

  // Actions for header/footer
  setEditingMode: (mode: "content" | "header" | "footer") => void;
  updateHeader: (header: LayoutNode | null) => void;
  updateFooter: (footer: LayoutNode | null) => void;
  clearHeader: () => void;
  clearFooter: () => void;

  // Utilities (context-aware based on editing mode)
  getActiveTree: () => LayoutNode | null; // Returns current editing tree
  getComponent: (id: string) => LayoutNode | null;
  getChildren: (parentId: string) => LayoutNode[];

  // State management
  clear: () => void;
  loadFromJson: (json: TemplateStructure) => void;
  exportToJson: () => TemplateStructure;
}

interface TemplateStructure {
  pageSettings: PageSettings;
  header: LayoutNode | null;
  content: LayoutNode | null;
  footer: LayoutNode | null;
}
```

### **Interaction Store (NEW)**

```typescript
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface InteractionState {
  // Resize state
  resizing: {
    componentId: string;
    handle: ResizeHandle;
    startSize: { width: number; height: number };
    currentSize: { width: number; height: number };
    startPosition: { x: number; y: number };
    constraints: {
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
    };
  } | null;

  // Rotation state
  rotating: {
    componentId: string;
    startAngle: number;
    currentAngle: number;
    centerPoint: { x: number; y: number };
  } | null;

  // Translation state
  translating: {
    componentId: string;
    startOffset: { x: number; y: number };
    currentOffset: { x: number; y: number };
  } | null;

  // Visual settings
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number; // 5 or 10 px
  showRulers: boolean;
  showAlignmentGuides: boolean;

  // Actions
  startResize: (
    componentId: string,
    handle: ResizeHandle,
    constraints: any
  ) => void;
  updateResize: (width: number, height: number) => void;
  endResize: () => void;

  startRotation: (
    componentId: string,
    centerPoint: { x: number; y: number }
  ) => void;
  updateRotation: (angle: number) => void;
  endRotation: () => void;

  startTranslation: (componentId: string) => void;
  updateTranslation: (x: number, y: number) => void;
  endTranslation: () => void;

  // Settings
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  toggleRulers: () => void;
  toggleAlignmentGuides: () => void;
}
```

### **Hook Examples**

```typescript
// useResize.ts
interface UseResizeOptions {
  componentId: string;
  initialWidth: number;
  initialHeight: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
}

export const useResize = (options: UseResizeOptions) => {
  const { startResize, updateResize, endResize } = useInteractionStore();
  const { updateComponent } = useCanvasStore();

  const handleMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    startResize(options.componentId, handle, {
      minWidth: options.minWidth,
      maxWidth: options.maxWidth,
      minHeight: options.minHeight,
      maxHeight: options.maxHeight,
    });

    // Add global mouse move/up listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    // Calculate new size based on mouse position and handle
    const newSize = calculateNewSize(e, handle, options);

    // Enforce constraints
    const constrainedSize = enforceConstraints(newSize, options);

    // Update interaction store (for visual feedback)
    updateResize(constrainedSize.width, constrainedSize.height);
  };

  const handleMouseUp = () => {
    // Get final size from interaction store
    const finalSize = useInteractionStore.getState().resizing?.currentSize;

    if (finalSize) {
      // Update canvas store (commits the change)
      updateComponent(options.componentId, {
        properties: {
          width: finalSize.width,
          height: finalSize.height,
        },
      });
    }

    // Clean up
    endResize();
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return { handleMouseDown };
};

// useTransform.ts
export const useTransform = (componentId: string) => {
  const { startRotation, updateRotation, endRotation } = useInteractionStore();
  const { updateComponent } = useCanvasStore();

  const handleRotate = (angle: number) => {
    updateComponent(componentId, {
      properties: { rotation: angle },
    });
  };

  const handleScale = (scale: number) => {
    updateComponent(componentId, {
      properties: { scale },
    });
  };

  const handleTranslate = (x: number, y: number) => {
    updateComponent(componentId, {
      properties: { offsetX: x, offsetY: y },
    });
  };

  return { handleRotate, handleScale, handleTranslate };
};

// useAlignment.ts
export const useAlignment = () => {
  const { root } = useCanvasStore();
  const { resizing } = useInteractionStore();

  const calculateAlignmentGuides = (
    componentId: string,
    currentBounds: { x: number; y: number; width: number; height: number }
  ) => {
    // Find all sibling components
    const siblings = getSiblings(componentId, root);

    const guides: AlignmentGuide[] = [];

    siblings.forEach((sibling) => {
      const siblingBounds = getComponentBounds(sibling);

      // Check for horizontal alignment
      if (Math.abs(currentBounds.x - siblingBounds.x) < 5) {
        guides.push({
          type: "vertical",
          position: siblingBounds.x,
          color: "red",
        });
      }

      // Check for vertical alignment
      if (Math.abs(currentBounds.y - siblingBounds.y) < 5) {
        guides.push({
          type: "horizontal",
          position: siblingBounds.y,
          color: "red",
        });
      }

      // Check for equal spacing
      const spacing = currentBounds.x - (siblingBounds.x + siblingBounds.width);
      if (isEqualSpacing(spacing, siblings)) {
        guides.push({ type: "spacing", value: spacing, color: "blue" });
      }
    });

    return guides;
  };

  return { calculateAlignmentGuides };
};
```

---

## Key Technical Decisions

### **Why Next.js 16?**

- Server Components for improved performance
- Built-in API routes (if needed)
- Best-in-class React framework
- Excellent TypeScript support

### **Why Zustand over Redux?**

- Simpler API
- Less boilerplate
- Better TypeScript support
- Smaller bundle size
- Sufficient for this use case

### **Why @dnd-kit?**

- Modern, hooks-based API
- Excellent TypeScript support
- Better performance than react-dnd
- Active maintenance
- Accessibility built-in

### **Why shadcn/ui?**

- Copy-paste components (no dependency bloat)
- Built on Radix UI (accessible)
- Fully customizable
- Excellent with Tailwind
- TypeScript first

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5273
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_IMAGE_FORMATS=png,jpg,jpeg,webp,svg
```

---

## Summary Timeline

| Phase                         | Duration | Key Deliverable                       |
| ----------------------------- | -------- | ------------------------------------- |
| Phase 0: Setup                | 2 days   | Project scaffolded                    |
| Phase 1: Metadata             | 2 days   | Component registry                    |
| Phase 2: State                | 3 days   | State management + interaction store  |
| Phase 3: Palette/Tree         | 3 days   | Component palette + tree              |
| Phase 4: Canvas + Resize      | 4 days   | Working canvas + resize handles       |
| Phase 5: Properties           | 4 days   | Properties panel + Monaco             |
| Phase 6: Backend              | 3 days   | API integration                       |
| Phase 7: Preview              | 2 days   | PDF preview                           |
| Phase 8: Advanced + Adjusters | 3 days   | Alignment guides + transform controls |
| Phase 9: Templates            | 2 days   | Template UI                           |
| Phase 10: Data                | 2 days   | Test data editor                      |
| Phase 11: Components          | 3 days   | All 54 components                     |
| Phase 12: Polish              | 2 days   | UX polish                             |
| Phase 13: Performance         | 2 days   | Optimization                          |
| Phase 14: Testing             | 3 days   | Tests & docs                          |

**Total: ~6 weeks**

**Note:** Resize system is integrated into Phases 4 and 8, not a separate phase. This ensures resize works from the start of canvas development.

---

## Critical Success Factors

1. **Start with solid state management** - Everything builds on this, especially resize interactions
2. **Implement resize system early (Phase 4)** - Critical for UX, must work from the start
3. **Iterate on UX continuously** - This is a visual tool, resize feel must be perfect
4. **Test with real users early** - Non-technical users are the target, ensure resize is intuitive
5. **Performance matters** - Canvas + resize handles should feel responsive (60fps)
6. **Two-way binding is crucial** - Properties panel ↔ canvas must stay in perfect sync
7. **Respect flow constraints** - Don't let users create invalid layouts via resize

---

## Risk Mitigation

- **Canvas complexity** - Start simple, add features incrementally
- **Resize performance** - Use requestAnimationFrame, debounce updates, memoize aggressively
- **UX for non-technical users** - User testing, clear visual feedback, helpful constraints
- **Expression editor usability** - Good autocomplete, clear errors
- **Backend integration issues** - Mock API initially, test thoroughly
- **Flow layout constraints** - Clear visual indicators when resize would violate constraints
- **Browser compatibility** - Test resize handles across browsers (Chrome, Firefox, Safari, Edge)

---

**This is your complete frontend development blueprint. Sync with backend team on API contracts!**

---

## Document Updates

**Latest Update:** Added comprehensive Visual Resize & Adjustment System

**What Changed:**

1. ✅ Added complete resize handle system to project structure
2. ✅ Added `interaction-store.ts` for resize/transform state
3. ✅ Added `useResize`, `useTransform`, `useAlignment` hooks
4. ✅ Added comprehensive "Visual Resize & Adjustment System" section
5. ✅ Updated Phase 2 to include interaction store creation
6. ✅ Updated Phase 4 to include full resize implementation
7. ✅ Updated Phase 8 to include advanced resize features
8. ✅ Added code examples for resize hooks and state management
9. ✅ Clarified backend is already ready (no backend changes needed)
10. ✅ Updated timeline and critical success factors

**Key Takeaway:** Resize system is now properly integrated into the development phases, not treated as an afterthought. Backend requires no changes - it simply receives the final numeric values.

---

## Header/Footer System Update

**Latest Addition:** Comprehensive header/footer editing functionality

**What Changed:**

1. ✅ Added canvas mode selector (Content/Header/Footer tabs)
2. ✅ Separate editing contexts for header, content, and footer
3. ✅ Page context variables (`{{ currentPage }}`, `{{ totalPages }}`, etc.)
4. ✅ Visual indicators for repeating header/footer behavior
5. ✅ Updated canvas store to manage three separate layout trees
6. ✅ Updated API contract to send header/content/footer separately
7. ✅ Monaco autocomplete for page-specific variables
8. ✅ Component palette filtering based on editing mode
9. ✅ Full page preview showing header + content + footer together
10. ✅ Integrated into Phase 5 (Properties Panel & Header/Footer System)

**Why This Matters:**

- Insurance contracts NEED headers (company logo, document title) and footers (page numbers, legal disclaimers)
- Headers/footers repeat on every page - users need to understand this behavior
- Page numbers require special variables that only make sense in header/footer context
- Professional documents require this feature from day one

**Backend Coordination Required:**

- Backend must accept three separate trees: header, content, footer
- Backend must provide page context in RenderContext (currentPage, totalPages)
- Backend LayoutEngine must use QuestPDF Page.Header/Content/Footer slots
- See updated API contract in Backend Integration section
