using PDFBuilder.Core.Domain;

namespace PDFBuilder.Validation.Rules;

/// <summary>
/// Provides component-specific validation rules and metadata.
/// Contains information about required properties, allowed values,
/// and validation constraints for each component type.
/// </summary>
public static class ComponentValidationRules
{
    /// <summary>
    /// Gets the required properties for a component type.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>An array of required property names.</returns>
    public static string[] GetRequiredProperties(string componentType)
    {
        return componentType.ToUpperInvariant() switch
        {
            // Content components with required properties
            "IMAGE" => ["source"],
            "HYPERLINK" => ["url"],
            "BARCODE" => ["value"],
            "QRCODE" => ["value"],
            "SECTION" => ["name"],
            "SHOWIF" => ["condition"],

            // Most components don't have strictly required properties
            _ => [],
        };
    }

    /// <summary>
    /// Gets the allowed children type for a component.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>The child type (None, Single, Multiple).</returns>
    public static ChildrenType GetChildrenType(string componentType)
    {
        return componentType.ToUpperInvariant() switch
        {
            // Container components - multiple children
            "COLUMN" => ChildrenType.Multiple,
            "ROW" => ChildrenType.Multiple,
            "TABLE" => ChildrenType.Multiple,
            "LAYERS" => ChildrenType.Multiple,
            "DECORATION" => ChildrenType.Multiple,
            "INLINED" => ChildrenType.Multiple,
            "MULTICOLUMN" => ChildrenType.Multiple,
            "LIST" => ChildrenType.Multiple,

            // Wrapper components - single child
            "PADDING" => ChildrenType.Single,
            "BORDER" => ChildrenType.Single,
            "BACKGROUND" => ChildrenType.Single,
            "ROUNDEDCORNERS" => ChildrenType.Single,
            "SHADOW" => ChildrenType.Single,
            "DEFAULTTEXTSTYLE" => ChildrenType.Single,
            "WIDTH" => ChildrenType.Single,
            "HEIGHT" => ChildrenType.Single,
            "MINWIDTH" => ChildrenType.Single,
            "MAXWIDTH" => ChildrenType.Single,
            "MINHEIGHT" => ChildrenType.Single,
            "MAXHEIGHT" => ChildrenType.Single,
            "ALIGNMENT" => ChildrenType.Single,
            "ASPECTRATIO" => ChildrenType.Single,
            "EXTEND" => ChildrenType.Single,
            "SHRINK" => ChildrenType.Single,
            "UNCONSTRAINED" => ChildrenType.Single,
            "CONSTRAINED" => ChildrenType.Single,
            "ROTATE" => ChildrenType.Single,
            "SCALE" => ChildrenType.Single,
            "SCALETOFIT" => ChildrenType.Single,
            "TRANSLATE" => ChildrenType.Single,
            "FLIP" => ChildrenType.Single,
            "ENSURESPACE" => ChildrenType.Single,
            "SHOWENTIRE" => ChildrenType.Single,
            "STOPPAGING" => ChildrenType.Single,
            "SECTION" => ChildrenType.Single,
            "REPEAT" => ChildrenType.Single,
            "SHOWONCE" => ChildrenType.Single,
            "SKIPONCE" => ChildrenType.Single,
            "CONTENTDIRECTION" => ChildrenType.Single,
            "ZINDEX" => ChildrenType.Single,
            "DEBUGAREA" => ChildrenType.Single,
            "DEBUGPOINTER" => ChildrenType.Single,
            "SHOWIF" => ChildrenType.Single,
            "PREVENTPAGEBREAK" => ChildrenType.Single,
            "HYPERLINK" => ChildrenType.Single,

            // Leaf components - no children
            "TEXT" => ChildrenType.None,
            "IMAGE" => ChildrenType.None,
            "LINE" => ChildrenType.None,
            "PLACEHOLDER" => ChildrenType.None,
            "CANVAS" => ChildrenType.None,
            "BARCODE" => ChildrenType.None,
            "QRCODE" => ChildrenType.None,
            "PAGEBREAK" => ChildrenType.None,

            _ => ChildrenType.None,
        };
    }

