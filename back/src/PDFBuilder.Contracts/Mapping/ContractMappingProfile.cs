using AutoMapper;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Core.Domain;

namespace PDFBuilder.Contracts.Mapping;

/// <summary>
/// AutoMapper profile for mapping between domain entities and DTOs.
/// </summary>
public class ContractMappingProfile : Profile
{
    /// <summary>
    /// Initializes a new instance of the ContractMappingProfile class.
    /// </summary>
    public ContractMappingProfile()
    {
        // LayoutNode <-> LayoutNodeDto
        CreateLayoutNodeMappings();

        // StyleProperties <-> StylePropertiesDto
        CreateStylePropertiesMappings();

        // Template <-> TemplateDto
        CreateTemplateMappings();

        // PageSettings <-> PageSettingsDto
        CreatePageSettingsMappings();

        // TemplateLayout <-> TemplateLayoutDto
        CreateTemplateLayoutMappings();
    }

    private void CreateLayoutNodeMappings()
    {
        // Domain -> DTO
        CreateMap<LayoutNode, LayoutNodeDto>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()))
            .ForMember(dest => dest.Style, opt => opt.MapFrom(src => src.Style))
            .ForMember(dest => dest.Children, opt => opt.MapFrom(src => src.Children))
            .ForMember(dest => dest.Child, opt => opt.MapFrom(src => src.Child));

        // DTO -> Domain
        CreateMap<LayoutNodeDto, LayoutNode>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom<ComponentTypeResolver>())
            .ForMember(dest => dest.Style, opt => opt.MapFrom(src => src.Style))
            .ForMember(dest => dest.Children, opt => opt.MapFrom(src => src.Children))
            .ForMember(dest => dest.Child, opt => opt.MapFrom(src => src.Child));
    }

    private void CreateStylePropertiesMappings()
    {
        // Domain -> DTO
        CreateMap<StyleProperties, StylePropertiesDto>()
            .ForMember(
                dest => dest.FontWeight,
                opt =>
                    opt.MapFrom(src =>
                        src.FontWeight.HasValue ? src.FontWeight.Value.ToString() : null
                    )
            )
            .ForMember(
                dest => dest.FontStyle,
                opt =>
                    opt.MapFrom(src =>
                        src.FontStyle.HasValue ? src.FontStyle.Value.ToString() : null
                    )
            )
            .ForMember(
                dest => dest.TextDecoration,
                opt =>
                    opt.MapFrom(src =>
                        src.TextDecoration.HasValue ? src.TextDecoration.Value.ToString() : null
                    )
            )
            .ForMember(
                dest => dest.TextAlignment,
                opt =>
                    opt.MapFrom(src =>
                        src.TextAlignment.HasValue ? src.TextAlignment.Value.ToString() : null
                    )
            )
            .ForMember(
                dest => dest.HorizontalAlignment,
                opt =>
                    opt.MapFrom(src =>
                        src.HorizontalAlignment.HasValue
                            ? src.HorizontalAlignment.Value.ToString()
                            : null
                    )
            )
            .ForMember(
                dest => dest.VerticalAlignment,
                opt =>
                    opt.MapFrom(src =>
                        src.VerticalAlignment.HasValue
                            ? src.VerticalAlignment.Value.ToString()
                            : null
                    )
            );

        // DTO -> Domain
        CreateMap<StylePropertiesDto, StyleProperties>()
            .ForMember(dest => dest.FontWeight, opt => opt.MapFrom<FontWeightResolver>())
            .ForMember(dest => dest.FontStyle, opt => opt.MapFrom<FontStyleResolver>())
            .ForMember(dest => dest.TextDecoration, opt => opt.MapFrom<TextDecorationResolver>())
            .ForMember(dest => dest.TextAlignment, opt => opt.MapFrom<TextAlignmentResolver>())
            .ForMember(
                dest => dest.HorizontalAlignment,
                opt => opt.MapFrom<HorizontalAlignmentResolver>()
            )
            .ForMember(
                dest => dest.VerticalAlignment,
                opt => opt.MapFrom<VerticalAlignmentResolver>()
            );
    }

    private void CreateTemplateMappings()
    {
        // Domain -> DTO
        CreateMap<Template, TemplateDto>()
            .ForMember(dest => dest.Layout, opt => opt.Ignore()) // Layout requires JSON deserialization
            .ForMember(dest => dest.Metadata, opt => opt.Ignore()); // Metadata requires JSON deserialization

        // Domain -> Summary DTO
        CreateMap<Template, TemplateSummaryDto>();

        // DTO -> Domain
        CreateMap<TemplateDto, Template>()
            .ForMember(dest => dest.LayoutJson, opt => opt.Ignore()) // Requires serialization
            .ForMember(dest => dest.MetadataJson, opt => opt.Ignore()); // Requires serialization
    }

    private void CreatePageSettingsMappings()
    {
        // Domain -> DTO
        CreateMap<PageSettings, PageSettingsDto>()
            .ForMember(
                dest => dest.Orientation,
                opt => opt.MapFrom(src => src.Orientation.ToString())
            )
            .ForMember(
                dest => dest.ContentDirection,
                opt =>
                    opt.MapFrom(src =>
                        src.ContentDirection == ContentDirection.RightToLeft ? "RTL" : "LTR"
                    )
            )
            .ForMember(
                dest => dest.ContinuousMode,
                opt => opt.MapFrom(src => src.ContinuousMode ? true : (bool?)null)
            );

        // DTO -> Domain
        CreateMap<PageSettingsDto, PageSettings>()
            .ForMember(dest => dest.Orientation, opt => opt.MapFrom<PageOrientationResolver>())
            .ForMember(
                dest => dest.ContentDirection,
                opt => opt.MapFrom<ContentDirectionResolver>()
            )
            .ForMember(
                dest => dest.ContinuousMode,
                opt => opt.MapFrom(src => src.ContinuousMode ?? false)
            );
    }

    private void CreateTemplateLayoutMappings()
    {
        // Domain -> DTO
        CreateMap<TemplateLayout, TemplateLayoutDto>()
            .ForMember(dest => dest.PageSettings, opt => opt.MapFrom(src => src.PageSettings))
            .ForMember(dest => dest.Header, opt => opt.MapFrom(src => src.Header))
            .ForMember(dest => dest.Content, opt => opt.MapFrom(src => src.Content))
            .ForMember(dest => dest.Footer, opt => opt.MapFrom(src => src.Footer))
            .ForMember(dest => dest.Background, opt => opt.MapFrom(src => src.Background))
            .ForMember(dest => dest.Foreground, opt => opt.MapFrom(src => src.Foreground));

        // DTO -> Domain
        CreateMap<TemplateLayoutDto, TemplateLayout>()
            .ForMember(
                dest => dest.PageSettings,
                opt => opt.MapFrom(src => src.PageSettings ?? new PageSettingsDto())
            )
            .ForMember(dest => dest.Header, opt => opt.MapFrom(src => src.Header))
            .ForMember(dest => dest.Content, opt => opt.MapFrom(src => src.Content))
            .ForMember(dest => dest.Footer, opt => opt.MapFrom(src => src.Footer))
            .ForMember(dest => dest.Background, opt => opt.MapFrom(src => src.Background))
            .ForMember(dest => dest.Foreground, opt => opt.MapFrom(src => src.Foreground));
    }
}

