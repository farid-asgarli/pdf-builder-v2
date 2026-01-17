namespace PDFBuilder.TestUtilities.Fixtures;

/// <summary>
/// Sample layout JSON fixtures for testing.
/// </summary>
public static class SampleLayouts
{
    /// <summary>
    /// Gets a minimal valid layout with a single text element.
    /// </summary>
    public static string MinimalLayout =>
        """
            {
                "type": "Column",
                "children": [
                    {
                        "type": "Text",
                        "properties": {
                            "content": "Hello, World!"
                        }
                    }
                ]
            }
            """;

    /// <summary>
    /// Gets a simple layout with row and column containers.
    /// </summary>
    public static string SimpleRowColumnLayout =>
        """
            {
                "type": "Column",
                "properties": {
                    "spacing": 10
                },
                "children": [
                    {
                        "type": "Row",
                        "properties": {
                            "spacing": 5
                        },
                        "children": [
                            {
                                "type": "Text",
                                "properties": {
                                    "content": "Left Column"
                                }
                            },
                            {
                                "type": "Text",
                                "properties": {
                                    "content": "Right Column"
                                }
                            }
                        ]
                    }
                ]
            }
            """;

    /// <summary>
    /// Gets a layout with expression placeholders.
    /// </summary>
    public static string LayoutWithExpressions =>
        """
            {
                "type": "Column",
                "children": [
                    {
                        "type": "Text",
                        "properties": {
                            "content": "Customer: {{ data.customerName }}"
                        }
                    },
                    {
                        "type": "Text",
                        "properties": {
                            "content": "Total: {{ data.totalAmount.ToString(\"C\") }}"
                        }
                    }
                ]
            }
            """;

    /// <summary>
    /// Gets a layout with styling properties.
    /// </summary>
    public static string StyledLayout =>
        """
            {
                "type": "Column",
                "properties": {
                    "spacing": 20
                },
                "children": [
                    {
                        "type": "Padding",
                        "properties": {
                            "all": 10
                        },
                        "children": [
                            {
                                "type": "Background",
                                "properties": {
                                    "color": "#f5f5f5"
                                },
                                "children": [
                                    {
                                        "type": "Border",
                                        "properties": {
                                            "thickness": 1,
                                            "color": "#cccccc"
                                        },
                                        "children": [
                                            {
                                                "type": "Text",
                                                "properties": {
                                                    "content": "Styled Text",
                                                    "fontSize": 16,
                                                    "fontWeight": "Bold"
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
            """;

    /// <summary>
    /// Gets a complex table layout.
    /// </summary>
    public static string TableLayout =>
        """
            {
                "type": "Table",
                "properties": {
                    "columns": [
                        { "width": "1*" },
                        { "width": "2*" },
                        { "width": "1*" }
                    ]
                },
                "children": [
                    {
                        "type": "TableCell",
                        "properties": {
                            "row": 0,
                            "column": 0
                        },
                        "children": [
                            {
                                "type": "Text",
                                "properties": {
                                    "content": "ID"
                                }
                            }
                        ]
                    },
                    {
                        "type": "TableCell",
                        "properties": {
                            "row": 0,
                            "column": 1
                        },
                        "children": [
                            {
                                "type": "Text",
                                "properties": {
                                    "content": "Name"
                                }
                            }
                        ]
                    },
                    {
                        "type": "TableCell",
                        "properties": {
                            "row": 0,
                            "column": 2
                        },
                        "children": [
                            {
                                "type": "Text",
                                "properties": {
                                    "content": "Price"
                                }
                            }
                        ]
                    }
                ]
            }
            """;
}
