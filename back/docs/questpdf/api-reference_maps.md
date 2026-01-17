# API Reference: Maps

QuestPDF provides seamless integration with Mapbox Static Maps API, allowing you to embed high-quality, customizable maps into your PDF documents. This integration offers a reliable and efficient way to include geographical visualizations in your reports, documents, or any PDF output.

> **INFO:** This section provides examples of how to integrate the Mapbox service with QuestPDF. This service is paid but provides a generous free tier, including commercial usage.

The code below presents a simple helper class that fetches a map image based on the provided coordinates, zoom level, and dimensions.

```c#
static class MapboxStaticMapRenderer
{
    private const string MapboxBaseUrl = "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static";
    private const string AccessToken = "pk.eyJ1IjoibWFyY2luLXppYWJlayIsImEiOiJjbTc5cHZkZTUwNmM4MmxxdGN2cnRxMTBpIn0.8G-_nwFqjjfNQUCmHSOqKw";

    public static async Task<byte[]?> FetchStaticMapAsync(double longitude, double latitude, float zoom, int width, int height)
    {
        var longitudeString = longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var latitudeString = latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var url = $"{MapboxBaseUrl}/{longitudeString},{latitudeString},{zoom},0,0/{width}x{height}@2x?access_token={AccessToken}";

        using var client = new HttpClient();
        
        try
        {
            var response = await client.GetAsync(url);
            return await response.Content.ReadAsByteArrayAsync();
        }
        catch (Exception ex)
        {
            return null;
        }
    }
}
```

You can use the helper class implemented above to fetch a map image and embed it in your document.

```c#
var map = await MapboxStaticMapRenderer.FetchStaticMapAsync(19.9376052f, 50.0616087f, 10, 500, 400);

Document
    .Create(document =>
    {
        document.Page(page =>
        {
            page.ContinuousSize(550);
            page.Margin(25);

            page.Content()
                .Column(column =>
                {
                    column.Item().Text("Map of Kraków").FontSize(20).Bold();
                    column.Item().Text("Capital of Lesser Poland Voivodeship").FontSize(16).Light();
                    column.Item().Height(15);

                    column.Item()
                        .Background(Colors.Grey.Lighten3)
                        .ShowIf(map != null)
                        .Image(map);
                });
        });
    })
    .GeneratePdf("map.pdf");
```

![example](/api-reference/map.webp)

> **WARNING:** Always fetch the map before starting PDF generation. The map retrieval is an asynchronous operation and should not be performed during document generation.