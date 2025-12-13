import { storagePut } from "../storage";
import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";

interface InterviewAnalysisResult {
  videoUrl: string;
  transcription: string;
  sentiment: "positive" | "neutral" | "negative";
  keyMoments: Array<{
    timestamp: number;
    description: string;
    importance: "high" | "medium" | "low";
  }>;
  score: number;
  strengths: string[];
  concerns: string[];
  processingTime: number;
}

/**
 * Upload interview video to S3
 */
export async function uploadInterviewVideo(
  videoBuffer: Buffer,
  candidateId: string,
  interviewId: string
): Promise<string> {
  const fileName = `interviews/${candidateId}/${interviewId}-${Date.now()}.webm`;
  const { url } = await storagePut(fileName, videoBuffer, "video/webm");
  return url;
}

/**
 * Extract audio from video URL and transcribe using Whisper API
 */
export async function transcribeInterview(videoUrl: string): Promise<string> {
  try {
    // Use the built-in transcription service
    const result = await transcribeAudio({
      audioUrl: videoUrl,
      language: "en",
      prompt: "This is a job interview conversation between an interviewer and a candidate.",
    });

    return result.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe interview");
  }
}

/**
 * Analyze interview transcription using LLM
 */
export async function analyzeInterviewTranscription(
  transcription: string
): Promise<Omit<InterviewAnalysisResult, "videoUrl" | "processingTime">> {
  const analysisPrompt = `You are an expert HR analyst. Analyze the following job interview transcription and provide:
1. Overall sentiment (positive/neutral/negative)
2. Key moments with timestamps (estimate based on content flow)
3. Overall candidate score (0-100)
4. List of strengths demonstrated
5. List of concerns or areas needing follow-up

Interview Transcription:
${transcription}

Respond in JSON format with this structure:
{
  "sentiment": "positive" | "neutral" | "negative",
  "keyMoments": [{"timestamp": number, "description": string, "importance": "high" | "medium" | "low"}],
  "score": number,
  "strengths": string[],
  "concerns": string[]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert HR analyst providing objective interview assessments.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "interview_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sentiment: {
                type: "string",
                enum: ["positive", "neutral", "negative"],
              },
              keyMoments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    timestamp: { type: "number" },
                    description: { type: "string" },
                    importance: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                    },
                  },
                  required: ["timestamp", "description", "importance"],
                  additionalProperties: false,
                },
              },
              score: { type: "number" },
              strengths: {
                type: "array",
                items: { type: "string" },
              },
              concerns: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["sentiment", "keyMoments", "score", "strengths", "concerns"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No analysis content returned");
    }

    const analysis = JSON.parse(content);

    return {
      transcription,
      sentiment: analysis.sentiment,
      keyMoments: analysis.keyMoments,
      score: analysis.score,
      strengths: analysis.strengths,
      concerns: analysis.concerns,
    };
  } catch (error) {
    console.error("Analysis error:", error);
    throw new Error("Failed to analyze interview");
  }
}

/**
 * Complete interview processing pipeline
 */
export async function processInterview(
  videoBuffer: Buffer,
  candidateId: string,
  interviewId: string
): Promise<InterviewAnalysisResult> {
  const startTime = Date.now();

  // Step 1: Upload video to S3
  const videoUrl = await uploadInterviewVideo(
    videoBuffer,
    candidateId,
    interviewId
  );

  // Step 2: Transcribe audio
  const transcription = await transcribeInterview(videoUrl);

  // Step 3: Analyze with AI
  const analysis = await analyzeInterviewTranscription(transcription);

  const processingTime = Date.now() - startTime;

  return {
    videoUrl,
    ...analysis,
    processingTime,
  };
}