/// <summary>
/// Resolver for converting string type to ComponentType enum.
/// </summary>
public class ComponentTypeResolver : IValueResolver<LayoutNodeDto, LayoutNode, ComponentType>
{
    /// <summary>
    /// Resolves the component type from string to enum.
    /// </summary>
    public ComponentType Resolve(
        LayoutNodeDto source,
        LayoutNode destination,
        ComponentType destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.Type))
        {
            return ComponentType.Column; // Default
        }

        if (Enum.TryParse<ComponentType>(source.Type, ignoreCase: true, out var result))
        {
            return result;
        }

        throw new AutoMapperMappingException($"Unknown component type: '{source.Type}'");
    }
}

/// <summary>
/// Resolver for converting string to FontWeight enum.
/// </summary>
public class FontWeightResolver : IValueResolver<StylePropertiesDto, StyleProperties, FontWeight?>
{
    /// <summary>
    /// Resolves the font weight from string to enum.
    /// </summary>
    public FontWeight? Resolve(
        StylePropertiesDto source,
        StyleProperties destination,
        FontWeight? destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.FontWeight))
        {
            return null;
        }

        if (Enum.TryParse<FontWeight>(source.FontWeight, ignoreCase: true, out var result))
        {
            return result;
        }

        return null;
    }
}

