using System.Text.Json;
using FluentValidation;
using FluentValidation.Results;
using PDFBuilder.Contracts.DTOs;

namespace PDFBuilder.Validation.Validators;

/// <summary>
/// Validates component-specific properties for layout nodes.
/// Provides detailed validation for each component type's properties including
/// required properties, value ranges, and format validation.
/// </summary>
public sealed class ComponentPropertyValidator : AbstractValidator<LayoutNodeDto>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ComponentPropertyValidator"/> class.
    /// </summary>
    public ComponentPropertyValidator()
    {
        // Validate component-specific properties based on type
        RuleFor(x => x)
            .Custom(
                (node, context) =>
                {
                    if (string.IsNullOrEmpty(node.Type))
                        return;

                    var errors = ValidateComponentProperties(
                        node,
                        context.PropertyChain?.ToString() ?? "$"
                    );
                    foreach (var error in errors)
                    {
                        context.AddFailure(error);
                    }
                }
            );
    }

    /// <summary>
    /// Validates all properties for a specific component type.
    /// </summary>
    /// <param name="node">The layout node to validate.</param>
    /// <param name="path">The JSON path to the node.</param>
    /// <returns>A list of validation failures.</returns>
    public static List<ValidationFailure> ValidateComponentProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        if (string.IsNullOrEmpty(node.Type))
            return errors;

        // Get component-specific validation based on type
        var validationResult = node.Type.ToUpperInvariant() switch
        {
            // Container Components
            "COLUMN" => ValidateColumnProperties(node, path),
            "ROW" => ValidateRowProperties(node, path),
            "TABLE" => ValidateTableProperties(node, path),
            "LAYERS" => ValidateLayersProperties(node, path),
            "DECORATION" => ValidateDecorationProperties(node, path),
            "INLINED" => ValidateInlinedProperties(node, path),
            "MULTICOLUMN" => ValidateMultiColumnProperties(node, path),

            // Content Components
            "TEXT" => ValidateTextProperties(node, path),
            "IMAGE" => ValidateImageProperties(node, path),
            "LINE" => ValidateLineProperties(node, path),
            "PLACEHOLDER" => ValidatePlaceholderProperties(node, path),
            "HYPERLINK" => ValidateHyperlinkProperties(node, path),
            "LIST" => ValidateListProperties(node, path),
            "CANVAS" => ValidateCanvasProperties(node, path),
            "BARCODE" => ValidateBarcodeProperties(node, path),
            "QRCODE" => ValidateQRCodeProperties(node, path),

            // Styling Components
            "PADDING" => ValidatePaddingProperties(node, path),
            "BORDER" => ValidateBorderProperties(node, path),
            "BACKGROUND" => ValidateBackgroundProperties(node, path),
            "ROUNDEDCORNERS" => ValidateRoundedCornersProperties(node, path),
            "SHADOW" => ValidateShadowProperties(node, path),
            "DEFAULTTEXTSTYLE" => ValidateDefaultTextStyleProperties(node, path),

            // Sizing Components
            "WIDTH" => ValidateWidthProperties(node, path),
            "HEIGHT" => ValidateHeightProperties(node, path),
            "MINWIDTH" => ValidateMinWidthProperties(node, path),
            "MAXWIDTH" => ValidateMaxWidthProperties(node, path),
            "MINHEIGHT" => ValidateMinHeightProperties(node, path),
            "MAXHEIGHT" => ValidateMaxHeightProperties(node, path),
            "ALIGNMENT" => ValidateAlignmentProperties(node, path),
            "ASPECTRATIO" => ValidateAspectRatioProperties(node, path),
            "EXTEND" => ValidateExtendProperties(node, path),
            "SHRINK" => ValidateShrinkProperties(node, path),
            "UNCONSTRAINED" => ValidateUnconstrainedProperties(node, path),
            "CONSTRAINED" => ValidateConstrainedProperties(node, path),

            // Transformation Components
            "ROTATE" => ValidateRotateProperties(node, path),
            "SCALE" => ValidateScaleProperties(node, path),
            "SCALETOFIT" => ValidateScaleToFitProperties(node, path),
            "TRANSLATE" => ValidateTranslateProperties(node, path),
            "FLIP" => ValidateFlipProperties(node, path),

            // Flow Control Components
            "PAGEBREAK" => ValidatePageBreakProperties(node, path),
            "ENSURESPACE" => ValidateEnsureSpaceProperties(node, path),
            "SHOWENTIRE" => ValidateShowEntireProperties(node, path),
            "STOPPAGING" => ValidateStopPagingProperties(node, path),
            "SECTION" => ValidateSectionProperties(node, path),
            "REPEAT" => ValidateRepeatProperties(node, path),
            "SHOWONCE" => ValidateShowOnceProperties(node, path),
            "SKIPONCE" => ValidateSkipOnceProperties(node, path),

            // Special Components
            "CONTENTDIRECTION" => ValidateContentDirectionProperties(node, path),
            "ZINDEX" => ValidateZIndexProperties(node, path),
            "DEBUGAREA" => ValidateDebugAreaProperties(node, path),
            "DEBUGPOINTER" => ValidateDebugPointerProperties(node, path),

            // Conditional Components
            "SHOWIF" => ValidateShowIfProperties(node, path),
            "PREVENTPAGEBREAK" => ValidatePreventPageBreakProperties(node, path),

            _ => [],
        };

        errors.AddRange(validationResult);
        return errors;
    }

    #region Container Components Validation

    private static List<ValidationFailure> ValidateColumnProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // spacing - optional, must be >= 0
        if (TryGetNumericProperty(node, "spacing", out var spacing))
        {
            if (spacing < 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.spacing",
                        "spacing",
                        "Spacing must be greater than or equal to 0",
                        spacing
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateRowProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // spacing - optional, must be >= 0
        if (TryGetNumericProperty(node, "spacing", out var spacing))
        {
            if (spacing < 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.spacing",
                        "spacing",
                        "Spacing must be greater than or equal to 0",
                        spacing
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateTableProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // columns - can be number or array of column definitions
        if (TryGetNumericProperty(node, "columns", out var columns))
        {
            if (columns < 1)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.columns",
                        "columns",
                        "Table must have at least 1 column",
                        columns
                    )
                );
            }
            if (columns > 100)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.columns",
                        "columns",
                        "Table cannot have more than 100 columns",
                        columns
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateLayersProperties(
        LayoutNodeDto _node,
        string _path
    )
    {
        // Layers component doesn't require specific properties
        _ = _node;
        _ = _path;
        return [];
    }

    private static List<ValidationFailure> ValidateDecorationProperties(
        LayoutNodeDto _node,
        string _path
    )
    {
        // Decoration can have header, content, footer children
        _ = _node;
        _ = _path;
        return [];
    }

    private static List<ValidationFailure> ValidateInlinedProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // spacing - optional
        if (TryGetNumericProperty(node, "spacing", out var spacing))
        {
            if (spacing < 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.spacing",
                        "spacing",
                        "Spacing must be greater than or equal to 0",
                        spacing
                    )
                );
            }
        }

        // baselineAlignment - optional enum
        if (TryGetStringProperty(node, "baselineAlignment", out var alignment))
        {
            var validAlignments = new[] { "Top", "Middle", "Bottom" };
            if (
                !validAlignments.Contains(alignment, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(alignment)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.baselineAlignment",
                        "baselineAlignment",
                        $"Invalid baselineAlignment '{alignment}'. Valid values: Top, Middle, Bottom",
                        alignment
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateMultiColumnProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // columns - required, must be >= 2
        if (TryGetNumericProperty(node, "columns", out var columns))
        {
            if (columns < 2)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.columns",
                        "columns",
                        "MultiColumn must have at least 2 columns",
                        columns
                    )
                );
            }
            if (columns > 10)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.columns",
                        "columns",
                        "MultiColumn cannot have more than 10 columns",
                        columns
                    )
                );
            }
        }

        // spacing - optional
        if (TryGetNumericProperty(node, "spacing", out var spacing))
        {
            if (spacing < 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.spacing",
                        "spacing",
                        "Spacing must be greater than or equal to 0",
                        spacing
                    )
                );
            }
        }

        return errors;
    }

    #endregion

    #region Content Components Validation

    private static List<ValidationFailure> ValidateTextProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // Check for content property (not strictly required, could have child TextSpans)
        // fontSize - optional but must be positive
        if (TryGetNumericProperty(node, "fontSize", out var fontSize))
        {
            if (fontSize <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.fontSize",
                        "fontSize",
                        "Font size must be greater than 0",
                        fontSize
                    )
                );
            }
            if (fontSize > 1000)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.fontSize",
                        "fontSize",
                        "Font size cannot exceed 1000",
                        fontSize
                    )
                );
            }
        }

        // letterSpacing
        if (TryGetNumericProperty(node, "letterSpacing", out var letterSpacing))
        {
            if (letterSpacing < -100 || letterSpacing > 100)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.letterSpacing",
                        "letterSpacing",
                        "Letter spacing must be between -100 and 100",
                        letterSpacing
                    )
                );
            }
        }

        // lineHeight
        if (TryGetNumericProperty(node, "lineHeight", out var lineHeight))
        {
            if (lineHeight < 0.1 || lineHeight > 10)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.lineHeight",
                        "lineHeight",
                        "Line height must be between 0.1 and 10",
                        lineHeight
                    )
                );
            }
        }

        // alignment - enum validation
        if (TryGetStringProperty(node, "alignment", out var alignment))
        {
            var validAlignments = new[] { "Left", "Center", "Right", "Justify", "Start", "End" };
            if (
                !validAlignments.Contains(alignment, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(alignment)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.alignment",
                        "alignment",
                        $"Invalid alignment '{alignment}'. Valid values: Left, Center, Right, Justify",
                        alignment
                    )
                );
            }
        }

        // fontWeight - enum validation
        if (TryGetStringProperty(node, "fontWeight", out var fontWeight))
        {
            var validWeights = new[]
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
            };
            if (
                !validWeights.Contains(fontWeight, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(fontWeight)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.fontWeight",
                        "fontWeight",
                        $"Invalid font weight '{fontWeight}'. Valid values: Normal, Bold, Light, etc.",
                        fontWeight
                    )
                );
            }
        }

        // color - format validation
        if (TryGetStringProperty(node, "color", out var color))
        {
            if (!IsValidColor(color) && !IsExpression(color))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.color",
                        "color",
                        $"Invalid color format '{color}'. Use hex format (#RGB, #RRGGBB, or #AARRGGBB)",
                        color
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateImageProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // source - required (URL, file path, or base64)
        var hasSource =
            TryGetStringProperty(node, "source", out var source)
            || TryGetStringProperty(node, "src", out source)
            || TryGetStringProperty(node, "url", out source);

        if (!hasSource || string.IsNullOrWhiteSpace(source))
        {
            // Allow if it might be an expression at the node level or in properties
            if (
                !HasExpressionProperty(node, "source")
                && !HasExpressionProperty(node, "src")
                && !HasExpressionProperty(node, "url")
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.source",
                        "source",
                        "Image source is required (url, file path, or base64 data URI)",
                        null
                    )
                );
            }
        }
        else if (!IsExpression(source))
        {
            // Validate URL format if not an expression
            if (
                !source.StartsWith("data:")
                && !source.StartsWith("http://")
                && !source.StartsWith("https://")
                && !IsLocalPath(source)
            )
            {
                // Could be a relative path or asset reference - allow it
            }
        }

        // width - optional but must be positive
        if (TryGetNumericProperty(node, "width", out var width))
        {
            if (width <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.width",
                        "width",
                        "Image width must be greater than 0",
                        width
                    )
                );
            }
        }

        // height - optional but must be positive
        if (TryGetNumericProperty(node, "height", out var height))
        {
            if (height <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.height",
                        "height",
                        "Image height must be greater than 0",
                        height
                    )
                );
            }
        }

        // fit mode - enum validation
        if (TryGetStringProperty(node, "fit", out var fit))
        {
            var validFitModes = new[]
            {
                "Fill",
                "Contain",
                "Cover",
                "Width",
                "Height",
                "Area",
                "Unproportional",
            };
            if (
                !validFitModes.Contains(fit, StringComparer.OrdinalIgnoreCase) && !IsExpression(fit)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.fit",
                        "fit",
                        $"Invalid fit mode '{fit}'. Valid values: Fill, Contain, Cover, Width, Height, Area",
                        fit
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateLineProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // direction - enum (Horizontal or Vertical)
        if (TryGetStringProperty(node, "direction", out var direction))
        {
            var validDirections = new[] { "Horizontal", "Vertical" };
            if (
                !validDirections.Contains(direction, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(direction)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.direction",
                        "direction",
                        $"Invalid direction '{direction}'. Valid values: Horizontal, Vertical",
                        direction
                    )
                );
            }
        }

        // thickness - must be positive
        if (TryGetNumericProperty(node, "thickness", out var thickness))
        {
            if (thickness <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.thickness",
                        "thickness",
                        "Line thickness must be greater than 0",
                        thickness
                    )
                );
            }
            if (thickness > 100)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.thickness",
                        "thickness",
                        "Line thickness cannot exceed 100",
                        thickness
                    )
                );
            }
        }

        // color - format validation
        if (TryGetStringProperty(node, "color", out var color))
        {
            if (!IsValidColor(color) && !IsExpression(color))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.color",
                        "color",
                        $"Invalid color format '{color}'",
                        color
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidatePlaceholderProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // Placeholder has no required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateHyperlinkProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // url - required
        var hasUrl =
            TryGetStringProperty(node, "url", out var url)
            || TryGetStringProperty(node, "href", out url);
        if (!hasUrl || string.IsNullOrWhiteSpace(url))
        {
            if (!HasExpressionProperty(node, "url") && !HasExpressionProperty(node, "href"))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.url",
                        "url",
                        "Hyperlink URL is required",
                        null
                    )
                );
            }
        }
        else if (!IsExpression(url))
        {
            // Validate URL format
            if (!Uri.TryCreate(url, UriKind.Absolute, out _) && !url.StartsWith("#"))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.url",
                        "url",
                        $"Invalid URL format '{url}'",
                        url
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateListProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // type - enum (Ordered or Unordered)
        if (TryGetStringProperty(node, "type", out var type))
        {
            var validTypes = new[]
            {
                "Ordered",
                "Unordered",
                "Bullet",
                "Number",
                "Letter",
                "Roman",
            };
            if (!validTypes.Contains(type, StringComparer.OrdinalIgnoreCase) && !IsExpression(type))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.type",
                        "type",
                        $"Invalid list type '{type}'. Valid values: Ordered, Unordered, Bullet, Number",
                        type
                    )
                );
            }
        }

        // spacing
        if (TryGetNumericProperty(node, "spacing", out var spacing))
        {
            if (spacing < 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.spacing",
                        "spacing",
                        "Spacing must be greater than or equal to 0",
                        spacing
                    )
                );
            }
        }

        // indentSize
        if (TryGetNumericProperty(node, "indentSize", out var indentSize))
        {
            if (indentSize < 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.indentSize",
                        "indentSize",
                        "Indent size must be greater than or equal to 0",
                        indentSize
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateCanvasProperties(LayoutNodeDto node, string path)
    {
        // Canvas properties are validated at render time
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateBarcodeProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // value - required
        if (!TryGetStringProperty(node, "value", out var value) || string.IsNullOrWhiteSpace(value))
        {
            if (!HasExpressionProperty(node, "value"))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.value",
                        "value",
                        "Barcode value is required",
                        null
                    )
                );
            }
        }

        // type - enum
        if (TryGetStringProperty(node, "type", out var barcodeType))
        {
            var validTypes = new[]
            {
                "Code128",
                "Code39",
                "EAN13",
                "EAN8",
                "UPCA",
                "UPCE",
                "ITF",
                "PDF417",
                "DataMatrix",
            };
            if (
                !validTypes.Contains(barcodeType, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(barcodeType)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.type",
                        "type",
                        $"Invalid barcode type '{barcodeType}'. Valid values: Code128, Code39, EAN13, etc.",
                        barcodeType
                    )
                );
            }
        }

        // height - must be positive
        if (TryGetNumericProperty(node, "height", out var height))
        {
            if (height <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.height",
                        "height",
                        "Barcode height must be greater than 0",
                        height
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateQRCodeProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // value/content - required
        var hasValue =
            TryGetStringProperty(node, "value", out var value)
            || TryGetStringProperty(node, "content", out value);
        if (!hasValue || string.IsNullOrWhiteSpace(value))
        {
            if (!HasExpressionProperty(node, "value") && !HasExpressionProperty(node, "content"))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.value",
                        "value",
                        "QR code value/content is required",
                        null
                    )
                );
            }
        }

        // size - must be positive
        if (TryGetNumericProperty(node, "size", out var size))
        {
            if (size <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.size",
                        "size",
                        "QR code size must be greater than 0",
                        size
                    )
                );
            }
        }

        // errorCorrectionLevel - enum
        if (TryGetStringProperty(node, "errorCorrectionLevel", out var ecl))
        {
            var validLevels = new[] { "L", "M", "Q", "H", "Low", "Medium", "Quartile", "High" };
            if (!validLevels.Contains(ecl, StringComparer.OrdinalIgnoreCase) && !IsExpression(ecl))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.errorCorrectionLevel",
                        "errorCorrectionLevel",
                        $"Invalid error correction level '{ecl}'. Valid values: L, M, Q, H",
                        ecl
                    )
                );
            }
        }

        return errors;
    }

    #endregion

    #region Styling Components Validation

    private static List<ValidationFailure> ValidatePaddingProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // Check all padding properties
        var paddingProps = new[]
        {
            "padding",
            "all",
            "top",
            "right",
            "bottom",
            "left",
            "horizontal",
            "vertical",
        };
        foreach (var prop in paddingProps)
        {
            if (TryGetNumericProperty(node, prop, out var padding))
            {
                if (padding < 0)
                {
                    errors.Add(
                        CreateFailure(
                            $"{path}.properties.{prop}",
                            prop,
                            $"Padding {prop} must be greater than or equal to 0",
                            padding
                        )
                    );
                }
                if (padding > 500)
                {
                    errors.Add(
                        CreateFailure(
                            $"{path}.properties.{prop}",
                            prop,
                            $"Padding {prop} cannot exceed 500",
                            padding
                        )
                    );
                }
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateBorderProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // thickness/width - must be positive
        var thicknessProps = new[]
        {
            "thickness",
            "width",
            "all",
            "top",
            "right",
            "bottom",
            "left",
        };
        foreach (var prop in thicknessProps)
        {
            if (TryGetNumericProperty(node, prop, out var thickness))
            {
                if (thickness < 0)
                {
                    errors.Add(
                        CreateFailure(
                            $"{path}.properties.{prop}",
                            prop,
                            $"Border {prop} must be greater than or equal to 0",
                            thickness
                        )
                    );
                }
                if (thickness > 100)
                {
                    errors.Add(
                        CreateFailure(
                            $"{path}.properties.{prop}",
                            prop,
                            $"Border {prop} cannot exceed 100",
                            thickness
                        )
                    );
                }
            }
        }

        // color - format validation
        if (TryGetStringProperty(node, "color", out var color))
        {
            if (!IsValidColor(color) && !IsExpression(color))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.color",
                        "color",
                        $"Invalid color format '{color}'",
                        color
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateBackgroundProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // color - required
        if (TryGetStringProperty(node, "color", out var color))
        {
            if (!IsValidColor(color) && !IsExpression(color))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.color",
                        "color",
                        $"Invalid color format '{color}'",
                        color
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateRoundedCornersProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // radius properties
        var radiusProps = new[]
        {
            "radius",
            "all",
            "topLeft",
            "topRight",
            "bottomLeft",
            "bottomRight",
        };
        foreach (var prop in radiusProps)
        {
            if (TryGetNumericProperty(node, prop, out var radius))
            {
                if (radius < 0)
                {
                    errors.Add(
                        CreateFailure(
                            $"{path}.properties.{prop}",
                            prop,
                            $"Radius {prop} must be greater than or equal to 0",
                            radius
                        )
                    );
                }
                if (radius > 500)
                {
                    errors.Add(
                        CreateFailure(
                            $"{path}.properties.{prop}",
                            prop,
                            $"Radius {prop} cannot exceed 500",
                            radius
                        )
                    );
                }
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateShadowProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // color
        if (TryGetStringProperty(node, "color", out var color))
        {
            if (!IsValidColor(color) && !IsExpression(color))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.color",
                        "color",
                        $"Invalid shadow color format '{color}'",
                        color
                    )
                );
            }
        }

        // blur - must be non-negative
        if (TryGetNumericProperty(node, "blur", out var blur))
        {
            if (blur < 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.blur",
                        "blur",
                        "Shadow blur must be greater than or equal to 0",
                        blur
                    )
                );
            }
        }

        // offset values can be negative (for direction)
        // spread - must be non-negative
        if (TryGetNumericProperty(node, "spread", out var spread))
        {
            if (spread < 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.spread",
                        "spread",
                        "Shadow spread must be greater than or equal to 0",
                        spread
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateDefaultTextStyleProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // Uses same validation as Text
        return ValidateTextProperties(node, path);
    }

    #endregion

    #region Sizing Components Validation

    private static List<ValidationFailure> ValidateWidthProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        if (
            TryGetNumericProperty(node, "value", out var value)
            || TryGetNumericProperty(node, "width", out value)
        )
        {
            if (value <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.value",
                        "value",
                        "Width must be greater than 0",
                        value
                    )
                );
            }
        }

        // unit - enum
        if (TryGetStringProperty(node, "unit", out var unit))
        {
            var validUnits = new[]
            {
                "Point",
                "Points",
                "Pt",
                "Inch",
                "Inches",
                "In",
                "Centimeter",
                "Centimeters",
                "Cm",
                "Millimeter",
                "Millimeters",
                "Mm",
                "Percent",
                "%",
            };
            if (!validUnits.Contains(unit, StringComparer.OrdinalIgnoreCase) && !IsExpression(unit))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.unit",
                        "unit",
                        $"Invalid unit '{unit}'. Valid values: Point, Inch, Cm, Mm, Percent",
                        unit
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateHeightProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        if (
            TryGetNumericProperty(node, "value", out var value)
            || TryGetNumericProperty(node, "height", out value)
        )
        {
            if (value <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.value",
                        "value",
                        "Height must be greater than 0",
                        value
                    )
                );
            }
        }

        // unit - enum
        if (TryGetStringProperty(node, "unit", out var unit))
        {
            var validUnits = new[]
            {
                "Point",
                "Points",
                "Pt",
                "Inch",
                "Inches",
                "In",
                "Centimeter",
                "Centimeters",
                "Cm",
                "Millimeter",
                "Millimeters",
                "Mm",
                "Percent",
                "%",
            };
            if (!validUnits.Contains(unit, StringComparer.OrdinalIgnoreCase) && !IsExpression(unit))
            {
                errors.Add(
                    CreateFailure($"{path}.properties.unit", "unit", $"Invalid unit '{unit}'", unit)
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateMinWidthProperties(
        LayoutNodeDto node,
        string path
    )
    {
        return ValidateWidthProperties(node, path);
    }

    private static List<ValidationFailure> ValidateMaxWidthProperties(
        LayoutNodeDto node,
        string path
    )
    {
        return ValidateWidthProperties(node, path);
    }

    private static List<ValidationFailure> ValidateMinHeightProperties(
        LayoutNodeDto node,
        string path
    )
    {
        return ValidateHeightProperties(node, path);
    }

    private static List<ValidationFailure> ValidateMaxHeightProperties(
        LayoutNodeDto node,
        string path
    )
    {
        return ValidateHeightProperties(node, path);
    }

    private static List<ValidationFailure> ValidateAlignmentProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // horizontal
        if (TryGetStringProperty(node, "horizontal", out var horizontal))
        {
            var validAlignments = new[] { "Left", "Center", "Right", "Start", "End" };
            if (
                !validAlignments.Contains(horizontal, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(horizontal)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.horizontal",
                        "horizontal",
                        $"Invalid horizontal alignment '{horizontal}'. Valid values: Left, Center, Right",
                        horizontal
                    )
                );
            }
        }

        // vertical
        if (TryGetStringProperty(node, "vertical", out var vertical))
        {
            var validAlignments = new[] { "Top", "Middle", "Center", "Bottom" };
            if (
                !validAlignments.Contains(vertical, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(vertical)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.vertical",
                        "vertical",
                        $"Invalid vertical alignment '{vertical}'. Valid values: Top, Middle, Bottom",
                        vertical
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateAspectRatioProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        if (
            TryGetNumericProperty(node, "ratio", out var ratio)
            || TryGetNumericProperty(node, "value", out ratio)
        )
        {
            if (ratio <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.ratio",
                        "ratio",
                        "Aspect ratio must be greater than 0",
                        ratio
                    )
                );
            }
        }

        // option - enum
        if (TryGetStringProperty(node, "option", out var option))
        {
            var validOptions = new[] { "FitWidth", "FitHeight", "FitArea" };
            if (
                !validOptions.Contains(option, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(option)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.option",
                        "option",
                        $"Invalid aspect ratio option '{option}'. Valid values: FitWidth, FitHeight, FitArea",
                        option
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateExtendProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // direction - enum
        if (TryGetStringProperty(node, "direction", out var direction))
        {
            var validDirections = new[] { "Horizontal", "Vertical", "Both" };
            if (
                !validDirections.Contains(direction, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(direction)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.direction",
                        "direction",
                        $"Invalid extend direction '{direction}'. Valid values: Horizontal, Vertical, Both",
                        direction
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateShrinkProperties(LayoutNodeDto node, string path)
    {
        // Shrink typically doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateUnconstrainedProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // Unconstrained typically doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateConstrainedProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // minWidth, maxWidth, minHeight, maxHeight
        var constraintProps = new[] { "minWidth", "maxWidth", "minHeight", "maxHeight" };
        foreach (var prop in constraintProps)
        {
            if (TryGetNumericProperty(node, prop, out var value))
            {
                if (value < 0)
                {
                    errors.Add(
                        CreateFailure(
                            $"{path}.properties.{prop}",
                            prop,
                            $"{prop} must be greater than or equal to 0",
                            value
                        )
                    );
                }
            }
        }

        return errors;
    }

    #endregion

    #region Transformation Components Validation

    private static List<ValidationFailure> ValidateRotateProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();
        _ = path; // Path available for future validation enhancements

        // angle - required
        if (
            TryGetNumericProperty(node, "angle", out var angle)
            || TryGetNumericProperty(node, "degrees", out angle)
        )
        {
            // Any angle value is valid, but we can warn about unusual values
            if (angle < -360 || angle > 360)
            {
                // This is just a warning, not an error - normalize the angle
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateScaleProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // value/factor - must be positive
        if (
            TryGetNumericProperty(node, "value", out var scale)
            || TryGetNumericProperty(node, "factor", out scale)
        )
        {
            if (scale <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.value",
                        "value",
                        "Scale factor must be greater than 0",
                        scale
                    )
                );
            }
            if (scale > 100)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.value",
                        "value",
                        "Scale factor cannot exceed 100",
                        scale
                    )
                );
            }
        }

        // scaleX, scaleY - must be positive
        foreach (var prop in new[] { "scaleX", "scaleY" })
        {
            if (TryGetNumericProperty(node, prop, out var scaleAxis))
            {
                if (scaleAxis <= 0)
                {
                    errors.Add(
                        CreateFailure(
                            $"{path}.properties.{prop}",
                            prop,
                            $"{prop} must be greater than 0",
                            scaleAxis
                        )
                    );
                }
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateScaleToFitProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // ScaleToFit typically doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateTranslateProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // x and y can be any value (positive or negative)
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateFlipProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // direction - enum
        if (TryGetStringProperty(node, "direction", out var direction))
        {
            var validDirections = new[] { "Horizontal", "Vertical", "Both" };
            if (
                !validDirections.Contains(direction, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(direction)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.direction",
                        "direction",
                        $"Invalid flip direction '{direction}'. Valid values: Horizontal, Vertical, Both",
                        direction
                    )
                );
            }
        }

        return errors;
    }

    #endregion

    #region Flow Control Components Validation

    private static List<ValidationFailure> ValidatePageBreakProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // PageBreak doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateEnsureSpaceProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // minHeight/value - required, must be positive
        if (
            TryGetNumericProperty(node, "minHeight", out var minHeight)
            || TryGetNumericProperty(node, "value", out minHeight)
        )
        {
            if (minHeight <= 0)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.minHeight",
                        "minHeight",
                        "Minimum height must be greater than 0",
                        minHeight
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateShowEntireProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // ShowEntire doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateStopPagingProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // StopPaging doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateSectionProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // name - required for ToC
        if (!TryGetStringProperty(node, "name", out var name) || string.IsNullOrWhiteSpace(name))
        {
            if (!HasExpressionProperty(node, "name"))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.name",
                        "name",
                        "Section name is required",
                        null
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateRepeatProperties(LayoutNodeDto node, string path)
    {
        // Repeat doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateShowOnceProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // ShowOnce doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateSkipOnceProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // SkipOnce doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    #endregion

    #region Special Components Validation

    private static List<ValidationFailure> ValidateContentDirectionProperties(
        LayoutNodeDto node,
        string path
    )
    {
        var errors = new List<ValidationFailure>();

        // direction - enum
        if (TryGetStringProperty(node, "direction", out var direction))
        {
            var validDirections = new[] { "LTR", "RTL", "LeftToRight", "RightToLeft" };
            if (
                !validDirections.Contains(direction, StringComparer.OrdinalIgnoreCase)
                && !IsExpression(direction)
            )
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.direction",
                        "direction",
                        $"Invalid content direction '{direction}'. Valid values: LTR, RTL",
                        direction
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateZIndexProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // zIndex/value - must be integer
        if (
            TryGetNumericProperty(node, "zIndex", out var zIndex)
            || TryGetNumericProperty(node, "value", out zIndex)
        )
        {
            if (zIndex < -1000 || zIndex > 1000)
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.zIndex",
                        "zIndex",
                        "Z-index must be between -1000 and 1000",
                        zIndex
                    )
                );
            }
        }

        return errors;
    }

    private static List<ValidationFailure> ValidateDebugAreaProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // DebugArea doesn't have required properties (label is optional)
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateDebugPointerProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // DebugPointer doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    private static List<ValidationFailure> ValidateShowIfProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationFailure>();

        // condition - required
        if (
            !TryGetStringProperty(node, "condition", out var condition)
            || string.IsNullOrWhiteSpace(condition)
        )
        {
            if (!HasExpressionProperty(node, "condition"))
            {
                errors.Add(
                    CreateFailure(
                        $"{path}.properties.condition",
                        "condition",
                        "ShowIf condition is required",
                        null
                    )
                );
            }
        }
        else if (
            !IsExpression(condition)
            && condition.ToLowerInvariant() != "true"
            && condition.ToLowerInvariant() != "false"
        )
        {
            errors.Add(
                CreateFailure(
                    $"{path}.properties.condition",
                    "condition",
                    "ShowIf condition must be a boolean or expression (e.g., '{{ data.show }}')",
                    condition
                )
            );
        }

        return errors;
    }

    private static List<ValidationFailure> ValidatePreventPageBreakProperties(
        LayoutNodeDto node,
        string path
    )
    {
        // PreventPageBreak doesn't have required properties
        _ = node;
        _ = path;
        return [];
    }

    #endregion

    #region Helper Methods

    private static bool TryGetNumericProperty(
        LayoutNodeDto node,
        string propertyName,
        out float value
    )
    {
        value = 0;
        if (node.Properties == null || !node.Properties.TryGetValue(propertyName, out var element))
            return false;

        if (element.ValueKind == JsonValueKind.Number)
        {
            value = element.GetSingle();
            return true;
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var str = element.GetString();
            if (float.TryParse(str, out value))
                return true;
            // It might be an expression
            return false;
        }

        return false;
    }

    private static bool TryGetStringProperty(
        LayoutNodeDto node,
        string propertyName,
        out string value
    )
    {
        value = string.Empty;
        if (node.Properties == null || !node.Properties.TryGetValue(propertyName, out var element))
            return false;

        if (element.ValueKind == JsonValueKind.String)
        {
            value = element.GetString() ?? string.Empty;
            return true;
        }

        // For non-string values, get raw text
        if (element.ValueKind != JsonValueKind.Undefined && element.ValueKind != JsonValueKind.Null)
        {
            value = element.GetRawText();
            return true;
        }

        return false;
    }

    private static bool HasExpressionProperty(LayoutNodeDto node, string propertyName)
    {
        if (node.Properties == null || !node.Properties.TryGetValue(propertyName, out var element))
            return false;

        if (element.ValueKind == JsonValueKind.String)
        {
            var str = element.GetString();
            return str != null && str.Contains("{{") && str.Contains("}}");
        }

        return false;
    }

    private static bool IsExpression(string? value)
    {
        return !string.IsNullOrEmpty(value) && value.Contains("{{") && value.Contains("}}");
    }

    private static bool IsValidColor(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return false;

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

    private static bool IsLocalPath(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return false;

        // Check for Windows or Unix paths
        return value.Contains(":\\")
            || value.StartsWith("/")
            || value.StartsWith("./")
            || value.StartsWith("../");
    }

    private static ValidationFailure CreateFailure(
        string propertyPath,
        string propertyName,
        string errorMessage,
        object? attemptedValue
    )
    {
        return new ValidationFailure(propertyName, errorMessage)
        {
            ErrorCode = "PROPERTY_VALIDATION_ERROR",
            AttemptedValue = attemptedValue,
            CustomState = new { Path = propertyPath },
        };
    }

    #endregion
}
