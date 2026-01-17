using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using ZXing;
using ZXing.Common;
using ZXing.Rendering;

namespace PDFBuilder.Engine.Renderers.Content;

/// <summary>
/// Renders barcode components using the ZXing.Net library.
/// Supports multiple barcode formats including 1D (Code128, EAN, UPC) and 2D (DataMatrix, Aztec, PDF417) barcodes.
/// </summary>
/// <remarks>
/// QuestPDF Integration: Uses container.Svg() with dynamic size callback for crisp vector rendering.
///
/// Properties:
/// - content (string, required): The data to encode in the barcode. Supports {{ expression }} syntax.
/// - format (string, required): The barcode format. See supported formats below.
///
/// Supported Formats:
/// 1D Industrial:
/// - "CODE_39", "CODE_93", "CODE_128", "CODABAR", "ITF"
///
/// 1D Product:
/// - "UPC_A", "UPC_E", "EAN_8", "EAN_13", "UPC_EAN_EXTENSION"
///
/// 2D:
/// - "QR_CODE", "DATA_MATRIX", "AZTEC", "PDF_417", "MAXICODE"
/// - "RSS_14", "RSS_EXPANDED"
///
/// Sizing:
/// - width (float): Width in points. Default varies by format (200 for 1D, 100 for 2D)
/// - height (float): Height in points. Default varies by format (75 for 1D, 100 for 2D)
///
/// Appearance:
/// - showText (bool): Whether to show the encoded text below the barcode. Default: true (for 1D)
/// - fontName (string): Font for text display. Default: "Helvetica"
/// - fontSize (int): Font size for text display. Default: 14
/// - margin (int): Margin around the barcode in modules. Default: 2
/// - pureBarcode (bool): If true, renders only the barcode without text. Default: false
///
/// Advanced (format-specific):
/// - errorCorrectionLevel (string): For 2D codes, "L", "M", "Q", "H". Default: "M"
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="BarcodeRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class BarcodeRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<BarcodeRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Content = "content";
        public const string Format = "format";
        public const string Width = "width";
        public const string Height = "height";
        public const string ShowText = "showText";
        public const string FontName = "fontName";
        public const string FontSize = "fontSize";
        public const string Margin = "margin";
        public const string PureBarcode = "pureBarcode";
        public const string ErrorCorrectionLevel = "errorCorrectionLevel";
    }

    /// <summary>
    /// Default sizes for different barcode types.
    /// </summary>
    private static class DefaultSizes
    {
        public const float Barcode1DWidth = 200f;
        public const float Barcode1DHeight = 75f;
        public const float Barcode2DWidth = 100f;
        public const float Barcode2DHeight = 100f;
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Barcode;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Content;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => false;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        yield return PropertyNames.Content;
        yield return PropertyNames.Format;
    }

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Get content with expression evaluation
        var content = EvaluateStringProperty(node, PropertyNames.Content, context);
        var formatStr = EvaluateStringProperty(node, PropertyNames.Format, context);

        if (string.IsNullOrWhiteSpace(content))
        {
            Logger.LogWarning("Barcode node {NodeId} has no content", node.Id ?? "unnamed");
            RenderPlaceholder(container, "No barcode content");
            return;
        }

        if (string.IsNullOrWhiteSpace(formatStr))
        {
            Logger.LogWarning(
                "Barcode node {NodeId} has no format specified",
                node.Id ?? "unnamed"
            );
            RenderPlaceholder(container, "No barcode format");
            return;
        }

        // Parse barcode format
        if (!TryParseBarcodeFormat(formatStr, out var barcodeFormat))
        {
            Logger.LogWarning(
                "Invalid barcode format {Format} for node {NodeId}",
                formatStr,
                node.Id ?? "unnamed"
            );
            RenderPlaceholder(container, $"Invalid format: {formatStr}");
            return;
        }

        Logger.LogTrace(
            "Generating {Format} barcode for content: {Content}",
            barcodeFormat,
            content.Length > 50 ? content[..50] + "..." : content
        );

        // Determine if this is a 2D barcode
        var is2D = Is2DBarcode(barcodeFormat);

        // Get sizing properties with appropriate defaults
        var defaultWidth = is2D ? DefaultSizes.Barcode2DWidth : DefaultSizes.Barcode1DWidth;
        var defaultHeight = is2D ? DefaultSizes.Barcode2DHeight : DefaultSizes.Barcode1DHeight;

        var width =
            EvaluateFloatProperty(node, PropertyNames.Width, context, defaultWidth) ?? defaultWidth;
        var height =
            EvaluateFloatProperty(node, PropertyNames.Height, context, defaultHeight)
            ?? defaultHeight;

        // Get appearance properties
        var showText = EvaluateBoolProperty(node, PropertyNames.ShowText, context, !is2D) ?? !is2D;
        var fontName =
            EvaluateStringProperty(node, PropertyNames.FontName, context, "Helvetica")
            ?? "Helvetica";
        var fontSize = EvaluateIntProperty(node, PropertyNames.FontSize, context, 14) ?? 14;
        var margin = EvaluateIntProperty(node, PropertyNames.Margin, context, 2) ?? 2;
        var pureBarcode =
            EvaluateBoolProperty(node, PropertyNames.PureBarcode, context, false) ?? false;

        try
        {
            // Use QuestPDF's SVG dynamic rendering for crisp vector output
            container
                .Width(width)
                .Height(height)
                .Svg(size =>
                {
                    return GenerateBarcodeSvg(
                        content,
                        barcodeFormat,
                        (int)size.Width,
                        (int)size.Height,
                        showText && !pureBarcode,
                        fontName,
                        fontSize,
                        margin
                    );
                });
        }
        catch (Exception ex)
        {
            Logger.LogError(
                ex,
                "Failed to generate barcode for node {NodeId}: {Message}",
                node.Id ?? "unnamed",
                ex.Message
            );
            RenderPlaceholder(container, "Barcode error");
        }
    }

    /// <summary>
    /// Generates a barcode as SVG string.
    /// </summary>
    private string GenerateBarcodeSvg(
        string content,
        BarcodeFormat format,
        int width,
        int height,
        bool showText,
        string fontName,
        int fontSize,
        int margin
    )
    {
        try
        {
            // Use the multi-format writer which handles all barcode types
            var writer = new ZXing.BarcodeWriterGeneric
            {
                Format = format,
                Options = new EncodingOptions
                {
                    Width = width,
                    Height = height,
                    Margin = margin,
                    PureBarcode = !showText,
                },
            };

            // Encode the barcode to a BitMatrix
            var matrix = writer.Encode(content);

            // Render to SVG using the SvgRenderer
            var renderer = new SvgRenderer { FontName = fontName, FontSize = fontSize };

            var svgImage = renderer.Render(matrix, format, showText ? content : null);
            return svgImage.Content;
        }
        catch (Exception ex)
        {
            Logger.LogError(
                ex,
                "Error generating SVG for barcode format {Format}: {Message}",
                format,
                ex.Message
            );
            // Return a simple error SVG
            return GenerateErrorSvg(width, height, ex.Message);
        }
    }

    /// <summary>
    /// Determines if a barcode format is 2D.
    /// </summary>
    private static bool Is2DBarcode(BarcodeFormat format)
    {
        return format switch
        {
            BarcodeFormat.QR_CODE => true,
            BarcodeFormat.DATA_MATRIX => true,
            BarcodeFormat.AZTEC => true,
            BarcodeFormat.PDF_417 => true,
            BarcodeFormat.MAXICODE => true,
            _ => false,
        };
    }

    /// <summary>
    /// Attempts to parse a string to a BarcodeFormat.
    /// </summary>
    private static bool TryParseBarcodeFormat(string formatStr, out BarcodeFormat format)
    {
        // Normalize the format string
        var normalized = formatStr.ToUpperInvariant().Replace("-", "_").Replace(" ", "_");

        // Handle common aliases
        normalized = normalized switch
        {
            "CODE128" => "CODE_128",
            "CODE39" => "CODE_39",
            "CODE93" => "CODE_93",
            "EAN8" => "EAN_8",
            "EAN13" => "EAN_13",
            "UPCA" => "UPC_A",
            "UPCE" => "UPC_E",
            "QR" => "QR_CODE",
            "QRCODE" => "QR_CODE",
            "DATAMATRIX" => "DATA_MATRIX",
            "PDF417" => "PDF_417",
            _ => normalized,
        };

        return Enum.TryParse(normalized, ignoreCase: true, out format);
    }

    /// <summary>
    /// Generates an error SVG placeholder.
    /// </summary>
    private static string GenerateErrorSvg(int width, int height, string message)
    {
        // Truncate message to fit
        var displayMessage = message.Length > 30 ? message[..27] + "..." : message;
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" width=""{width}"" height=""{height}"" viewBox=""0 0 {width} {height}"">
            <rect width=""100%"" height=""100%"" fill=""#F0F0F0""/>
            <text x=""50%"" y=""50%"" dominant-baseline=""middle"" text-anchor=""middle"" font-family=""sans-serif"" font-size=""12"" fill=""#666666"">
                Barcode Error
            </text>
            <text x=""50%"" y=""65%"" dominant-baseline=""middle"" text-anchor=""middle"" font-family=""sans-serif"" font-size=""10"" fill=""#999999"">
                {System.Security.SecurityElement.Escape(displayMessage)}
            </text>
        </svg>";
    }

    /// <summary>
    /// Renders a placeholder when barcode generation fails.
    /// </summary>
    private static void RenderPlaceholder(IContainer container, string message)
    {
        container
            .Width(200)
            .Height(75)
            .Background("#F0F0F0")
            .AlignCenter()
            .AlignMiddle()
            .Text(message)
            .FontSize(10)
            .FontColor("#666666");
    }
}
