import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Video,
  Mic,
  Square,
  Play,
  Pause,
  Download,
  Sparkles,
  FileText,
  TrendingUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface InterviewAnalysis {
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
}

/**
 * AI Interview Assistant
 * Record and analyze video interviews with AI
 */
export default function AIInterviewAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(blob);
        }
        setHasRecording(true);
      };

      mediaRecorder.start(1000); // Capture data every second
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to access camera/microphone");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.info("Recording paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      toast.info("Recording resumed");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      toast.success("Recording stopped");
    }
  };

  const analyzeInterview = async () => {
    setIsAnalyzing(true);
    toast.info("Analyzing interview... This may take a moment");

    // Simulate AI analysis (in production, this would call your backend API)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const mockAnalysis: InterviewAnalysis = {
      transcription:
        "Candidate discussed their experience with React and TypeScript, mentioning 5 years of professional development. They highlighted work on e-commerce platforms and demonstrated strong problem-solving skills when discussing technical challenges.",
      sentiment: "positive",
      keyMoments: [
        {
          timestamp: 45,
          description: "Discussed React expertise and recent projects",
          importance: "high",
        },
        {
          timestamp: 120,
          description: "Explained approach to handling technical debt",
          importance: "high",
        },
        {
          timestamp: 180,
          description: "Asked thoughtful questions about team structure",
          importance: "medium",
        },
      ],
      score: 85,
      strengths: [
        "Strong technical background",
        "Clear communication",
        "Demonstrated problem-solving ability",
        "Relevant project experience",
      ],
      concerns: [
        "Limited experience with cloud infrastructure",
        "Could provide more specific examples",
      ],
    };

    setAnalysis(mockAnalysis);
    setIsAnalyzing(false);
    toast.success("Analysis complete!");
  };

  const downloadRecording = () => {
    if (videoRef.current && videoRef.current.src) {
      const a = document.createElement("a");
      a.href = videoRef.current.src;
      a.download = `interview-${Date.now()}.webm`;
      a.click();
      toast.success("Downloading recording...");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500";
      case "negative":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">AI Interview Assistant</h1>
          <p className="text-muted-foreground mt-1">
            Record video interviews and get AI-powered analysis with transcription, sentiment
            analysis, and candidate scoring
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Recording */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Interview
              </CardTitle>
              <CardDescription>
                Record candidate interviews with webcam and microphone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Preview */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  controls={hasRecording && !isRecording}
                />
                {!isRecording && !hasRecording && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">No recording yet</p>
                    </div>
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white font-mono text-sm">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-2">
                {!isRecording && !hasRecording && (
                  <Button onClick={startRecording} className="flex-1">
                    <Mic className="mr-2 h-4 w-4" />
                    Start Recording
                  </Button>
                )}

                {isRecording && !isPaused && (
                  <>
                    <Button onClick={pauseRecording} variant="outline" className="flex-1">
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                    <Button onClick={stopRecording} variant="destructive" className="flex-1">
                      <Square className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  </>
                )}

                {isRecording && isPaused && (
                  <>
                    <Button onClick={resumeRecording} variant="outline" className="flex-1">
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                    <Button onClick={stopRecording} variant="destructive" className="flex-1">
                      <Square className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  </>
                )}

                {hasRecording && !isRecording && (
                  <>
                    <Button onClick={startRecording} variant="outline" className="flex-1">
                      <Mic className="mr-2 h-4 w-4" />
                      New Recording
                    </Button>
                    <Button onClick={downloadRecording} variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={analyzeInterview}
                      disabled={isAnalyzing}
                      className="flex-1"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isAnalyzing ? "Analyzing..." : "Analyze"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                Automated interview analysis and candidate scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysis && !isAnalyzing && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p>Record and analyze an interview to see results</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-4 py-8">
                  <div className="text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing interview with AI...
                    </p>
                  </div>
                  <Progress value={66} className="w-full" />
                </div>
              )}

              {analysis && (
                <div className="space-y-6">
                  {/* Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Score</span>
                      <span className="text-2xl font-bold">{analysis.score}/100</span>
                    </div>
                    <Progress value={analysis.score} className="h-2" />
                  </div>

                  {/* Sentiment */}
                  <div>
                    <span className="text-sm font-medium">Sentiment</span>
                    <div className="mt-2">
                      <Badge className={getSentimentColor(analysis.sentiment)}>
                        {analysis.sentiment.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Transcription */}
                  <div>
                    <span className="text-sm font-medium flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Transcription
                    </span>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {analysis.transcription}
                    </p>
                  </div>

                  {/* Key Moments */}
                  <div>
                    <span className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      Key Moments
                    </span>
                    <div className="space-y-2">
                      {analysis.keyMoments.map((moment, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted"
                        >
                          <Badge variant={getImportanceColor(moment.importance)} className="mt-0.5">
                            {formatTime(moment.timestamp)}
                          </Badge>
                          <span className="flex-1">{moment.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div>
                    <span className="text-sm font-medium flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Strengths
                    </span>
                    <ul className="space-y-1">
                      {analysis.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Concerns */}
                  <div>
                    <span className="text-sm font-medium flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-orange-500 rotate-180" />
                      Areas for Follow-up
                    </span>
                    <ul className="space-y-1">
                      {analysis.concerns.map((concern, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">!</span>
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Info */}
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">Transcription</h3>
                <p className="text-sm text-muted-foreground">
                  Automatic speech-to-text conversion of entire interview
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">Sentiment Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Detect positive, neutral, or negative candidate responses
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">Key Moments</h3>
                <p className="text-sm text-muted-foreground">
                  Identify important timestamps and highlights
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium">Automated Scoring</h3>
                <p className="text-sm text-muted-foreground">
                  AI-generated candidate score based on responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
