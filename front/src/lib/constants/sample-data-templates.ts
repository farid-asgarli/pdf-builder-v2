/**
 * Sample Data Templates
 *
 * Provides pre-defined sample data templates for different document types.
 * These templates help users test their PDF templates with realistic data.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Sample data template definition
 */
export interface SampleDataTemplate {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of what this template contains */
  description: string;
  /** Category for grouping */
  category: "insurance" | "invoice" | "report" | "general";
  /** The actual sample data */
  data: Record<string, unknown>;
}

// ============================================================================
// INSURANCE CONTRACT DATA
// ============================================================================

export const insuranceContractData: SampleDataTemplate = {
  id: "insurance-contract",
  name: "Insurance Contract",
  description:
    "Sample data for insurance policy documents including policyholder info, coverage details, and premiums",
  category: "insurance",
  data: {
    policy: {
      number: "POL-2026-001234",
      type: "Comprehensive Home Insurance",
      status: "Active",
      effectiveDate: "2026-01-01",
      expirationDate: "2027-01-01",
      issueDate: "2025-12-15",
      renewalDate: "2027-01-01",
    },
    policyholder: {
      id: "PH-78901",
      firstName: "John",
      lastName: "Smith",
      fullName: "John Smith",
      email: "john.smith@email.com",
      phone: "+1 (555) 123-4567",
      dateOfBirth: "1985-03-15",
      address: {
        street: "123 Oak Street",
        apartment: "Apt 4B",
        city: "Springfield",
        state: "IL",
        zipCode: "62701",
        country: "United States",
        fullAddress: "123 Oak Street, Apt 4B, Springfield, IL 62701",
      },
    },
    insuredProperty: {
      type: "Single Family Home",
      address: {
        street: "456 Maple Avenue",
        city: "Springfield",
        state: "IL",
        zipCode: "62702",
        fullAddress: "456 Maple Avenue, Springfield, IL 62702",
      },
      yearBuilt: 2005,
      squareFeet: 2500,
      numberOfBedrooms: 4,
      numberOfBathrooms: 2.5,
      constructionType: "Wood Frame",
      roofType: "Asphalt Shingle",
      estimatedValue: 450000,
    },
    coverage: {
      dwelling: {
        limit: 450000,
        deductible: 1000,
        description: "Covers damage to the home structure",
      },
      personalProperty: {
        limit: 225000,
        deductible: 500,
        description: "Covers personal belongings",
      },
      liability: {
        limit: 300000,
        deductible: 0,
        description: "Covers legal liability for injuries",
      },
      additionalLivingExpenses: {
        limit: 90000,
        deductible: 0,
        description: "Covers temporary housing if home is uninhabitable",
      },
      medicalPayments: {
        limit: 5000,
        deductible: 0,
        description: "Covers medical expenses for guests",
      },
    },
    premium: {
      annual: 2450.0,
      monthly: 204.17,
      paymentFrequency: "Monthly",
      nextPaymentDate: "2026-02-01",
      paymentMethod: "Auto-Debit",
    },
    agent: {
      name: "Sarah Johnson",
      licenseNumber: "AG-456789",
      phone: "+1 (555) 987-6543",
      email: "sarah.johnson@insurance.com",
      agency: "Springfield Insurance Agency",
    },
    company: {
      name: "Reliable Insurance Co.",
      address: "789 Corporate Blvd, Suite 500, Chicago, IL 60601",
      phone: "+1 (800) 555-0199",
      website: "www.reliableinsurance.com",
      naic: "12345",
    },
    endorsements: [
      {
        code: "END-001",
        name: "Scheduled Personal Property",
        description: "Additional coverage for jewelry and art",
        additionalPremium: 150.0,
      },
      {
        code: "END-002",
        name: "Water Backup Coverage",
        description: "Coverage for sewer and drain backup",
        additionalPremium: 75.0,
      },
    ],
    claims: [
      {
        number: "CLM-2024-5678",
        date: "2024-07-15",
        type: "Weather Damage",
        status: "Closed",
        amount: 3500.0,
        description: "Roof damage from hail storm",
      },
    ],
    discounts: [
      { name: "Multi-Policy", percentage: 10 },
      { name: "Security System", percentage: 5 },
      { name: "Claims-Free", percentage: 8 },
    ],
    documents: {
      generatedDate: "2026-01-18",
      documentId: "DOC-2026-001234-001",
      version: "1.0",
    },
  },
};