    /// <summary>
    /// Gets the category of a component type.
    /// </summary>
    /// <param name="componentType">The component type string.</param>
    /// <returns>The component category.</returns>
    public static string GetCategory(string componentType)
    {
        return componentType.ToUpperInvariant() switch
        {
            "COLUMN"
            or "ROW"
            or "TABLE"
            or "LAYERS"
            or "DECORATION"
            or "INLINED"
            or "MULTICOLUMN" => "Container",

            "TEXT"
            or "IMAGE"
            or "LINE"
            or "PLACEHOLDER"
            or "HYPERLINK"
            or "LIST"
            or "CANVAS"
            or "BARCODE"
            or "QRCODE" => "Content",

            "PADDING"
            or "BORDER"
            or "BACKGROUND"
            or "ROUNDEDCORNERS"
            or "SHADOW"
            or "DEFAULTTEXTSTYLE" => "Styling",

            "WIDTH"
            or "HEIGHT"
            or "MINWIDTH"
            or "MAXWIDTH"
            or "MINHEIGHT"
            or "MAXHEIGHT"
            or "ALIGNMENT"
            or "ASPECTRATIO"
            or "EXTEND"
            or "SHRINK"
            or "UNCONSTRAINED"
            or "CONSTRAINED" => "Sizing",

            "ROTATE" or "SCALE" or "SCALETOFIT" or "TRANSLATE" or "FLIP" => "Transformation",

            "PAGEBREAK"
            or "ENSURESPACE"
            or "SHOWENTIRE"
            or "STOPPAGING"
            or "SECTION"
            or "REPEAT"
            or "SHOWONCE"
            or "SKIPONCE" => "FlowControl",

            "CONTENTDIRECTION" or "ZINDEX" or "DEBUGAREA" or "DEBUGPOINTER" => "Special",

            "SHOWIF" or "PREVENTPAGEBREAK" => "Conditional",

            _ => "Unknown",
        };
    }

    /// <summary>
    /// Gets the property validation rules for a component type.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>A dictionary of property names to their validation rules.</returns>
    public static Dictionary<string, PropertyValidationRule> GetPropertyRules(string componentType)
    {
        var rules = new Dictionary<string, PropertyValidationRule>(
            StringComparer.OrdinalIgnoreCase
        );

        switch (componentType.ToUpperInvariant())
        {
            case "TEXT":
                rules.Add(
                    "content",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.String,
                        SupportsExpression = true,
                    }
                );
                rules.Add(
                    "fontSize",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = ValidationRules.MinFontSize,
                        MaxValue = ValidationRules.MaxFontSize,
                    }
                );
                rules.Add(
                    "fontWeight",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Enum,
                        AllowedValues = ValidationRules.ValidFontWeights.ToArray(),
                    }
                );
                rules.Add(
                    "fontStyle",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Enum,
                        AllowedValues = ValidationRules.ValidFontStyles.ToArray(),
                    }
                );
                rules.Add(
                    "color",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Color,
                        SupportsExpression = true,
                    }
                );
                rules.Add(
                    "alignment",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Enum,
                        AllowedValues = ValidationRules.ValidTextAlignments.ToArray(),
                    }
                );
                rules.Add(
                    "lineHeight",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = ValidationRules.MinLineHeight,
                        MaxValue = ValidationRules.MaxLineHeight,
                    }
                );
                rules.Add(
                    "letterSpacing",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = ValidationRules.MinLetterSpacing,
                        MaxValue = ValidationRules.MaxLetterSpacing,
                    }
                );
                break;

            case "IMAGE":
                rules.Add(
                    "source",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Url,
                        IsRequired = true,
                        SupportsExpression = true,
                    }
                );
                rules.Add(
                    "width",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = 0,
                        MaxValue = ValidationRules.MaxDimension,
                    }
                );
                rules.Add(
                    "height",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = 0,
                        MaxValue = ValidationRules.MaxDimension,
                    }
                );
                rules.Add(
                    "fit",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Enum,
                        AllowedValues = new[]
                        {
                            "Fill",
                            "Contain",
                            "Cover",
                            "Width",
                            "Height",
                            "Area",
                            "Unproportional",
                        },
                    }
                );
                break;

            case "PADDING":
                var paddingRule = new PropertyValidationRule
                {
                    Type = PropertyType.Number,
                    MinValue = 0,
                    MaxValue = ValidationRules.MaxPadding,
                };
                rules.Add("all", paddingRule);
                rules.Add("top", paddingRule);
                rules.Add("right", paddingRule);
                rules.Add("bottom", paddingRule);
                rules.Add("left", paddingRule);
                rules.Add("horizontal", paddingRule);
                rules.Add("vertical", paddingRule);
                break;

            case "BORDER":
                var borderThicknessRule = new PropertyValidationRule
                {
                    Type = PropertyType.Number,
                    MinValue = 0,
                    MaxValue = ValidationRules.MaxBorderThickness,
                };
                rules.Add("all", borderThicknessRule);
                rules.Add("top", borderThicknessRule);
                rules.Add("right", borderThicknessRule);
                rules.Add("bottom", borderThicknessRule);
                rules.Add("left", borderThicknessRule);
                rules.Add("thickness", borderThicknessRule);
                rules.Add("color", new PropertyValidationRule { Type = PropertyType.Color });
                break;

            case "BACKGROUND":
                rules.Add(
                    "color",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Color,
                        SupportsExpression = true,
                    }
                );
                break;

            case "WIDTH":
            case "HEIGHT":
            case "MINWIDTH":
            case "MAXWIDTH":
            case "MINHEIGHT":
            case "MAXHEIGHT":
                rules.Add(
                    "value",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = 0,
                        MaxValue = ValidationRules.MaxDimension,
                    }
                );
                rules.Add(
                    "unit",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Enum,
                        AllowedValues = ValidationRules.ValidUnits.ToArray(),
                    }
                );
                break;

            case "COLUMN":
            case "ROW":
                rules.Add(
                    "spacing",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = 0,
                        MaxValue = ValidationRules.MaxPadding,
                    }
                );
                break;

            case "ALIGNMENT":
                rules.Add(
                    "horizontal",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Enum,
                        AllowedValues = ValidationRules.ValidHorizontalAlignments.ToArray(),
                    }
                );
                rules.Add(
                    "vertical",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Enum,
                        AllowedValues = ValidationRules.ValidVerticalAlignments.ToArray(),
                    }
                );
                break;

            case "ROTATE":
                rules.Add(
                    "angle",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = -360,
                        MaxValue = 360,
                    }
                );
                break;

            case "SCALE":
                rules.Add(
                    "value",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Number,
                        MinValue = 0,
                        MaxValue = 100,
                    }
                );
                break;

            case "HYPERLINK":
                rules.Add(
                    "url",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Url,
                        IsRequired = true,
                        SupportsExpression = true,
                    }
                );
                break;

            case "SECTION":
                rules.Add(
                    "name",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.String,
                        IsRequired = true,
                        SupportsExpression = true,
                    }
                );
                break;

            case "SHOWIF":
                rules.Add(
                    "condition",
                    new PropertyValidationRule
                    {
                        Type = PropertyType.Expression,
                        IsRequired = true,
                        SupportsExpression = true,
                    }
                );
                break;
        }

        return rules;
    }

    /// <summary>
    /// Checks if a component type is valid.
    /// </summary>
    /// <param name="componentType">The component type to check.</param>
    /// <returns>True if the component type is valid; otherwise, false.</returns>
    public static bool IsValidComponentType(string? componentType)
    {
        if (string.IsNullOrWhiteSpace(componentType))
            return false;

        return Enum.TryParse<ComponentType>(componentType, ignoreCase: true, out _);
    }
}

