namespace PDFBuilder.Core.Domain;

/// <summary>
/// Enumeration of all supported PDF component types.
/// Components are organized by category for clarity.
/// </summary>
public enum ComponentType
{
    // ========================================
    // Container/Layout Components (7)
    // ========================================

    /// <summary>
    /// Vertical stacking container with optional spacing.
    /// QuestPDF: container.Column(col => ...)
    /// </summary>
    Column = 100,

    /// <summary>
    /// Horizontal arrangement container with optional spacing.
    /// QuestPDF: container.Row(row => ...)
    /// </summary>
    Row = 101,

    /// <summary>
    /// Grid layout with rows, columns, and cell spanning.
    /// QuestPDF: container.Table(table => ...)
    /// </summary>
    Table = 102,

    /// <summary>
    /// Stacking planes for layered content (background, primary, foreground).
    /// QuestPDF: container.Layers(layers => ...)
    /// </summary>
    Layers = 103,

    /// <summary>
    /// Repeating header/footer with main content area.
    /// QuestPDF: container.Decoration(dec => ...)
    /// </summary>
    Decoration = 104,

    /// <summary>
    /// Inline flow layout for text-like wrapping.
    /// QuestPDF: container.Inlined(inline => ...)
    /// </summary>
    Inlined = 105,

    /// <summary>
    /// Newspaper-style multi-column layout.
    /// QuestPDF: Custom implementation using Column
    /// </summary>
    MultiColumn = 106,

    // ========================================
    // Content Components (8)
    // ========================================

    /// <summary>
    /// Rich text with styling support.
    /// QuestPDF: container.Text("...")
    /// </summary>
    Text = 200,

    /// <summary>
    /// Raster and SVG images.
    /// QuestPDF: container.Image(bytes/path)
    /// </summary>
    Image = 201,

    /// <summary>
    /// Horizontal or vertical divider lines.
    /// QuestPDF: container.LineHorizontal(1) / LineVertical(1)
    /// </summary>
    Line = 202,

    /// <summary>
    /// Gray placeholder box for prototyping.
    /// QuestPDF: container.Placeholder()
    /// </summary>
    Placeholder = 203,

    /// <summary>
    /// Clickable hyperlink URLs.
    /// QuestPDF: container.Hyperlink("url", c => ...)
    /// </summary>
    Hyperlink = 204,

    /// <summary>
    /// Ordered and unordered lists.
    /// QuestPDF: Custom implementation
    /// </summary>
    List = 205,

    /// <summary>
    /// Custom vector graphics using canvas.
    /// QuestPDF: container.Canvas(...)
    /// </summary>
    Canvas = 206,

    /// <summary>
    /// Barcode rendering (1D and 2D barcodes).
    /// QuestPDF: Integration with ZXing.Net
    /// Supports: Code128, EAN-8, EAN-13, UPC-A, Code39, DataMatrix, PDF417, etc.
    /// </summary>
    Barcode = 207,

    /// <summary>
    /// QR code rendering.
    /// QuestPDF: Integration with QRCoder
    /// Optimized for QR code generation with customizable error correction.
    /// </summary>
    QRCode = 208,

    // ========================================
    // Styling Components (6)
    // ========================================

    /// <summary>
    /// Padding/spacing around content.
    /// QuestPDF: container.Padding(10)
    /// </summary>
    Padding = 300,

    /// <summary>
    /// Border with thickness and color.
    /// QuestPDF: container.Border(1)
    /// </summary>
    Border = 301,

    /// <summary>
    /// Background color fill.
    /// QuestPDF: container.Background(color)
    /// </summary>
    Background = 302,

    /// <summary>
    /// Rounded corner borders.
    /// QuestPDF: Custom implementation
    /// </summary>
    RoundedCorners = 303,

    /// <summary>
    /// Drop shadow effect.
    /// QuestPDF: Custom implementation
    /// </summary>
    Shadow = 304,

    /// <summary>
    /// Text style inheritance for child elements.
    /// QuestPDF: container.DefaultTextStyle(x => ...)
    /// </summary>
    DefaultTextStyle = 305,

    // ========================================
    // Sizing Components (12)
    // ========================================

    /// <summary>
    /// Fixed or constrained width.
    /// QuestPDF: container.Width(100)
    /// </summary>
    Width = 400,

    /// <summary>
    /// Fixed or constrained height.
    /// QuestPDF: container.Height(50)
    /// </summary>
    Height = 401,

    /// <summary>
    /// Minimum width constraint.
    /// QuestPDF: container.MinWidth(100)
    /// </summary>
    MinWidth = 402,

    /// <summary>
    /// Maximum width constraint.
    /// QuestPDF: container.MaxWidth(200)
    /// </summary>
    MaxWidth = 403,

    /// <summary>
    /// Minimum height constraint.
    /// QuestPDF: container.MinHeight(50)
    /// </summary>
    MinHeight = 404,

    /// <summary>
    /// Maximum height constraint.
    /// QuestPDF: container.MaxHeight(100)
    /// </summary>
    MaxHeight = 405,

