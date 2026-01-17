# PDF Builder Backend

A .NET 8 backend API for generating PDF documents from JSON layouts using QuestPDF.

## 📋 Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [SQL Server](https://www.microsoft.com/sql-server) (LocalDB, Express, or full version)
- [Visual Studio 2022](https://visualstudio.microsoft.com/) or [VS Code](https://code.visualstudio.com/) with C# extension

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourcompany/pdfbuilder-backend.git
cd pdfbuilder-backend
```

### 2. Restore packages

```bash
dotnet restore
```

### 3. Update the connection string

Edit `src/PDFBuilder.API/appsettings.Development.json` and update the database connection string:

```json
{
  "Database": {
    "ConnectionString": "Server=localhost;Database=PDFBuilder_Dev;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

### 4. Apply database migrations

```bash
cd src/PDFBuilder.API
dotnet ef database update
```

### 5. Run the application

```bash
dotnet run --project src/PDFBuilder.API
```

The API will be available at:

- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger UI: `https://localhost:5001/`

## 🏗️ Project Structure

```
PDFBuilder.Backend/
├── src/
│   ├── PDFBuilder.API/              # ASP.NET Core Web API
│   ├── PDFBuilder.Contracts/        # DTOs & API Models
│   ├── PDFBuilder.Core/             # Domain Models & Business Logic
│   ├── PDFBuilder.Engine/           # Layout Engine & Renderers
│   ├── PDFBuilder.Infrastructure/   # Database, External Services
│   └── PDFBuilder.Validation/       # FluentValidation Validators
├── tests/
│   ├── PDFBuilder.UnitTests/        # Unit tests
│   ├── PDFBuilder.IntegrationTests/ # Integration tests
│   └── PDFBuilder.TestUtilities/    # Shared test helpers
└── docs/                            # Documentation
```

## 🔧 Configuration

### appsettings.json

| Section      | Description                                      |
| ------------ | ------------------------------------------------ |
| `Database`   | SQL Server connection and EF Core settings       |
| `QuestPdf`   | PDF generation settings (page size, fonts, etc.) |
| `Storage`    | File storage paths for PDFs and images           |
| `Expression` | Expression evaluation settings and limits        |
| `Cors`       | Cross-origin resource sharing configuration      |
| `Serilog`    | Logging configuration                            |

## 📡 API Endpoints

### Status

- `GET /api/status` - Get API status
- `GET /api/status/ping` - Ping endpoint

### Health Checks

- `GET /health` - Full health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### PDF Generation (Coming in Phase 4)

- `POST /api/pdf/generate` - Generate PDF from layout JSON

### Templates (Coming in Phase 7)

- `GET /api/templates` - List all templates
- `GET /api/templates/{id}` - Get template by ID
- `POST /api/templates` - Create template
- `PUT /api/templates/{id}` - Update template
- `DELETE /api/templates/{id}` - Delete template

## 🧪 Running Tests

```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run specific test project
dotnet test tests/PDFBuilder.UnitTests
```

## 📦 Build

```bash
# Debug build
dotnet build

# Release build
dotnet build -c Release

# Publish
dotnet publish -c Release -o ./publish
```

## 🔐 License

QuestPDF is used under the Community License for this project.

## 📚 Documentation

- [Development Phases](docs/DEVELOPMENT-PHASES.md)
- [Task Documentation](docs/TASK.md)
- [QuestPDF API Reference](docs/questpdf/)
