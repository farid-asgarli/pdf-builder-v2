using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QRCoder;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Content;

/// <summary>
/// Renders QR code components using the QRCoder library.
/// Generates QR codes as images that can be embedded in PDF documents.
/// </summary>
/// <remarks>
/// QuestPDF Integration: Uses container.Image() to render the generated QR code bytes.
///
/// Properties:
/// - content (string, required): The data to encode in the QR code. Supports {{ expression }} syntax.
///   Common uses: URLs, text, vCard data, WiFi credentials, etc.
///
/// QR Code Configuration:
/// - eccLevel (string): Error Correction Level - "L" (7%), "M" (15%), "Q" (25%), "H" (30%). Default: "M"
/// - size (float): The size (width/height) of the QR code in points. Default: 100
/// - pixelsPerModule (int): Pixels per QR code module. Higher = larger image. Default: 10
/// - darkColor (string): Color for dark modules in hex format. Default: "#000000"
/// - lightColor (string): Color for light modules in hex format. Default: "#FFFFFF"
/// - drawQuietZones (bool): Whether to include quiet zones (margins). Default: true
///
/// Advanced:
/// - forceUtf8 (bool): Force UTF-8 encoding. Default: false
/// - utf8BOM (bool): Include UTF-8 BOM. Default: false
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="QRCodeRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class QRCodeRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<QRCodeRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Content = "content";
        public const string EccLevel = "eccLevel";
        public const string Size = "size";
        public const string PixelsPerModule = "pixelsPerModule";
        public const string DarkColor = "darkColor";
        public const string LightColor = "lightColor";
        public const string DrawQuietZones = "drawQuietZones";
        public const string ForceUtf8 = "forceUtf8";
        public const string Utf8BOM = "utf8BOM";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.QRCode;

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

        if (string.IsNullOrWhiteSpace(content))
        {
            Logger.LogWarning("QR code node {NodeId} has no content", node.Id ?? "unnamed");
            RenderPlaceholder(container, "No QR content");
            return;
        }

        Logger.LogTrace(
            "Generating QR code for content: {Content}",
            content.Length > 50 ? content[..50] + "..." : content
        );

        // Get configuration properties
        var eccLevelStr = EvaluateStringProperty(node, PropertyNames.EccLevel, context, "M") ?? "M";
        var size = EvaluateFloatProperty(node, PropertyNames.Size, context, 100f) ?? 100f;
        var pixelsPerModule =
            EvaluateIntProperty(node, PropertyNames.PixelsPerModule, context, 10) ?? 10;
        var darkColorHex =
            EvaluateStringProperty(node, PropertyNames.DarkColor, context, "#000000") ?? "#000000";
        var lightColorHex =
            EvaluateStringProperty(node, PropertyNames.LightColor, context, "#FFFFFF") ?? "#FFFFFF";
        var drawQuietZones =
            EvaluateBoolProperty(node, PropertyNames.DrawQuietZones, context, true) ?? true;
        var forceUtf8 =
            EvaluateBoolProperty(node, PropertyNames.ForceUtf8, context, false) ?? false;
        var utf8BOM = EvaluateBoolProperty(node, PropertyNames.Utf8BOM, context, false) ?? false;

        // Parse ECC level
        var eccLevel = ParseEccLevel(eccLevelStr);

        // Parse colors
        var darkColor = ParseColorToBytes(darkColorHex);
        var lightColor = ParseColorToBytes(lightColorHex);

        try
        {
            // Generate the QR code
            var qrCodeBytes = GenerateQrCode(
                content,
                eccLevel,
                pixelsPerModule,
                darkColor,
                lightColor,
                drawQuietZones,
                forceUtf8,
                utf8BOM
            );

            if (qrCodeBytes is null || qrCodeBytes.Length == 0)
            {
                Logger.LogWarning(
                    "QR code generation returned empty data for node {NodeId}",
                    node.Id ?? "unnamed"
                );
                RenderPlaceholder(container, "QR generation failed");
                return;
            }

            // Render the QR code image
            container.Width(size).Height(size).Image(qrCodeBytes).FitArea();
        }
        catch (Exception ex)
        {
            Logger.LogError(
                ex,
                "Failed to generate QR code for node {NodeId}",
                node.Id ?? "unnamed"
            );
            RenderPlaceholder(container, "QR error");
        }
    }

    /// <summary>
    /// Generates a QR code as PNG bytes.
    /// </summary>
    private static byte[] GenerateQrCode(
        string content,
        QRCodeGenerator.ECCLevel eccLevel,
        int pixelsPerModule,
        byte[] darkColor,
        byte[] lightColor,
        bool drawQuietZones,
        bool forceUtf8,
        bool utf8BOM
    )
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(content, eccLevel, forceUtf8, utf8BOM);
        using var qrCode = new PngByteQRCode(qrCodeData);

        return qrCode.GetGraphic(pixelsPerModule, darkColor, lightColor, drawQuietZones);
    }

    /// <summary>
    /// Parses the error correction level from a string.
    /// </summary>
    private static QRCodeGenerator.ECCLevel ParseEccLevel(string level)
    {
        return level.ToUpperInvariant() switch
        {
            "L" => QRCodeGenerator.ECCLevel.L, // 7% recovery
            "M" => QRCodeGenerator.ECCLevel.M, // 15% recovery
            "Q" => QRCodeGenerator.ECCLevel.Q, // 25% recovery
            "H" => QRCodeGenerator.ECCLevel.H, // 30% recovery
            _ => QRCodeGenerator.ECCLevel.M, // Default to medium
        };
    }

    /// <summary>
    /// Parses a hex color string to RGB bytes.
    /// </summary>
    private byte[] ParseColorToBytes(string hexColor)
    {
        try
        {
            var color = hexColor.TrimStart('#');

            // Handle shorthand notation (e.g., #FFF)
            if (color.Length == 3)
            {
                color = $"{color[0]}{color[0]}{color[1]}{color[1]}{color[2]}{color[2]}";
            }

            if (color.Length >= 6)
            {
                var r = Convert.ToByte(color[..2], 16);
                var g = Convert.ToByte(color[2..4], 16);
                var b = Convert.ToByte(color[4..6], 16);
                return [r, g, b];
            }
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to parse color {Color}, using default", hexColor);
        }

        // Default to black
        return [0, 0, 0];
    }

    /// <summary>
    /// Renders a placeholder when QR code generation fails.
    /// </summary>
    private static void RenderPlaceholder(IContainer container, string message)
    {
        container
            .Width(100)
            .Height(100)
            .Background("#F0F0F0")
            .AlignCenter()
            .AlignMiddle()
            .Text(message)
            .FontSize(10)
            .FontColor("#666666");
    }
}
