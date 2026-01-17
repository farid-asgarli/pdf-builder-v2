using FluentValidation;
using FluentValidation.Results;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Core.Domain;

namespace PDFBuilder.Validation.Validators;

/// <summary>
/// FluentValidation validator for LayoutNodeDto.
/// Validates component types, required properties, property types, and nested structure.
/// </summary>
public sealed class LayoutNodeValidator : AbstractValidator<LayoutNodeDto>
{
    /// <summary>
    /// Maximum depth allowed for nested layout trees.
    /// </summary>
    private const int MaxTreeDepth = 50;

    /// <summary>
    /// Maximum number of children allowed in a single container.
    /// </summary>
    private const int MaxChildrenCount = 500;

    /// <summary>
    /// All valid component type names (case-insensitive).
    /// </summary>
    private static readonly HashSet<string> ValidComponentTypes = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        // Container/Layout Components
        "Column",
        "Row",
        "Table",
        "Layers",
        "Decoration",
        "Inlined",
        "MultiColumn",
        // Content Components
        "Text",
        "Image",
        "Line",
        "Placeholder",
        "Hyperlink",
        "List",
        "Canvas",
        "Barcode",
        "QRCode",
        // Styling Components
        "Padding",
        "Border",
        "Background",
        "RoundedCorners",
        "Shadow",
        "DefaultTextStyle",
        // Sizing Components
        "Width",
        "Height",
        "MinWidth",
        "MaxWidth",
        "MinHeight",
        "MaxHeight",
        "Alignment",
        "AspectRatio",
        "Extend",
        "Shrink",
        "Unconstrained",
        "Constrained",
        // Transformation Components
        "Rotate",
        "Scale",
        "ScaleToFit",
        "Translate",
        "Flip",
        // Flow Control Components
        "PageBreak",
        "EnsureSpace",
        "ShowEntire",
        "StopPaging",
        "Section",
        "Repeat",
        "ShowOnce",
        "SkipOnce",
        // Special/Debug Components
        "ContentDirection",
        "ZIndex",
        "DebugArea",
        "DebugPointer",
        // Conditional Components
        "ShowIf",
        "PreventPageBreak",
    };

    /// <summary>
    /// Container component types that accept multiple children.
    /// </summary>
    private static readonly HashSet<string> ContainerComponentTypes = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Column",
        "Row",
        "Table",
        "Layers",
        "Decoration",
        "Inlined",
        "MultiColumn",
        "List",
    };

    /// <summary>
    /// Wrapper component types that accept a single child.
    /// </summary>
    private static readonly HashSet<string> WrapperComponentTypes = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Padding",
        "Border",
        "Background",
        "RoundedCorners",
        "Shadow",
        "DefaultTextStyle",
        "Width",
        "Height",
        "MinWidth",
        "MaxWidth",
        "MinHeight",
        "MaxHeight",
        "Alignment",
        "AspectRatio",
        "Extend",
        "Shrink",
        "Unconstrained",
        "Constrained",
        "Rotate",
        "Scale",
        "ScaleToFit",
        "Translate",
        "Flip",
        "EnsureSpace",
        "ShowEntire",
        "StopPaging",
        "Section",
        "Repeat",
        "ShowOnce",
        "SkipOnce",
        "ContentDirection",
        "ZIndex",
        "DebugArea",
        "DebugPointer",
        "ShowIf",
        "PreventPageBreak",
        "Hyperlink",
    };

    /// <summary>
    /// Leaf component types that have no children.
    /// </summary>
    private static readonly HashSet<string> LeafComponentTypes = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Text",
        "Image",
        "Line",
        "Placeholder",
        "Canvas",
        "Barcode",
        "QRCode",
        "PageBreak",
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="LayoutNodeValidator"/> class.
    /// </summary>
    public LayoutNodeValidator()
    {
        // Validate Type is required and exists
        RuleFor(x => x.Type)
            .NotEmpty()
            .WithMessage("Component type is required")
            .Must(BeValidComponentType)
            .WithMessage(x =>
                $"Unknown component type '{x.Type}'. Valid types: Column, Row, Table, Text, Image, etc."
            );

        // Validate Id format if provided
        RuleFor(x => x.Id)
            .MaximumLength(100)
            .WithMessage("Node ID cannot exceed 100 characters")
            .Matches(@"^[a-zA-Z0-9\-_]*$")
            .WithMessage("Node ID can only contain letters, numbers, hyphens, and underscores")
            .When(x => !string.IsNullOrEmpty(x.Id));

        // Validate Visible expression format
        RuleFor(x => x.Visible)
            .MaximumLength(500)
            .WithMessage("Visible expression cannot exceed 500 characters")
            .Must(BeValidExpressionOrBoolean)
            .WithMessage("Visible must be a boolean or expression (e.g., '{{ data.show }}')")
            .When(x => !string.IsNullOrEmpty(x.Visible));

        // Validate RepeatFor expression format
        RuleFor(x => x.RepeatFor)
            .MaximumLength(500)
            .WithMessage("RepeatFor expression cannot exceed 500 characters")
            .Must(BeValidExpression)
            .WithMessage("RepeatFor must be an expression (e.g., '{{ data.items }}')")
            .When(x => !string.IsNullOrEmpty(x.RepeatFor));

        // Validate RepeatAs format
        RuleFor(x => x.RepeatAs)
            .MaximumLength(50)
            .WithMessage("RepeatAs variable name cannot exceed 50 characters")
            .Matches(@"^[a-zA-Z_][a-zA-Z0-9_]*$")
            .WithMessage("RepeatAs must be a valid identifier")
            .When(x => !string.IsNullOrEmpty(x.RepeatAs));

        // Validate RepeatIndex format
        RuleFor(x => x.RepeatIndex)
            .MaximumLength(50)
            .WithMessage("RepeatIndex variable name cannot exceed 50 characters")
            .Matches(@"^[a-zA-Z_][a-zA-Z0-9_]*$")
            .WithMessage("RepeatIndex must be a valid identifier")
            .When(x => !string.IsNullOrEmpty(x.RepeatIndex));

        // Validate children count for containers
        RuleFor(x => x.Children)
            .Must(children => children == null || children.Count <= MaxChildrenCount)
            .WithMessage($"Maximum number of children is {MaxChildrenCount}")
            .When(x => x.Children != null);

        // Validate children structure based on component type
        RuleFor(x => x).Must(HaveValidChildStructure).WithMessage(GetChildStructureErrorMessage);

        // Recursively validate children
        RuleForEach(x => x.Children)
            .SetValidator(this!)
            .When(x => x.Children != null && x.Children.Count > 0);

        // Recursively validate single child
        RuleFor(x => x.Child).SetValidator(this!).When(x => x.Child != null);

        // Validate style properties
        RuleFor(x => x.Style)
            .SetValidator(new StylePropertiesValidator()!)
            .When(x => x.Style != null);
    }

    /// <summary>
    /// Validates the entire layout tree with depth tracking.
    /// </summary>
    /// <param name="rootNode">The root layout node to validate.</param>
    /// <returns>A validation result with all errors.</returns>
    public ValidationResult ValidateTree(LayoutNodeDto rootNode)
    {
        var context = new ValidationContext<LayoutNodeDto>(rootNode);
        var result = Validate(context);

        // Additional tree-wide validations
        var depthErrors = ValidateTreeDepth(rootNode, 0, "$");
        foreach (var error in depthErrors)
        {
            result.Errors.Add(error);
        }

        return result;
    }

    /// <summary>
    /// Recursively validates tree depth.
    /// </summary>
    private static List<ValidationFailure> ValidateTreeDepth(
        LayoutNodeDto node,
        int currentDepth,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        if (currentDepth > MaxTreeDepth)
        {
            errors.Add(
                new ValidationFailure(
                    "TreeDepth",
                    $"Layout tree exceeds maximum depth of {MaxTreeDepth} at path: {path}"
                )
            );
            return errors;
        }

        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                var child = node.Children[i];
                var childPath = $"{path}.children[{i}]";
                errors.AddRange(ValidateTreeDepth(child, currentDepth + 1, childPath));
            }
        }

        if (node.Child != null)
        {
            var childPath = $"{path}.child";
            errors.AddRange(ValidateTreeDepth(node.Child, currentDepth + 1, childPath));
        }

        return errors;
    }

    /// <summary>
    /// Validates that the component type is recognized.
    /// </summary>
    private static bool BeValidComponentType(string? type)
    {
        return !string.IsNullOrEmpty(type) && ValidComponentTypes.Contains(type);
    }

    /// <summary>
    /// Validates that the value is a valid expression format ({{ ... }}).
    /// </summary>
    private static bool BeValidExpression(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return true;

        var trimmed = value.Trim();
        return trimmed.StartsWith("{{") && trimmed.EndsWith("}}");
    }

    /// <summary>
    /// Validates that the value is either a boolean string or a valid expression.
    /// </summary>
    private static bool BeValidExpressionOrBoolean(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return true;

        var trimmed = value.Trim().ToLowerInvariant();
        if (trimmed == "true" || trimmed == "false")
            return true;

        return BeValidExpression(value);
    }

    /// <summary>
    /// Validates that the node has a valid child structure for its component type.
    /// </summary>
    private static bool HaveValidChildStructure(LayoutNodeDto node)
    {
        if (string.IsNullOrEmpty(node.Type))
            return true; // Type validation will catch this

        // Leaf components should not have children
        if (LeafComponentTypes.Contains(node.Type))
        {
            return node.Children == null && node.Child == null;
        }

        // Container components can have multiple children via Children property
        if (ContainerComponentTypes.Contains(node.Type))
        {
            // Containers should use Children, not Child
            // But we'll allow empty children or null
            return true;
        }

        // Wrapper components should have a single child via Child property
        if (WrapperComponentTypes.Contains(node.Type))
        {
            // Wrappers should use Child, not Children (or have no children)
            // Allow Children with 0 or 1 element for flexibility
            if (node.Children != null && node.Children.Count > 1)
            {
                return false;
            }
            return true;
        }

        return true;
    }

    /// <summary>
    /// Gets the error message for invalid child structure.
    /// </summary>
    private static string GetChildStructureErrorMessage(LayoutNodeDto node)
    {
        if (string.IsNullOrEmpty(node.Type))
            return "Component type is required";

        if (LeafComponentTypes.Contains(node.Type))
        {
            return $"Component '{node.Type}' is a leaf component and cannot have children";
        }

        if (WrapperComponentTypes.Contains(node.Type) && node.Children?.Count > 1)
        {
            return $"Component '{node.Type}' is a wrapper component and can only have a single child. Use 'child' property instead of 'children'";
        }

        return $"Invalid child structure for component '{node.Type}'";
    }

    /// <summary>
    /// Tries to parse a component type string to the enum value.
    /// </summary>
    public static bool TryParseComponentType(string? type, out ComponentType componentType)
    {
        componentType = default;

        if (string.IsNullOrEmpty(type))
            return false;

        return Enum.TryParse<ComponentType>(type, ignoreCase: true, out componentType);
    }

    /// <summary>
    /// Gets all valid component type names.
    /// </summary>
    public static IReadOnlySet<string> GetValidComponentTypes() => ValidComponentTypes;

    /// <summary>
    /// Checks if a component type is a container.
    /// </summary>
    public static bool IsContainerType(string type) => ContainerComponentTypes.Contains(type);

    /// <summary>
    /// Checks if a component type is a wrapper.
    /// </summary>
    public static bool IsWrapperType(string type) => WrapperComponentTypes.Contains(type);

    /// <summary>
    /// Checks if a component type is a leaf.
    /// </summary>
    public static bool IsLeafType(string type) => LeafComponentTypes.Contains(type);
}