// ============================================================================
// INVOICE DATA
// ============================================================================

export const invoiceData: SampleDataTemplate = {
  id: "invoice-standard",
  name: "Standard Invoice",
  description:
    "Sample data for business invoices with line items, taxes, and payment details",
  category: "invoice",
  data: {
    invoice: {
      number: "INV-2026-0042",
      date: "2026-01-18",
      dueDate: "2026-02-17",
      status: "Pending",
      purchaseOrderNumber: "PO-78901",
      currency: "USD",
      currencySymbol: "$",
    },
    company: {
      name: "Acme Solutions Inc.",
      logo: "/images/acme-logo.png",
      address: {
        street: "100 Innovation Drive",
        suite: "Suite 200",
        city: "San Francisco",
        state: "CA",
        zipCode: "94102",
        country: "United States",
        fullAddress: "100 Innovation Drive, Suite 200, San Francisco, CA 94102",
      },
      phone: "+1 (415) 555-0100",
      email: "billing@acmesolutions.com",
      website: "www.acmesolutions.com",
      taxId: "XX-XXXXXXX",
    },
    customer: {
      id: "CUST-2345",
      name: "Tech Innovations Ltd.",
      contactPerson: "Michael Chen",
      email: "accounts@techinnovations.com",
      phone: "+1 (650) 555-0200",
      address: {
        street: "500 Technology Park",
        building: "Building C",
        city: "Palo Alto",
        state: "CA",
        zipCode: "94301",
        country: "United States",
        fullAddress: "500 Technology Park, Building C, Palo Alto, CA 94301",
      },
      taxExempt: false,
    },
    lineItems: [
      {
        id: 1,
        sku: "SVC-001",
        description: "Software Development Services - January 2026",
        details: "Full-stack development for customer portal",
        quantity: 80,
        unit: "hours",
        unitPrice: 150.0,
        discount: 0,
        amount: 12000.0,
      },
      {
        id: 2,
        sku: "SVC-002",
        description: "UI/UX Design Services",
        details: "User interface design and prototyping",
        quantity: 40,
        unit: "hours",
        unitPrice: 125.0,
        discount: 0,
        amount: 5000.0,
      },
      {
        id: 3,
        sku: "SVC-003",
        description: "Project Management",
        details: "Sprint planning and coordination",
        quantity: 20,
        unit: "hours",
        unitPrice: 100.0,
        discount: 0,
        amount: 2000.0,
      },
      {
        id: 4,
        sku: "LIC-001",
        description: "Software License - Enterprise",
        details: "Annual enterprise license fee",
        quantity: 1,
        unit: "license",
        unitPrice: 5000.0,
        discount: 500.0,
        amount: 4500.0,
      },
    ],
    totals: {
      subtotal: 23500.0,
      discountTotal: 500.0,
      taxableAmount: 23000.0,
      taxRate: 8.25,
      taxAmount: 1897.5,
      shippingHandling: 0,
      total: 24897.5,
    },
    payment: {
      terms: "Net 30",
      methods: ["Bank Transfer", "Credit Card", "Check"],
      bankDetails: {
        bankName: "First National Bank",
        accountName: "Acme Solutions Inc.",
        accountNumber: "****4567",
        routingNumber: "****8901",
        swiftCode: "FNBKUS44",
      },
      creditCardEnabled: true,
      latePaymentFee: "1.5% per month on overdue balance",
    },
    notes: [
      "Thank you for your business!",
      "Please reference invoice number when making payment.",
      "For questions, contact billing@acmesolutions.com",
    ],
    termsAndConditions:
      "Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly finance charge.",
    documents: {
      generatedDate: "2026-01-18",
      documentId: "DOC-INV-2026-0042",
    },
  },
};

// ============================================================================
// REPORT DATA
// ============================================================================

