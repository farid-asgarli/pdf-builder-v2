namespace PDFBuilder.UnitTests;

/// <summary>
/// Sample unit test to verify the test project is set up correctly.
/// </summary>
public class SampleTests
{
    [Fact]
    public void SampleTest_ShouldPass()
    {
        // Arrange
        var expected = 4;

        // Act
        var actual = 2 + 2;

        // Assert
        actual.Should().Be(expected);
    }

    [Theory]
    [InlineData(1, 2, 3)]
    [InlineData(5, 5, 10)]
    [InlineData(0, 0, 0)]
    public void Addition_ShouldReturnCorrectSum(int a, int b, int expected)
    {
        // Act
        var result = a + b;

        // Assert
        result.Should().Be(expected);
    }
}
