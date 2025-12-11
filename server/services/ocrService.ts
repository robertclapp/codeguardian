/**
 * OCR Service for Document Data Extraction
 * 
 * Uses AI-powered OCR to extract structured data from documents
 */

import { invokeLLM } from "../_core/llm";

export interface ExtractedData {
  fields: Record<string, any>;
  confidence: number;
  rawText?: string;
}

export interface I9FormData {
  firstName: string;
  middleInitial?: string;
  lastName: string;
  otherNames?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  socialSecurityNumber?: string;
  email?: string;
  phoneNumber?: string;
  citizenshipStatus: "citizen" | "non-citizen-national" | "permanent-resident" | "alien-authorized";
  alienNumber?: string;
  uscisNumber?: string;
  i94Number?: string;
  passportNumber?: string;
  countryOfIssuance?: string;
  signature?: string;
  signatureDate?: string;
}

export interface W4FormData {
  firstName: string;
  middleInitial?: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  socialSecurityNumber?: string;
  filingStatus: "single" | "married-filing-jointly" | "married-filing-separately" | "head-of-household";
  multipleJobs: boolean;
  dependents: number;
  otherIncome?: number;
  deductions?: number;
  extraWithholding?: number;
  signature?: string;
  signatureDate?: string;
}

/**
 * Extract text and structured data from document using AI OCR
 */
export async function extractDocumentData(
  documentUrl: string,
  documentType: "i9" | "w4" | "generic"
): Promise<ExtractedData> {
  try {
    // Use LLM with vision to extract structured data from document
    const schema = getSchemaForDocumentType(documentType);
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting structured data from documents. Extract all relevant information from the provided document image and return it in JSON format matching the specified schema. Be accurate and thorough.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract data from this ${documentType.toUpperCase()} form. Return a JSON object with the extracted fields.`,
            },
            {
              type: "image_url",
              image_url: {
                url: documentUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: `${documentType}_extraction`,
          strict: true,
          schema,
        },
      },
    });

    const extractedText = typeof response.choices[0].message.content === "string" 
      ? response.choices[0].message.content 
      : JSON.stringify(response.choices[0].message.content);
    const parsedData = JSON.parse(extractedText || "{}");

    // Calculate confidence based on how many fields were extracted
    const totalFields = Object.keys(schema.properties || {}).length;
    const extractedFields = Object.keys(parsedData).filter(
      key => parsedData[key] !== null && parsedData[key] !== undefined && parsedData[key] !== ""
    ).length;
    const confidence = totalFields > 0 ? (extractedFields / totalFields) * 100 : 0;

    return {
      fields: parsedData,
      confidence: Math.round(confidence),
      rawText: extractedText,
    };
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw new Error("Failed to extract data from document");
  }
}

/**
 * Get JSON schema for document type
 */
function getSchemaForDocumentType(documentType: "i9" | "w4" | "generic") {
  switch (documentType) {
    case "i9":
      return {
        type: "object",
        properties: {
          firstName: { type: "string", description: "First name" },
          middleInitial: { type: "string", description: "Middle initial" },
          lastName: { type: "string", description: "Last name" },
          otherNames: { type: "string", description: "Other names used" },
          address: { type: "string", description: "Street address" },
          city: { type: "string", description: "City" },
          state: { type: "string", description: "State" },
          zipCode: { type: "string", description: "ZIP code" },
          dateOfBirth: { type: "string", description: "Date of birth (MM/DD/YYYY)" },
          socialSecurityNumber: { type: "string", description: "Social Security Number" },
          email: { type: "string", description: "Email address" },
          phoneNumber: { type: "string", description: "Phone number" },
          citizenshipStatus: {
            type: "string",
            enum: ["citizen", "non-citizen-national", "permanent-resident", "alien-authorized"],
            description: "Citizenship status",
          },
          alienNumber: { type: "string", description: "Alien registration number" },
          uscisNumber: { type: "string", description: "USCIS number" },
          i94Number: { type: "string", description: "I-94 admission number" },
          passportNumber: { type: "string", description: "Passport number" },
          countryOfIssuance: { type: "string", description: "Country of issuance" },
          signatureDate: { type: "string", description: "Signature date (MM/DD/YYYY)" },
        },
        required: ["firstName", "lastName", "address", "city", "state", "zipCode", "dateOfBirth", "citizenshipStatus"],
        additionalProperties: false,
      };

    case "w4":
      return {
        type: "object",
        properties: {
          firstName: { type: "string", description: "First name" },
          middleInitial: { type: "string", description: "Middle initial" },
          lastName: { type: "string", description: "Last name" },
          address: { type: "string", description: "Street address" },
          city: { type: "string", description: "City" },
          state: { type: "string", description: "State" },
          zipCode: { type: "string", description: "ZIP code" },
          socialSecurityNumber: { type: "string", description: "Social Security Number" },
          filingStatus: {
            type: "string",
            enum: ["single", "married-filing-jointly", "married-filing-separately", "head-of-household"],
            description: "Filing status",
          },
          multipleJobs: { type: "boolean", description: "Multiple jobs or spouse works" },
          dependents: { type: "number", description: "Number of dependents" },
          otherIncome: { type: "number", description: "Other income amount" },
          deductions: { type: "number", description: "Deductions amount" },
          extraWithholding: { type: "number", description: "Extra withholding amount" },
          signatureDate: { type: "string", description: "Signature date (MM/DD/YYYY)" },
        },
        required: ["firstName", "lastName", "address", "city", "state", "zipCode", "filingStatus"],
        additionalProperties: false,
      };

    default:
      return {
        type: "object",
        properties: {
          extractedText: { type: "string", description: "All extracted text from the document" },
        },
        required: [],
        additionalProperties: true,
      };
  }
}

/**
 * Auto-fill participant profile from extracted I-9 data
 */
export function autoFillFromI9(extractedData: I9FormData) {
  return {
    name: `${extractedData.firstName} ${extractedData.lastName}`,
    email: extractedData.email || "",
    phone: extractedData.phoneNumber || "",
    // Additional fields can be mapped as needed
  };
}

/**
 * Auto-fill participant profile from extracted W-4 data
 */
export function autoFillFromW4(extractedData: W4FormData) {
  return {
    name: `${extractedData.firstName} ${extractedData.lastName}`,
    // Additional fields can be mapped as needed
  };
}

/**
 * Validate extracted data quality
 */
export function validateExtractedData(data: ExtractedData, requiredFields: string[]): {
  isValid: boolean;
  missingFields: string[];
  lowConfidenceFields: string[];
} {
  const missingFields: string[] = [];
  const lowConfidenceFields: string[] = [];

  // Check for missing required fields
  for (const field of requiredFields) {
    if (!data.fields[field] || data.fields[field] === "") {
      missingFields.push(field);
    }
  }

  // Check overall confidence
  if (data.confidence < 70) {
    lowConfidenceFields.push("Overall confidence is low");
  }

  return {
    isValid: missingFields.length === 0 && data.confidence >= 70,
    missingFields,
    lowConfidenceFields,
  };
}