/// <summary>
/// Resolver for converting string to FontStyle enum.
/// </summary>
public class FontStyleResolver : IValueResolver<StylePropertiesDto, StyleProperties, FontStyle?>
{
    /// <summary>
    /// Resolves the font style from string to enum.
    /// </summary>
    public FontStyle? Resolve(
        StylePropertiesDto source,
        StyleProperties destination,
        FontStyle? destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.FontStyle))
        {
            return null;
        }

        if (Enum.TryParse<FontStyle>(source.FontStyle, ignoreCase: true, out var result))
        {
            return result;
        }

        return null;
    }
}

/// <summary>
/// Resolver for converting string to TextDecoration enum.
/// </summary>
public class TextDecorationResolver
    : IValueResolver<StylePropertiesDto, StyleProperties, TextDecoration?>
{
    /// <summary>
    /// Resolves the text decoration from string to enum.
    /// </summary>
    public TextDecoration? Resolve(
        StylePropertiesDto source,
        StyleProperties destination,
        TextDecoration? destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.TextDecoration))
        {
            return null;
        }

        if (Enum.TryParse<TextDecoration>(source.TextDecoration, ignoreCase: true, out var result))
        {
            return result;
        }

        return null;
    }
}

/// <summary>
/// Resolver for converting string to TextAlignment enum.
/// </summary>
public class TextAlignmentResolver
    : IValueResolver<StylePropertiesDto, StyleProperties, TextAlignment?>
{
    /// <summary>
    /// Resolves the text alignment from string to enum.
    /// </summary>
    public TextAlignment? Resolve(
        StylePropertiesDto source,
        StyleProperties destination,
        TextAlignment? destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.TextAlignment))
        {
            return null;
        }

        if (Enum.TryParse<TextAlignment>(source.TextAlignment, ignoreCase: true, out var result))
        {
            return result;
        }

        return null;
    }
}

/// <summary>
/// Resolver for converting string to HorizontalAlignment enum.
/// </summary>
public class HorizontalAlignmentResolver
    : IValueResolver<StylePropertiesDto, StyleProperties, HorizontalAlignment?>
{
    /// <summary>
    /// Resolves the horizontal alignment from string to enum.
    /// </summary>
    public HorizontalAlignment? Resolve(
        StylePropertiesDto source,
        StyleProperties destination,
        HorizontalAlignment? destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.HorizontalAlignment))
        {
            return null;
        }

        if (
            Enum.TryParse<HorizontalAlignment>(
                source.HorizontalAlignment,
                ignoreCase: true,
                out var result
            )
        )
        {
            return result;
        }

        return null;
    }
}

/// <summary>
/// Resolver for converting string to VerticalAlignment enum.
/// </summary>
public class VerticalAlignmentResolver
    : IValueResolver<StylePropertiesDto, StyleProperties, VerticalAlignment?>
{
    /// <summary>
    /// Resolves the vertical alignment from string to enum.
    /// </summary>
    public VerticalAlignment? Resolve(
        StylePropertiesDto source,
        StyleProperties destination,
        VerticalAlignment? destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.VerticalAlignment))
        {
            return null;
        }

        if (
            Enum.TryParse<VerticalAlignment>(
                source.VerticalAlignment,
                ignoreCase: true,
                out var result
            )
        )
        {
            return result;
        }

        return null;
    }
}

/// <summary>
/// Resolver for converting string to PageOrientation enum.
/// </summary>
public class PageOrientationResolver
    : IValueResolver<PageSettingsDto, PageSettings, PageOrientation>
{
    /// <summary>
    /// Resolves the page orientation from string to enum.
    /// </summary>
    public PageOrientation Resolve(
        PageSettingsDto source,
        PageSettings destination,
        PageOrientation destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.Orientation))
        {
            return PageOrientation.Portrait; // Default
        }

        if (Enum.TryParse<PageOrientation>(source.Orientation, ignoreCase: true, out var result))
        {
            return result;
        }

        return PageOrientation.Portrait;
    }
}

/// <summary>
/// Resolver for converting string to ContentDirection enum.
/// </summary>
public class ContentDirectionResolver
    : IValueResolver<PageSettingsDto, PageSettings, ContentDirection>
{
    /// <summary>
    /// Resolves the content direction from string to enum.
    /// </summary>
    public ContentDirection Resolve(
        PageSettingsDto source,
        PageSettings destination,
        ContentDirection destMember,
        ResolutionContext context
    )
    {
        if (string.IsNullOrWhiteSpace(source.ContentDirection))
        {
            return ContentDirection.LeftToRight; // Default
        }

        return source.ContentDirection.Equals("RTL", StringComparison.OrdinalIgnoreCase)
            ? ContentDirection.RightToLeft
            : ContentDirection.LeftToRight;
    }
}