    /// <summary>
    /// Horizontal alignment (left, center, right).
    /// QuestPDF: container.AlignLeft() / AlignCenter() / AlignRight()
    /// </summary>
    Alignment = 406,

    /// <summary>
    /// Maintain aspect ratio of content.
    /// QuestPDF: container.AspectRatio(16/9f)
    /// </summary>
    AspectRatio = 407,

    /// <summary>
    /// Extend to fill available space.
    /// QuestPDF: container.Extend()
    /// </summary>
    Extend = 408,

    /// <summary>
    /// Shrink to minimum required size.
    /// QuestPDF: container.Shrink()
    /// </summary>
    Shrink = 409,

    /// <summary>
    /// Remove size constraints from parent.
    /// QuestPDF: container.Unconstrained()
    /// </summary>
    Unconstrained = 410,

    /// <summary>
    /// Constrain content within min/max bounds.
    /// QuestPDF: container.Constrained()
    /// </summary>
    Constrained = 411,

    // ========================================
    // Transformation Components (5)
    // ========================================

    /// <summary>
    /// Rotation transform.
    /// QuestPDF: container.Rotate(45)
    /// </summary>
    Rotate = 500,

    /// <summary>
    /// Scale transform (uniform or non-uniform).
    /// QuestPDF: container.Scale(1.5f)
    /// </summary>
    Scale = 501,

    /// <summary>
    /// Auto-scale content to fit available space.
    /// QuestPDF: container.ScaleToFit()
    /// </summary>
    ScaleToFit = 502,

    /// <summary>
    /// Position offset/translation.
    /// QuestPDF: container.Translate(10, 20)
    /// </summary>
    Translate = 503,

    /// <summary>
    /// Mirror/flip horizontally or vertically.
    /// QuestPDF: container.FlipHorizontal() / FlipVertical()
    /// </summary>
    Flip = 504,

    // ========================================
    // Flow Control Components (8)
    // ========================================

    /// <summary>
    /// Force a new page.
    /// QuestPDF: container.PageBreak()
    /// </summary>
    PageBreak = 600,

    /// <summary>
    /// Ensure minimum space or break to new page.
    /// QuestPDF: container.EnsureSpace(100)
    /// </summary>
    EnsureSpace = 601,

    /// <summary>
    /// Keep content together (prevent breaking).
    /// QuestPDF: container.ShowEntire()
    /// </summary>
    ShowEntire = 602,

    /// <summary>
    /// Prevent content from paginating.
    /// QuestPDF: container.StopPaging()
    /// </summary>
    StopPaging = 603,

    /// <summary>
    /// Named section for table of contents.
    /// QuestPDF: container.Section("name")
    /// </summary>
    Section = 604,

    /// <summary>
    /// Repeat content on every page.
    /// QuestPDF: Custom implementation
    /// </summary>
    Repeat = 605,

    /// <summary>
    /// Show content only on first page.
    /// QuestPDF: container.ShowOnce()
    /// </summary>
    ShowOnce = 606,

    /// <summary>
    /// Skip content on first page.
    /// QuestPDF: container.SkipOnce()
    /// </summary>
    SkipOnce = 607,

    // ========================================
    // Special/Debug Components (4)
    // ========================================

    /// <summary>
    /// Set content direction (LTR/RTL).
    /// QuestPDF: container.ContentFromRightToLeft()
    /// </summary>
    ContentDirection = 700,

    /// <summary>
    /// Z-index layer stacking order.
    /// QuestPDF: Custom implementation
    /// </summary>
    ZIndex = 701,

    /// <summary>
    /// Debug area with visual borders and label.
    /// QuestPDF: container.DebugArea("label")
    /// </summary>
    DebugArea = 702,

    /// <summary>
    /// Debug pointer for precise positioning.
    /// QuestPDF: container.DebugPointer()
    /// </summary>
    DebugPointer = 703,

    // ========================================
    // Conditional Components (2)
    // ========================================

    /// <summary>
    /// Conditionally show content based on expression.
    /// QuestPDF: Custom implementation with ShowIf
    /// </summary>
    ShowIf = 800,

    /// <summary>
    /// Prevent page break within content.
    /// QuestPDF: container.PreventPageBreak()
    /// </summary>
    PreventPageBreak = 801,
}

/// <summary>
/// Extension methods for ComponentType enumeration.
/// </summary>
public static class ComponentTypeExtensions
{
    /// <summary>
    /// Gets the category of the component type.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>The component category name.</returns>
    public static string GetCategory(this ComponentType componentType)
    {
        var value = (int)componentType;
        return value switch
        {
            >= 100 and < 200 => "Container",
            >= 200 and < 300 => "Content",
            >= 300 and < 400 => "Styling",
            >= 400 and < 500 => "Sizing",
            >= 500 and < 600 => "Transformation",
            >= 600 and < 700 => "FlowControl",
            >= 700 and < 800 => "Special",
            >= 800 and < 900 => "Conditional",
            _ => "Unknown",
        };
    }