/// <summary>
/// Validator for StylePropertiesDto.
/// </summary>
public sealed class StylePropertiesValidator : AbstractValidator<StylePropertiesDto>
{
    /// <summary>
    /// Valid font weight values.
    /// </summary>
    private static readonly HashSet<string> ValidFontWeights = new(StringComparer.OrdinalIgnoreCase)
    {
        "Thin",
        "ExtraLight",
        "Light",
        "Normal",
        "Regular",
        "Medium",
        "SemiBold",
        "Bold",
        "ExtraBold",
        "Black",
        "Heavy",
        "100",
        "200",
        "300",
        "400",
        "500",
        "600",
        "700",
        "800",
        "900",
    };

    /// <summary>
    /// Valid font style values.
    /// </summary>
    private static readonly HashSet<string> ValidFontStyles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Normal",
        "Italic",
        "Oblique",
    };

    /// <summary>
    /// Valid text alignment values.
    /// </summary>
    private static readonly HashSet<string> ValidTextAlignments = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Left",
        "Center",
        "Right",
        "Justify",
        "Start",
        "End",
    };

    /// <summary>
    /// Valid text decoration values.
    /// </summary>
    private static readonly HashSet<string> ValidTextDecorations = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "None",
        "Underline",
        "Strikethrough",
        "LineThrough",
    };

    /// <summary>
    /// Valid horizontal alignment values.
    /// </summary>
    private static readonly HashSet<string> ValidHorizontalAlignments = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Left",
        "Center",
        "Right",
        "Start",
        "End",
    };

    /// <summary>
    /// Valid vertical alignment values.
    /// </summary>
    private static readonly HashSet<string> ValidVerticalAlignments = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Top",
        "Middle",
        "Center",
        "Bottom",
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="StylePropertiesValidator"/> class.
    /// </summary>
    public StylePropertiesValidator()
    {
        // Font family
        RuleFor(x => x.FontFamily)
            .MaximumLength(100)
            .WithMessage("Font family name cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.FontFamily));

        // Font size
        RuleFor(x => x.FontSize)
            .InclusiveBetween(1f, 1000f)
            .WithMessage("Font size must be between 1 and 1000")
            .When(x => x.FontSize.HasValue);

        // Font weight
        RuleFor(x => x.FontWeight)
            .MaximumLength(50)
            .Must(BeValidFontWeight)
            .WithMessage(x =>
                $"Invalid font weight '{x.FontWeight}'. Valid values: Normal, Bold, Thin, etc."
            )
            .When(x => !string.IsNullOrEmpty(x.FontWeight));

        // Font style
        RuleFor(x => x.FontStyle)
            .MaximumLength(50)
            .Must(BeValidFontStyle)
            .WithMessage(x => $"Invalid font style '{x.FontStyle}'. Valid values: Normal, Italic")
            .When(x => !string.IsNullOrEmpty(x.FontStyle));

        // Color
        RuleFor(x => x.Color)
            .Must(BeValidColor)
            .WithMessage(x =>
                $"Invalid color format '{x.Color}'. Use hex format (#RGB, #RRGGBB, or #AARRGGBB)"
            )
            .When(x => !string.IsNullOrEmpty(x.Color));

        // Text decoration
        RuleFor(x => x.TextDecoration)
            .MaximumLength(50)
            .Must(BeValidTextDecoration)
            .WithMessage(x =>
                $"Invalid text decoration '{x.TextDecoration}'. Valid values: None, Underline, Strikethrough"
            )
            .When(x => !string.IsNullOrEmpty(x.TextDecoration));

        // Line height
        RuleFor(x => x.LineHeight)
            .InclusiveBetween(0.1f, 10f)
            .WithMessage("Line height must be between 0.1 and 10")
            .When(x => x.LineHeight.HasValue);

        // Letter spacing
        RuleFor(x => x.LetterSpacing)
            .InclusiveBetween(-100f, 100f)
            .WithMessage("Letter spacing must be between -100 and 100")
            .When(x => x.LetterSpacing.HasValue);

        // Text alignment
        RuleFor(x => x.TextAlignment)
            .MaximumLength(50)
            .Must(BeValidTextAlignment)
            .WithMessage(x =>
                $"Invalid text alignment '{x.TextAlignment}'. Valid values: Left, Center, Right, Justify"
            )
            .When(x => !string.IsNullOrEmpty(x.TextAlignment));

        // Horizontal alignment
        RuleFor(x => x.HorizontalAlignment)
            .MaximumLength(50)
            .Must(BeValidHorizontalAlignment)
            .WithMessage(x =>
                $"Invalid horizontal alignment '{x.HorizontalAlignment}'. Valid values: Left, Center, Right"
            )
            .When(x => !string.IsNullOrEmpty(x.HorizontalAlignment));

        // Vertical alignment
        RuleFor(x => x.VerticalAlignment)
            .MaximumLength(50)
            .Must(BeValidVerticalAlignment)
            .WithMessage(x =>
                $"Invalid vertical alignment '{x.VerticalAlignment}'. Valid values: Top, Middle, Bottom"
            )
            .When(x => !string.IsNullOrEmpty(x.VerticalAlignment));
    }

    private static bool BeValidFontWeight(string? value) =>
        string.IsNullOrEmpty(value) || ValidFontWeights.Contains(value) || IsExpression(value);

    private static bool BeValidFontStyle(string? value) =>
        string.IsNullOrEmpty(value) || ValidFontStyles.Contains(value) || IsExpression(value);

    private static bool BeValidTextDecoration(string? value) =>
        string.IsNullOrEmpty(value) || ValidTextDecorations.Contains(value) || IsExpression(value);

    private static bool BeValidTextAlignment(string? value) =>
        string.IsNullOrEmpty(value) || ValidTextAlignments.Contains(value) || IsExpression(value);

    private static bool BeValidHorizontalAlignment(string? value) =>
        string.IsNullOrEmpty(value)
        || ValidHorizontalAlignments.Contains(value)
        || IsExpression(value);

    private static bool BeValidVerticalAlignment(string? value) =>
        string.IsNullOrEmpty(value)
        || ValidVerticalAlignments.Contains(value)
        || IsExpression(value);

    private static bool BeValidColor(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return true;

        // Allow expressions
        if (IsExpression(value))
            return true;

        // Check hex format
        if (value.StartsWith('#'))
        {
            var hex = value[1..];
            return (hex.Length == 3 || hex.Length == 6 || hex.Length == 8)
                && hex.All(c => char.IsAsciiHexDigit(c));
        }

        // Check common color names
        var commonColors = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "black",
            "white",
            "red",
            "green",
            "blue",
            "yellow",
            "orange",
            "purple",
            "pink",
            "brown",
            "gray",
            "grey",
            "transparent",
            "cyan",
            "magenta",
        };

        return commonColors.Contains(value);
    }

    private static bool IsExpression(string? value) =>
        !string.IsNullOrEmpty(value) && value.Contains("{{") && value.Contains("}}");
}
