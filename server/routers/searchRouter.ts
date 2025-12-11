import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as search from "../services/advancedSearch";

export const searchRouter = router({
  /**
   * Unified search across all entities
   */
  unified: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return search.unifiedSearch(input.query, input.limit);
    }),

  /**
   * Search participants only
   */
  participants: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      return search.searchParticipants(input.query, input.limit);
    }),

  /**
   * Search documents only
   */
  documents: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      return search.searchDocuments(input.query, input.limit);
    }),

  /**
   * Search jobs only
   */
  jobs: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      return search.searchJobs(input.query, input.limit);
    }),

  /**
   * Search programs only
   */
  programs: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      return search.searchPrograms(input.query, input.limit);
    }),

  /**
   * Get autocomplete suggestions
   */
  autocomplete: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      return search.getAutocompleteSuggestions(input.query, input.limit);
    }),
});