    /// <summary>
    /// Determines if the component type is a container that can have children.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>True if the component can have children; otherwise, false.</returns>
    public static bool IsContainer(this ComponentType componentType)
    {
        return componentType switch
        {
            ComponentType.Column => true,
            ComponentType.Row => true,
            ComponentType.Table => true,
            ComponentType.Layers => true,
            ComponentType.Decoration => true,
            ComponentType.Inlined => true,
            ComponentType.MultiColumn => true,
            ComponentType.List => true,
            _ => false,
        };
    }

    /// <summary>
    /// Determines if the component type is a wrapper (has single child).
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>True if the component is a wrapper; otherwise, false.</returns>
    public static bool IsWrapper(this ComponentType componentType)
    {
        return componentType switch
        {
            ComponentType.Padding => true,
            ComponentType.Border => true,
            ComponentType.Background => true,
            ComponentType.RoundedCorners => true,
            ComponentType.Shadow => true,
            ComponentType.DefaultTextStyle => true,
            ComponentType.Width => true,
            ComponentType.Height => true,
            ComponentType.MinWidth => true,
            ComponentType.MaxWidth => true,
            ComponentType.MinHeight => true,
            ComponentType.MaxHeight => true,
            ComponentType.Alignment => true,
            ComponentType.AspectRatio => true,
            ComponentType.Extend => true,
            ComponentType.Shrink => true,
            ComponentType.Unconstrained => true,
            ComponentType.Constrained => true,
            ComponentType.Rotate => true,
            ComponentType.Scale => true,
            ComponentType.ScaleToFit => true,
            ComponentType.Translate => true,
            ComponentType.Flip => true,
            ComponentType.EnsureSpace => true,
            ComponentType.ShowEntire => true,
            ComponentType.StopPaging => true,
            ComponentType.Section => true,
            ComponentType.Repeat => true,
            ComponentType.ShowOnce => true,
            ComponentType.SkipOnce => true,
            ComponentType.ContentDirection => true,
            ComponentType.ZIndex => true,
            ComponentType.DebugArea => true,
            ComponentType.DebugPointer => true,
            ComponentType.ShowIf => true,
            ComponentType.PreventPageBreak => true,
            ComponentType.Hyperlink => true,
            _ => false,
        };
    }

    /// <summary>
    /// Determines if the component type is a leaf node (no children).
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>True if the component is a leaf; otherwise, false.</returns>
    public static bool IsLeaf(this ComponentType componentType)
    {
        return componentType switch
        {
            ComponentType.Text => true,
            ComponentType.Image => true,
            ComponentType.Line => true,
            ComponentType.Placeholder => true,
            ComponentType.Canvas => true,
            ComponentType.Barcode => true,
            ComponentType.PageBreak => true,
            _ => false,
        };
    }

    /// <summary>
    /// Gets the implementation priority tier for the component.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>The priority tier (1 = Essential, 2 = Common, 3 = Advanced, 4 = Specialized).</returns>
    public static int GetPriorityTier(this ComponentType componentType)
    {
        return componentType switch
        {
            // Tier 1 - Essential (MVP)
            ComponentType.Column => 1,
            ComponentType.Row => 1,
            ComponentType.Table => 1,
            ComponentType.Text => 1,
            ComponentType.Image => 1,
            ComponentType.Padding => 1,
            ComponentType.Background => 1,
            ComponentType.Border => 1,
            ComponentType.PageBreak => 1,

            // Tier 2 - Common
            ComponentType.Line => 2,
            ComponentType.Hyperlink => 2,
            ComponentType.Layers => 2,
            ComponentType.Decoration => 2,
            ComponentType.RoundedCorners => 2,
            ComponentType.Alignment => 2,
            ComponentType.Width => 2,
            ComponentType.Height => 2,
            ComponentType.DefaultTextStyle => 2,
            ComponentType.MinWidth => 2,
            ComponentType.MaxWidth => 2,
            ComponentType.MinHeight => 2,
            ComponentType.MaxHeight => 2,
            ComponentType.Placeholder => 2,

            // Tier 3 - Advanced
            ComponentType.Shadow => 3,
            ComponentType.Rotate => 3,
            ComponentType.Scale => 3,
            ComponentType.Translate => 3,
            ComponentType.EnsureSpace => 3,
            ComponentType.ShowEntire => 3,
            ComponentType.Section => 3,
            ComponentType.List => 3,
            ComponentType.AspectRatio => 3,
            ComponentType.Extend => 3,
            ComponentType.Shrink => 3,
            ComponentType.Barcode => 3,
            ComponentType.ShowIf => 3,
            ComponentType.PreventPageBreak => 3,

            // Tier 4 - Specialized
            ComponentType.MultiColumn => 4,
            ComponentType.Inlined => 4,
            ComponentType.Canvas => 4,
            ComponentType.Flip => 4,
            ComponentType.ScaleToFit => 4,
            ComponentType.StopPaging => 4,
            ComponentType.Repeat => 4,
            ComponentType.ShowOnce => 4,
            ComponentType.SkipOnce => 4,
            ComponentType.ContentDirection => 4,
            ComponentType.ZIndex => 4,
            ComponentType.DebugArea => 4,
            ComponentType.DebugPointer => 4,
            ComponentType.Unconstrained => 4,
            ComponentType.Constrained => 4,

            _ => 4,
        };
    }
}
