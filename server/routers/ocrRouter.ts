import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  extractDocumentData,
  autoFillFromI9,
  autoFillFromW4,
  validateExtractedData,
} from "../services/ocrService";
import * as db from "../db";

export const ocrRouter = router({
  /**
   * Extract data from uploaded document
   */
  extractDocument: protectedProcedure
    .input(
      z.object({
        documentUrl: z.string().url(),
        documentType: z.enum(["i9", "w4", "generic"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const extractedData = await extractDocumentData(
          input.documentUrl,
          input.documentType
        );

        // Validate extracted data
        const requiredFields =
          input.documentType === "i9"
            ? ["firstName", "lastName", "address", "city", "state", "zipCode", "dateOfBirth"]
            : input.documentType === "w4"
            ? ["firstName", "lastName", "address", "city", "state", "zipCode"]
            : [];

        const validation = validateExtractedData(extractedData, requiredFields);

        return {
          ...extractedData,
          validation,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract document data",
        });
      }
    }),

  /**
   * Extract and auto-fill participant profile from I-9
   */
  autoFillFromI9: protectedProcedure
    .input(
      z.object({
        documentUrl: z.string().url(),
        participantId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const extractedData = await extractDocumentData(input.documentUrl, "i9");
        
        if (extractedData.confidence < 70) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Document quality too low for auto-fill. Please review manually.",
          });
        }

        const profileData = autoFillFromI9(extractedData.fields as any);

        // If participantId provided, update the participant
        if (input.participantId) {
          await db.updateCandidate(input.participantId, {
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
          });
        }

        return {
          profileData,
          extractedData,
          success: true,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to auto-fill from I-9",
        });
      }
    }),

  /**
   * Extract and auto-fill participant profile from W-4
   */
  autoFillFromW4: protectedProcedure
    .input(
      z.object({
        documentUrl: z.string().url(),
        participantId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const extractedData = await extractDocumentData(input.documentUrl, "w4");
        
        if (extractedData.confidence < 70) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Document quality too low for auto-fill. Please review manually.",
          });
        }

        const profileData = autoFillFromW4(extractedData.fields as any);

        // If participantId provided, update the participant
        if (input.participantId) {
          await db.updateCandidate(input.participantId, {
            name: profileData.name,
          });
        }

        return {
          profileData,
          extractedData,
          success: true,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to auto-fill from W-4",
        });
      }
    }),

  /**
   * Batch extract data from multiple documents
   */
  batchExtract: protectedProcedure
    .input(
      z.object({
        documents: z.array(
          z.object({
            url: z.string().url(),
            type: z.enum(["i9", "w4", "generic"]),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const doc of input.documents) {
        try {
          const extractedData = await extractDocumentData(doc.url, doc.type);
          results.push({
            url: doc.url,
            type: doc.type,
            success: true,
            data: extractedData,
          });
        } catch (error) {
          results.push({
            url: doc.url,
            type: doc.type,
            success: false,
            error: "Extraction failed",
          });
        }
      }

      return {
        results,
        totalProcessed: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      };
    }),
});