export const reportData: SampleDataTemplate = {
  id: "quarterly-report",
  name: "Quarterly Business Report",
  description:
    "Sample data for business reports with metrics, charts data, and summaries",
  category: "report",
  data: {
    report: {
      title: "Q4 2025 Performance Report",
      subtitle: "Financial and Operational Summary",
      period: "October - December 2025",
      quarter: "Q4",
      year: 2025,
      generatedDate: "2026-01-18",
      version: "1.0",
      confidential: true,
    },
    company: {
      name: "Global Tech Industries",
      department: "Finance & Operations",
      preparedBy: "Analytics Team",
      reviewedBy: "CFO - Jennifer Williams",
      approvedBy: "CEO - Robert Anderson",
    },
    executiveSummary: {
      highlights: [
        "Revenue exceeded targets by 12%",
        "Customer acquisition increased 25% YoY",
        "Operating costs reduced by 8%",
        "New product launch successful",
      ],
      challenges: [
        "Supply chain delays in November",
        "Increased competition in core market",
      ],
      outlook: "Positive growth trajectory expected to continue in Q1 2026",
    },
    financials: {
      revenue: {
        current: 15750000,
        previous: 14200000,
        target: 14000000,
        growth: 10.9,
        ytd: 58500000,
      },
      expenses: {
        current: 11250000,
        previous: 11800000,
        budget: 12000000,
        savings: 750000,
      },
      profit: {
        gross: 4500000,
        grossMargin: 28.6,
        net: 3150000,
        netMargin: 20.0,
      },
      ebitda: 4200000,
    },
    metrics: {
      customers: {
        total: 12500,
        new: 1850,
        churned: 320,
        netGrowth: 1530,
        retentionRate: 97.4,
      },
      products: {
        sold: 45200,
        averageOrderValue: 348.45,
        returnsRate: 2.1,
      },
      employees: {
        total: 485,
        hired: 42,
        departed: 18,
        satisfaction: 4.2,
      },
    },
    regionalPerformance: [
      {
        region: "North America",
        revenue: 7500000,
        percentage: 47.6,
        growth: 8.5,
      },
      {
        region: "Europe",
        revenue: 4200000,
        percentage: 26.7,
        growth: 15.2,
      },
      {
        region: "Asia Pacific",
        revenue: 2800000,
        percentage: 17.8,
        growth: 22.1,
      },
      {
        region: "Rest of World",
        revenue: 1250000,
        percentage: 7.9,
        growth: 5.3,
      },
    ],
    productPerformance: [
      {
        name: "Enterprise Suite",
        revenue: 6300000,
        units: 4200,
        growth: 12.5,
      },
      {
        name: "Professional Edition",
        revenue: 5100000,
        units: 17000,
        growth: 8.2,
      },
      {
        name: "Starter Package",
        revenue: 2850000,
        units: 19000,
        growth: 18.7,
      },
      {
        name: "Add-on Services",
        revenue: 1500000,
        units: 5000,
        growth: -2.1,
      },
    ],
    monthlyTrend: [
      {
        month: "October",
        revenue: 4800000,
        expenses: 3650000,
        profit: 1150000,
      },
      {
        month: "November",
        revenue: 5200000,
        expenses: 3800000,
        profit: 1400000,
      },
      {
        month: "December",
        revenue: 5750000,
        expenses: 3800000,
        profit: 1950000,
      },
    ],
    keyInitiatives: [
      {
        name: "Cloud Migration",
        status: "On Track",
        completion: 75,
        deadline: "2026-03-31",
      },
      {
        name: "Mobile App Launch",
        status: "Completed",
        completion: 100,
        deadline: "2025-12-15",
      },
      {
        name: "Market Expansion - LATAM",
        status: "In Progress",
        completion: 40,
        deadline: "2026-06-30",
      },
    ],
    recommendations: [
      "Increase marketing budget for APAC region by 15%",
      "Invest in customer success team expansion",
      "Accelerate cloud migration timeline",
      "Review pricing strategy for Starter Package",
    ],
    appendix: {
      dataSources: [
        "SAP ERP",
        "Salesforce CRM",
        "Google Analytics",
        "Internal HR System",
      ],
      methodology:
        "Data aggregated from primary systems with manual reconciliation",
      disclaimer:
        "This report contains forward-looking statements that involve risks and uncertainties.",
    },
  },
};

