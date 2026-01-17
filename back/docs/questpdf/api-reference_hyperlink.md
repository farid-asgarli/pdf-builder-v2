# API Reference: Hyperlink

The Hyperlink element creates a clickable area that redirects the user to a designated webpage.

### Content

Hyperlink can span any content, including text, images, or other elements.

```c#
.Column(column =>
{
    column.Spacing(25);
    
    column.Item()
        .Text("Clicking the NuGet logo will redirect you to the NuGet website.");

    column.Item()
        .Width(150)
        .Hyperlink("https://www.nuget.org/")
        .Svg("Resources/nuget-logo.svg");
});
```

Unable to display PDF file. [Download](/api-reference/hyperlink-element.pdf) instead.

### Inside text

Hyperlinks can also be placed inside text elements.

```c#
container
    .Text(text =>
    {
        text.Span("Click ");
        text.Hyperlink("here", "https://www.nuget.org/").Underline().FontColor(Colors.Blue.Darken2);
        text.Span(" to visit the official NuGet website.");
    });
```

Unable to display PDF file. [Download](/api-reference/hyperlink-text.pdf) instead.