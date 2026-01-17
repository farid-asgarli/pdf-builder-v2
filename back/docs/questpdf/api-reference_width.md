# API Reference: Width

Use this element to control the horizontal size of its content.

| Method | Description |
| --- | --- |
| Width | Sets the exact width of its content. |
| MinWidth | Sets the minimum width of its content. |
| MaxWidth | Sets the maximum width of its content. |

## Example

The following example shows how text content adjusts to the specified width constraints.

```c#
container
    .Width(300)
    .Padding(25)
    .Column(column =>
    {
        column.Spacing(25);
        
        column.Item()
            .MinWidth(200)
            .Background(Colors.Grey.Lighten3)
            .Text("Lorem ipsum");
        
        column.Item()
            .MaxWidth(100)
            .Background(Colors.Grey.Lighten3)
            .Text("dolor sit amet");
    });
```

![example](/api-reference/width.webp)

> **DANGER:** Please be careful. This component may try to enforce size constraints that are impossible to meet. For example, the container may require more space than is available, or may try to squeeze its child into less space than possible. Such scenarios result in a layout exception.