/// <summary>
/// Defines the children type for a component.
/// </summary>
public enum ChildrenType
{
    /// <summary>
    /// Component cannot have children (leaf node).
    /// </summary>
    None,

    /// <summary>
    /// Component can have a single child (wrapper).
    /// </summary>
    Single,

    /// <summary>
    /// Component can have multiple children (container).
    /// </summary>
    Multiple,
}

/// <summary>
/// Defines validation rules for a component property.
/// </summary>
public sealed class PropertyValidationRule
{
    /// <summary>
    /// Gets or sets the expected property type.
    /// </summary>
    public PropertyType Type { get; set; }

    /// <summary>
    /// Gets or sets whether this property is required.
    /// </summary>
    public bool IsRequired { get; set; }

    /// <summary>
    /// Gets or sets whether this property supports expression binding.
    /// </summary>
    public bool SupportsExpression { get; set; } = true;

    /// <summary>
    /// Gets or sets the minimum allowed value (for numeric types).
    /// </summary>
    public float? MinValue { get; set; }

    /// <summary>
    /// Gets or sets the maximum allowed value (for numeric types).
    /// </summary>
    public float? MaxValue { get; set; }

    /// <summary>
    /// Gets or sets the allowed values (for enum types).
    /// </summary>
    public string[]? AllowedValues { get; set; }

    /// <summary>
    /// Gets or sets a regex pattern for string validation.
    /// </summary>
    public string? Pattern { get; set; }

    /// <summary>
    /// Gets or sets the maximum length (for string types).
    /// </summary>
    public int? MaxLength { get; set; }
}

/// <summary>
/// Property types for validation.
/// </summary>
public enum PropertyType
{
    /// <summary>String value.</summary>
    String,

    /// <summary>Numeric value.</summary>
    Number,

    /// <summary>Boolean value.</summary>
    Boolean,

    /// <summary>Color value (hex or named).</summary>
    Color,

    /// <summary>URL or URI value.</summary>
    Url,

    /// <summary>Enumerated value from a fixed set.</summary>
    Enum,

    /// <summary>Expression value ({{ ... }}).</summary>
    Expression,

    /// <summary>JSON object.</summary>
    Object,

    /// <summary>JSON array.</summary>
    Array,
}
