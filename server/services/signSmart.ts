/**
 * SignSmart E-Signature Integration Service
 * Enables legal e-signatures for offer letters with tracking and reminders
 */

import { ENV } from "../_core/env";

// SignSmart API configuration
const SIGNSMART_API_URL = ENV.SIGNSMART_API_URL || "https://api.signsmart.example.com";
const SIGNSMART_API_KEY = ENV.SIGNSMART_API_KEY || "";

interface SignatureRequest {
  documentId: string;
  documentName: string;
  documentContent: string; // Base64 encoded PDF or HTML
  signers: Array<{
    name: string;
    email: string;
    role: "candidate" | "employer" | "witness";
    order: number;
  }>;
  expiresAt?: Date;
  reminderDays?: number[];
  callbackUrl?: string;
  metadata?: Record<string, string>;
}

interface SignatureStatus {
  requestId: string;
  status: "pending" | "in_progress" | "completed" | "expired" | "declined";
  signers: Array<{
    email: string;
    status: "pending" | "signed" | "declined";
    signedAt?: Date;
    ipAddress?: string;
  }>;
  documentUrl?: string;
  signedDocumentUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Create a new signature request
 */
export async function createSignatureRequest(request: SignatureRequest): Promise<{ requestId: string; signingUrl: string }> {
  // In production, this would call the actual SignSmart API
  // For now, we'll simulate the response
  
  if (!SIGNSMART_API_KEY) {
    console.warn("SignSmart API key not configured - using mock mode");
    
    // Generate mock request ID
    const requestId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signingUrl = `https://sign.signsmart.example.com/sign/${requestId}`;
    
    return { requestId, signingUrl };
  }

  try {
    const response = await fetch(`${SIGNSMART_API_URL}/v1/signature-requests`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SIGNSMART_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document: {
          name: request.documentName,
          content: request.documentContent,
        },
        signers: request.signers.map(s => ({
          name: s.name,
          email: s.email,
          role: s.role,
          signing_order: s.order,
        })),
        expires_at: request.expiresAt?.toISOString(),
        reminder_schedule: request.reminderDays,
        callback_url: request.callbackUrl,
        metadata: request.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create signature request");
    }

    const data = await response.json();
    return {
      requestId: data.request_id,
      signingUrl: data.signing_url,
    };
  } catch (error) {
    console.error("SignSmart API error:", error);
    throw error;
  }
}

/**
 * Get signature request status
 */
export async function getSignatureStatus(requestId: string): Promise<SignatureStatus> {
  if (!SIGNSMART_API_KEY) {
    // Mock response for development
    return {
      requestId,
      status: "pending",
      signers: [],
      createdAt: new Date(),
    };
  }

  try {
    const response = await fetch(`${SIGNSMART_API_URL}/v1/signature-requests/${requestId}`, {
      headers: {
        "Authorization": `Bearer ${SIGNSMART_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get signature status");
    }

    const data = await response.json();
    return {
      requestId: data.request_id,
      status: data.status,
      signers: data.signers.map((s: any) => ({
        email: s.email,
        status: s.status,
        signedAt: s.signed_at ? new Date(s.signed_at) : undefined,
        ipAddress: s.ip_address,
      })),
      documentUrl: data.document_url,
      signedDocumentUrl: data.signed_document_url,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  } catch (error) {
    console.error("SignSmart API error:", error);
    throw error;
  }
}

/**
 * Send reminder to pending signers
 */
export async function sendSignatureReminder(requestId: string): Promise<boolean> {
  if (!SIGNSMART_API_KEY) {
    console.log(`[Mock] Sending reminder for request ${requestId}`);
    return true;
  }

  try {
    const response = await fetch(`${SIGNSMART_API_URL}/v1/signature-requests/${requestId}/remind`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SIGNSMART_API_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("SignSmart reminder error:", error);
    return false;
  }
}

/**
 * Cancel a signature request
 */
export async function cancelSignatureRequest(requestId: string): Promise<boolean> {
  if (!SIGNSMART_API_KEY) {
    console.log(`[Mock] Cancelling request ${requestId}`);
    return true;
  }

  try {
    const response = await fetch(`${SIGNSMART_API_URL}/v1/signature-requests/${requestId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${SIGNSMART_API_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("SignSmart cancel error:", error);
    return false;
  }
}

/**
 * Download signed document
 */
export async function downloadSignedDocument(requestId: string): Promise<Buffer | null> {
  if (!SIGNSMART_API_KEY) {
    console.log(`[Mock] Downloading signed document for ${requestId}`);
    return null;
  }

  try {
    const response = await fetch(`${SIGNSMART_API_URL}/v1/signature-requests/${requestId}/document`, {
      headers: {
        "Authorization": `Bearer ${SIGNSMART_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download document");
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("SignSmart download error:", error);
    return null;
  }
}

/**
 * Generate offer letter HTML for signing
 */
export function generateOfferLetterHTML(data: {
  candidateName: string;
  jobTitle: string;
  department: string;
  salary: number;
  startDate: string;
  benefits: string;
  companyName: string;
  signerName: string;
  signerTitle: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { color: #333; margin-bottom: 5px; }
    .content { margin-bottom: 30px; }
    .signature-block { margin-top: 60px; }
    .signature-line { border-top: 1px solid #333; width: 250px; margin-top: 40px; padding-top: 5px; }
    .date-line { margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.companyName}</h1>
    <p>Official Offer of Employment</p>
  </div>
  
  <div class="content">
    <p>Date: ${new Date().toLocaleDateString()}</p>
    
    <p>Dear ${data.candidateName},</p>
    
    <p>We are pleased to offer you the position of <strong>${data.jobTitle}</strong> in the ${data.department} department at ${data.companyName}. We believe your skills and experience will be a valuable addition to our team.</p>
    
    <h3>Position Details</h3>
    <ul>
      <li><strong>Position:</strong> ${data.jobTitle}</li>
      <li><strong>Department:</strong> ${data.department}</li>
      <li><strong>Start Date:</strong> ${data.startDate}</li>
      <li><strong>Annual Salary:</strong> $${data.salary.toLocaleString()}</li>
    </ul>
    
    <h3>Benefits</h3>
    <p>${data.benefits}</p>
    
    <p>This offer is contingent upon successful completion of a background check and verification of your employment eligibility.</p>
    
    <p>Please indicate your acceptance of this offer by signing below and returning this letter by [expiration date].</p>
    
    <p>We are excited about the possibility of you joining our team and look forward to your positive response.</p>
    
    <p>Sincerely,</p>
    
    <div class="signature-block">
      <div class="signature-line">
        <p>${data.signerName}<br>${data.signerTitle}</p>
      </div>
    </div>
    
    <div class="signature-block">
      <h3>Acceptance</h3>
      <p>I, ${data.candidateName}, accept the offer of employment as described above.</p>
      
      <div class="signature-line">
        <p>Candidate Signature</p>
      </div>
      
      <div class="date-line">
        <p>Date: _________________</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
