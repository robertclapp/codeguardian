import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";

export const participantPortalRouter = router({
  /**
   * Get participant's own progress
   */
  getMyProgress: protectedProcedure.query(async ({ ctx }) => {
    // Find candidate by user email
    const candidates = await db.getAllParticipants();
    const userEmail = ctx.user.email;
    
    // Get all candidates to find matching email
    // In a real system, you'd have a direct link between users and candidates
    const allCandidates: any[] = [];
    for (const participant of candidates) {
      const candidate = await db.getCandidateById(participant.candidateId);
      if (candidate && candidate.email.toLowerCase() === userEmail?.toLowerCase()) {
        const program = await db.getProgramById(participant.programId);
        const stages = await db.getStagesByProgramId(participant.programId);
        const currentStage = stages.find(s => s.id === participant.currentStageId);
        
        // Calculate progress
        const stageOrder = currentStage?.order || 0;
        const progress = stages.length > 0 ? (stageOrder / stages.length) * 100 : 0;
        
        allCandidates.push({
          participantId: participant.id,
          candidateId: candidate.id,
          candidateName: candidate.name,
          programId: program?.id,
          programName: program?.name,
          status: participant.status,
          currentStage: currentStage?.name || "Not started",
          currentStageId: participant.currentStageId,
          progress: Math.round(progress),
          startedAt: participant.startedAt,
          completedAt: participant.completedAt,
          stages: stages.map(s => ({
            id: s.id,
            name: s.name,
            order: s.order,
            isComplete: s.order < stageOrder,
            isCurrent: s.id === participant.currentStageId,
          })),
        });
      }
    }
    
    return allCandidates;
  }),

  /**
   * Get participant's documents
   */
  getMyDocuments: protectedProcedure.query(async ({ ctx }) => {
    // Find candidate by user email
    const candidates = await db.getAllParticipants();
    const userEmail = ctx.user.email;
    
    const allDocuments: any[] = [];
    for (const participant of candidates) {
      const candidate = await db.getCandidateById(participant.candidateId);
      if (candidate && candidate.email.toLowerCase() === userEmail?.toLowerCase()) {
        const documents = await db.getDocumentsByCandidate(candidate.id);
        
        for (const doc of documents) {
          const requirement = doc.requirementId 
            ? await db.getRequirementsByStageId(participant.currentStageId).then(reqs => 
                reqs.find((r: any) => r.id === doc.requirementId)
              )
            : null;
          
          allDocuments.push({
            id: doc.id,
            name: doc.name,
            fileUrl: doc.fileUrl,
            fileSize: doc.fileSize,
            status: doc.status,
            createdAt: doc.createdAt,
            requirementName: requirement?.name || "General Document",
            programName: (await db.getProgramById(participant.programId))?.name,
          });
        }
      }
    }
    
    return allDocuments;
  }),

  /**
   * Upload document
   */
  uploadDocument: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        fileContent: z.string(), // Base64 encoded
        mimeType: z.string(),
        requirementId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find candidate by user email
      const candidates = await db.getAllParticipants();
      const userEmail = ctx.user.email;
      
      let candidateId: number | null = null;
      for (const participant of candidates) {
        const candidate = await db.getCandidateById(participant.candidateId);
        if (candidate && candidate.email.toLowerCase() === userEmail?.toLowerCase()) {
          candidateId = candidate.id;
          break;
        }
      }
      
      if (!candidateId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Participant record not found",
        });
      }
      
      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.fileContent, "base64");
      const fileKey = `documents/${candidateId}/${Date.now()}-${input.name}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      
      // Create document record
      const document = await db.createDocument({
        candidateId,
        requirementId: input.requirementId || null,
        name: input.name,
        fileUrl: url,
        fileKey,
        fileSize: buffer.length,
        uploadedBy: ctx.user.id,
        status: "pending",
      });
      
      return {
        id: document.id,
        name: document.name,
        fileUrl: document.fileUrl,
        status: document.status,
      };
    }),

  /**
   * Get required documents for participant
   */
  getRequiredDocuments: protectedProcedure.query(async ({ ctx }) => {
    const candidates = await db.getAllParticipants();
    const userEmail = ctx.user.email;
    
    const requiredDocs: any[] = [];
    for (const participant of candidates) {
      const candidate = await db.getCandidateById(participant.candidateId);
      if (candidate && candidate.email.toLowerCase() === userEmail?.toLowerCase()) {
        const stages = await db.getStagesByProgramId(participant.programId);
        const currentStage = stages.find(s => s.id === participant.currentStageId);
        
        if (currentStage) {
          const requirements = await db.getRequirementsByStageId(currentStage.id);
          const documents = await db.getDocumentsByCandidate(candidate.id);
          
          for (const req of requirements) {
            if ((req as any).type === "document") {
              const uploaded = documents.find(d => d.requirementId === req.id);
              requiredDocs.push({
                id: req.id,
                name: req.name,
                description: req.description,
                stageName: currentStage.name,
                uploaded: !!uploaded,
                uploadedDocId: uploaded?.id,
                status: uploaded?.status || "missing",
              });
            }
          }
        }
      }
    }
    
    return requiredDocs;
  }),
});