// ============================================================================
// GENERAL / SIMPLE DATA
// ============================================================================

export const simpleLetterData: SampleDataTemplate = {
  id: "simple-letter",
  name: "Business Letter",
  description: "Simple data for business correspondence and letters",
  category: "general",
  data: {
    sender: {
      name: "Jane Doe",
      title: "Senior Account Manager",
      company: "ABC Corporation",
      address: "123 Business Park, New York, NY 10001",
      phone: "+1 (212) 555-0100",
      email: "jane.doe@abccorp.com",
    },
    recipient: {
      name: "John Smith",
      title: "Procurement Director",
      company: "XYZ Industries",
      address: "456 Industrial Ave, Chicago, IL 60601",
    },
    letter: {
      date: "January 18, 2026",
      subject: "Partnership Proposal",
      reference: "REF-2026-0042",
      greeting: "Dear Mr. Smith",
      closing: "Best regards",
    },
    content: {
      opening:
        "I hope this letter finds you well. I am writing to follow up on our recent conversation regarding a potential partnership between our organizations.",
      body: "Our team has prepared a comprehensive proposal that outlines the mutual benefits of collaboration. The proposal includes detailed information about our services, pricing structure, and implementation timeline.",
      closing:
        "I would welcome the opportunity to discuss this proposal further at your convenience. Please feel free to contact me directly to schedule a meeting.",
    },
  },
};

export const certificateData: SampleDataTemplate = {
  id: "certificate",
  name: "Certificate of Completion",
  description: "Data for certificates, awards, and recognition documents",
  category: "general",
  data: {
    certificate: {
      type: "Certificate of Completion",
      title: "Professional Development Program",
      number: "CERT-2026-001234",
      issueDate: "January 18, 2026",
      validUntil: "January 18, 2029",
    },
    recipient: {
      name: "Alexandra Thompson",
      title: "Software Engineer",
      company: "Tech Solutions Inc.",
      employeeId: "EMP-5678",
    },
    program: {
      name: "Advanced Cloud Architecture",
      duration: "40 hours",
      completedDate: "January 15, 2026",
      score: 92,
      grade: "A",
      credits: 4.0,
    },
    issuer: {
      organization: "Professional Training Institute",
      accreditation: "Accredited by National Education Board",
      instructor: "Dr. Michael Chen",
      instructorTitle: "Lead Instructor",
    },
    signatures: [
      { name: "Dr. Michael Chen", title: "Lead Instructor" },
      { name: "Sarah Williams", title: "Program Director" },
    ],
    verification: {
      url: "https://verify.pti.org/CERT-2026-001234",
      qrCode: "https://verify.pti.org/qr/CERT-2026-001234",
    },
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All available sample data templates
 */
export const sampleDataTemplates: SampleDataTemplate[] = [
  insuranceContractData,
  invoiceData,
  reportData,
  simpleLetterData,
  certificateData,
];

/**
 * Get sample data templates by category
 */
export function getSampleDataByCategory(
  category: SampleDataTemplate["category"]
): SampleDataTemplate[] {
  return sampleDataTemplates.filter(
    (template) => template.category === category
  );
}

/**
 * Get a sample data template by ID
 */
export function getSampleDataById(id: string): SampleDataTemplate | undefined {
  return sampleDataTemplates.find((template) => template.id === id);
}

/**
 * Get all categories with their templates
 */
export function getSampleDataCategories(): {
  category: SampleDataTemplate["category"];
  label: string;
  templates: SampleDataTemplate[];
}[] {
  return [
    {
      category: "insurance",
      label: "Insurance",
      templates: getSampleDataByCategory("insurance"),
    },
    {
      category: "invoice",
      label: "Invoices",
      templates: getSampleDataByCategory("invoice"),
    },
    {
      category: "report",
      label: "Reports",
      templates: getSampleDataByCategory("report"),
    },
    {
      category: "general",
      label: "General",
      templates: getSampleDataByCategory("general"),
    },
  ];
}

/**
 * Create empty sample data structure
 */
export function createEmptyTestData(): Record<string, unknown> {
  return {
    data: {},
  };
}
