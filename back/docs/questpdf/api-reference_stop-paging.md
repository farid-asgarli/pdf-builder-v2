# API Reference: Stop Paging

Renders the element exclusively on the first page. Any portion of the element that doesn't fit is omitted.

> **TIP:** If your goal is to limit the content to a specific area, please consider using other approaches: [Text Clamp Lines](/api-reference/text/paragraph-style.html#clamp-line-with-ellipsis) and [Scale to Fit](/api-reference/scale-to-fit.html).

## Example

```c#
const string bookDescription = "\"Master Modern C# Development\" is a comprehensive guide that takes you from the basics to advanced concepts in C# programming. Perfect for beginners and intermediate developers looking to enhance their skills with practical examples and real-world applications. Covering object-oriented programming, LINQ, asynchronous programming, and the latest .NET features, this book provides step-by-step explanations to help you write clean, efficient, and scalable code. Whether you're building desktop, web, or cloud applications, this resource equips you with the knowledge and best practices to become a confident C# developer.";

container
    .Width(400)
    .Height(300)
    .StopPaging()
    .Decoration(decoration =>
    {
        decoration.Before().Text("Book description:").Bold();
        decoration.Content().Text(bookDescription);
    });
```

### Without StopPaging

Unable to display PDF file. [Download](/api-reference/stop-paging-disabled.pdf) instead.

### With StopPaging

Unable to display PDF file. [Download](/api-reference/stop-paging-enabled.pdf) instead.