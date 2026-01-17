using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Transformation;

/// <summary>
/// Renders a Rotate wrapper component that applies rotation transformation to its child content.
/// Supports both constrained 90-degree rotations and free-form arbitrary angle rotations.
/// </summary>
/// <remarks>
/// QuestPDF Rotate API:
/// - RotateLeft() - Rotates content 90 degrees counterclockwise.
/// - RotateRight() - Rotates content 90 degrees clockwise.
/// - Rotate(angle) - Rotates content clockwise by a given angle (in degrees).
///
/// Properties:
/// - angle (float): The rotation angle in degrees. Positive values rotate clockwise.
/// - type (string): The rotation type: "free" (default), "left" (90° CCW), or "right" (90° CW).
///
/// Note: When using constrained rotation (left/right), the dimensional behavior changes.
/// What was previously width may become height and vice versa. This affects how other
/// properties like alignment and padding work on the rotated element.
///
/// For arbitrary angles, content is rotated around its center. You may need to use
/// Translate to adjust positioning after rotation.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="RotateRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class RotateRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<RotateRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Angle = "angle";
        public const string Type = "type";
    }

    /// <summary>
    /// Rotation type options.
    /// </summary>
    private enum RotationType
    {
        /// <summary>
        /// Free rotation by arbitrary angle.
        /// </summary>
        Free,

        /// <summary>
        /// Constrained 90° counterclockwise rotation.
        /// </summary>
        Left,

        /// <summary>
        /// Constrained 90° clockwise rotation.
        /// </summary>
        Right,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Rotate;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Transformation;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // No required properties - defaults to 0 degrees if no angle specified
        yield break;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.Angle, 0f },
            { PropertyNames.Type, "free" },
        };
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
        // Extract rotation properties with expression evaluation
        var rotationType = EvaluateEnumProperty(
            node,
            PropertyNames.Type,
            context,
            RotationType.Free
        );
        var angle = EvaluateFloatProperty(node, PropertyNames.Angle, context, 0f) ?? 0f;

        Logger.LogTrace("Rendering Rotate with type={Type}, angle={Angle}°", rotationType, angle);

        // Apply rotation based on type
        IContainer rotatedContainer = rotationType switch
        {
            RotationType.Left => container.RotateLeft(),
            RotationType.Right => container.RotateRight(),
            RotationType.Free => ApplyFreeRotation(container, angle),
            _ => container.Rotate(angle),
        };

        // Render the child content
        RenderChild(rotatedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies free-form rotation with support for common angles.
    /// </summary>
    /// <param name="container">The container to rotate.</param>
    /// <param name="angle">The rotation angle in degrees.</param>
    /// <returns>The rotated container.</returns>
    private static IContainer ApplyFreeRotation(IContainer container, float angle)
    {
        // Normalize angle to 0-360 range
        var normalizedAngle = ((angle % 360) + 360) % 360;

        // For 0 degrees, no rotation needed
        if (Math.Abs(normalizedAngle) < 0.001f)
        {
            return container;
        }

        // Use constrained rotation for exact 90° increments (better performance)
        return normalizedAngle switch
        {
            90f => container.RotateRight(),
            180f => container.RotateRight().RotateRight(),
            270f => container.RotateLeft(),
            _ => container.Rotate(angle),
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate type is valid
        var type = node.GetStringProperty(PropertyNames.Type);
        if (type is not null && !Enum.TryParse<RotationType>(type, ignoreCase: true, out _))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Type,
                    Message =
                        $"Invalid rotation type: '{type}'. Valid values are: free, left, right",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate angle if specified
        var angle = node.GetFloatProperty(PropertyNames.Angle);
        if (angle is not null && (float.IsNaN(angle.Value) || float.IsInfinity(angle.Value)))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Angle,
                    Message = "Rotation angle must be a valid number",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        return errors;
    }
}
