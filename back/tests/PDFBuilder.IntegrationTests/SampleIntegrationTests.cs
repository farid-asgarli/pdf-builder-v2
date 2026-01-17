namespace PDFBuilder.IntegrationTests;

/// <summary>
/// Sample integration test to verify the test project is set up correctly.
/// </summary>
public class SampleIntegrationTests
{
    [Fact]
    public void SampleIntegrationTest_ShouldPass()
    {
        // Arrange
        var expected = "Hello, World!";

        // Act
        var actual = "Hello, World!";

        // Assert
        actual.Should().Be(expected);
    }
}
