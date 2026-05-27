import mongoose from "mongoose";

const brochurePageSchema = new mongoose.Schema(
  {
    // =========================
    // PDF BASIC INFO
    // =========================
    pdfName: {
      type: String,
      required: true,
      trim: true,
    },

    pdfUrl: {
      type: String,
      default: "",
    },

    brochureYear: {
      type: String,
      default: "2026-27",
    },

    pageNumber: {
      type: Number,
      required: true,
    },

    totalPages: {
      type: Number,
      default: 0,
    },

    // =========================
    // MAIN EXTRACTED CONTENT
    // =========================
    text: {
      type: String,
      required: true,
    },

    cleanedText: {
      type: String,
      default: "",
    },

    summary: {
      type: String,
      default: "",
    },

    // =========================
    // AI EMBEDDING
    // =========================
    embedding: {
      type: [Number],
      default: [],
    },

    // =========================
    // PAGE TYPE
    // =========================
    category: {
      type: String,
      enum: [
        "home",
        "placements",
        "fees",
        "courses",
        "hostel",
        "scholarship",
        "admission",
        "engineering",
        "management",
        "medical",
        "design",
        "law",
        "pharmacy",
        "nursing",
        "arts",
        "commerce",
        "science",
        "agriculture",
        "campus",
        "faculty",
        "contact",
        "general",
      ],
      default: "general",
    },

    // =========================
    // FACULTY DETAILS
    // =========================
    facultyName: {
      type: String,
      default: "",
    },

    departmentName: {
      type: String,
      default: "",
    },

    schoolName: {
      type: String,
      default: "",
    },

    // =========================
    // COURSE DETAILS
    // =========================
    courseName: {
      type: String,
      default: "",
    },

    courseLevel: {
      type: String,
      enum: [
        "Diploma",
        "UG",
        "PG",
        "PhD",
        "Integrated",
        "Certificate",
        "",
      ],
      default: "",
    },

    specialization: [
      {
        type: String,
      },
    ],

    duration: {
      type: String,
      default: "",
    },

    annualFees: {
      type: Number,
      default: 0,
    },

    totalFees: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    seatsAvailable: {
      type: Number,
      default: 0,
    },

    eligibility: {
      type: String,
      default: "",
    },

    entranceExam: {
      type: String,
      default: "",
    },

    // =========================
    // PLACEMENT DATA
    // =========================
    placementCompanies: [
      {
        type: String,
      },
    ],

    highestPackage: {
      type: String,
      default: "",
    },

    averagePackage: {
      type: String,
      default: "",
    },

    medianPackage: {
      type: String,
      default: "",
    },

    placementPercentage: {
      type: String,
      default: "",
    },

    internshipCompanies: [
      {
        type: String,
      },
    ],

    topRecruiters: [
      {
        type: String,
      },
    ],

    placementHighlights: [
      {
        type: String,
      },
    ],

    // =========================
    // HOSTEL DETAILS
    // =========================
    hostelName: {
      type: String,
      default: "",
    },

    hostelType: {
      type: String,
      enum: ["Boys", "Girls", "Co-ed", ""],
      default: "",
    },

    roomType: {
      type: String,
      default: "",
    },

    occupancy: {
      type: String,
      default: "",
    },

    hostelFees: {
      type: Number,
      default: 0,
    },

    hostelFacilities: [
      {
        type: String,
      },
    ],

    foodIncluded: {
      type: Boolean,
      default: false,
    },

    acAvailable: {
      type: Boolean,
      default: false,
    },

    wifiAvailable: {
      type: Boolean,
      default: false,
    },

    laundryAvailable: {
      type: Boolean,
      default: false,
    },

    securityAvailable: {
      type: Boolean,
      default: false,
    },

    // =========================
    // SCHOLARSHIP DETAILS
    // =========================
    scholarshipName: {
      type: String,
      default: "",
    },

    scholarshipAmount: {
      type: Number,
      default: 0,
    },

    scholarshipCriteria: {
      type: String,
      default: "",
    },

    scholarshipPercentage: {
      type: String,
      default: "",
    },

    // =========================
    // ADMISSION DETAILS
    // =========================
    admissionProcess: {
      type: String,
      default: "",
    },

    applicationDeadline: {
      type: String,
      default: "",
    },

    admissionMode: {
      type: String,
      default: "",
    },

    documentsRequired: [
      {
        type: String,
      },
    ],

    // =========================
    // CAMPUS DETAILS
    // =========================
    campusName: {
      type: String,
      default: "",
    },

    campusLocation: {
      type: String,
      default: "",
    },

    campusFacilities: [
      {
        type: String,
      },
    ],

    // =========================
    // CONTACT DETAILS
    // =========================
    contactNumbers: [
      {
        type: String,
      },
    ],

    emailAddresses: [
      {
        type: String,
      },
    ],

    websiteLinks: [
      {
        type: String,
      },
    ],

    // =========================
    // AI SEARCH OPTIMIZATION
    // =========================
    keywords: [
      {
        type: String,
      },
    ],

    tags: [
      {
        type: String,
      },
    ],

    searchableContent: {
      type: String,
      default: "",
    },

    relevanceScore: {
      type: Number,
      default: 0,
    },

    popularityScore: {
      type: Number,
      default: 0,
    },

    frequentlyAsked: {
      type: Boolean,
      default: false,
    },

    // =========================
    // CHATBOT SUPPORT
    // =========================
    suggestedQuestions: [
      {
        type: String,
      },
    ],

    answerTemplates: [
      {
        type: String,
      },
    ],

    relatedPages: [
      {
        type: Number,
      },
    ],

    // =========================
    // IMAGE DATA
    // =========================
    imageUrls: [
      {
        type: String,
      },
    ],

    extractedTables: [
      {
        type: Object,
      },
    ],

    // =========================
    // STATUS & METADATA
    // =========================
    sourceType: {
      type: String,
      default: "brochure_pdf",
    },

    uploadedBy: {
      type: String,
      default: "admin",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isLatest: {
      type: Boolean,
      default: true,
    },

    version: {
      type: String,
      default: "1.0",
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// DATABASE INDEXES
// =========================

// Basic indexes
brochurePageSchema.index({ pdfName: 1 });
brochurePageSchema.index({ pageNumber: 1 });
brochurePageSchema.index({ category: 1 });
brochurePageSchema.index({ facultyName: 1 });
brochurePageSchema.index({ courseName: 1 });
brochurePageSchema.index({ annualFees: 1 });

// Placement indexes
brochurePageSchema.index({ highestPackage: 1 });
brochurePageSchema.index({ placementCompanies: 1 });

// Hostel indexes
brochurePageSchema.index({ hostelType: 1 });
brochurePageSchema.index({ hostelFees: 1 });

// Search indexes
brochurePageSchema.index({
  text: "text",
  cleanedText: "text",
  summary: "text",
  courseName: "text",
  facultyName: "text",
  departmentName: "text",
  keywords: "text",
  tags: "text",
  searchableContent: "text",
});

// Timestamp indexes
brochurePageSchema.index({ createdAt: -1 });
brochurePageSchema.index({ uploadedAt: -1 });

// =========================
// MODEL EXPORT
// =========================

const BrochurePage = mongoose.model("BrochurePage", brochurePageSchema);

export default BrochurePage;
