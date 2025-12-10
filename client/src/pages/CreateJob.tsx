import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Sparkles, Save } from "lucide-react";

/**
 * Job Creation Wizard
 * Multi-step form for creating accessible job postings with AI assistance
 */

type JobFormData = {
  title: string;
  location: string;
  employmentType: "full-time" | "part-time" | "contract" | "internship";
  description: string;
  requirements: string;
  salaryMin: string;
  salaryMax: string;
  accessibilityFeatures: string[];
  programId?: number;
};

const STEPS = [
  { id: 1, title: "Basic Information", description: "Job title, location, and type" },
  { id: 2, title: "Job Description", description: "AI-powered description generator" },
  { id: 3, title: "Requirements", description: "Qualifications and skills" },
  { id: 4, title: "Accessibility", description: "Accommodations and features" },
  { id: 5, title: "Compensation", description: "Salary and benefits" },
  { id: 6, title: "Review & Publish", description: "Preview and finalize" },
];

const ACCESSIBILITY_OPTIONS = [
  { id: "remote", label: "Remote work options available" },
  { id: "flexible", label: "Flexible schedule" },
  { id: "accessible-workspace", label: "Wheelchair accessible workspace" },
  { id: "assistive-tech", label: "Assistive technology provided" },
  { id: "sign-language", label: "Sign language interpreter available" },
  { id: "screen-reader", label: "Screen reader compatible systems" },
  { id: "modified-duties", label: "Modified duties available" },
  { id: "job-coach", label: "Job coaching support" },
];

export default function CreateJob() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    location: "",
    employmentType: "full-time",
    description: "",
    requirements: "",
    salaryMin: "",
    salaryMax: "",
    accessibilityFeatures: [],
  });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const createJobMutation = trpc.jobs.create.useMutation({
    onSuccess: () => {
      toast.success("Job posted successfully!");
      navigate("/dashboard/jobs");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create job");
    },
  });

  const generateDescriptionMutation = trpc.ai.generateJobDescription.useMutation({
    onSuccess: (data) => {
      const description = typeof data.description === 'string' ? data.description : '';
      setFormData((prev) => ({ ...prev, description }));
      toast.success("Job description generated!");
      setIsGeneratingDescription(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate description");
      setIsGeneratingDescription(false);
    },
  });

  const handleGenerateDescription = () => {
    if (!formData.title) {
      toast.error("Please enter a job title first");
      return;
    }
    setIsGeneratingDescription(true);
    generateDescriptionMutation.mutate({
      title: formData.title,
      requirements: formData.requirements || undefined,
    });
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!formData.title || !formData.location) {
        toast.error("Please fill in all required fields");
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.description) {
        toast.error("Please add a job description");
        return;
      }
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = () => {
    // TODO: Implement draft saving
    toast.info("Draft saved locally");
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.location) {
      toast.error("Please complete all required fields");
      return;
    }

    createJobMutation.mutate({
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements || undefined,
      location: formData.location,
      employmentType: formData.employmentType,
      salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
      salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
      status: "open",
    });
  };

  const updateFormData = (field: keyof JobFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAccessibilityFeature = (featureId: string) => {
    setFormData((prev) => ({
      ...prev,
      accessibilityFeatures: prev.accessibilityFeatures.includes(featureId)
        ? prev.accessibilityFeatures.filter((id) => id !== featureId)
        : [...prev.accessibilityFeatures, featureId],
    }));
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard/jobs")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Button>
        <h1 className="text-3xl font-bold">Create New Job Posting</h1>
        <p className="text-muted-foreground mt-2">
          Use our AI-powered wizard to create an accessible, compelling job posting
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <div className="text-xs mt-2 text-center hidden md:block">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-muted-foreground">{step.description}</div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Steps */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData("title", e.target.value)}
                  placeholder="e.g., Peer Support Specialist"
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateFormData("location", e.target.value)}
                  placeholder="e.g., Pittsburgh, PA or Remote"
                />
              </div>
              <div>
                <Label htmlFor="employmentType">Employment Type *</Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value) => updateFormData("employmentType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Job Description */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Job Description *</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription || !formData.title}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGeneratingDescription ? "Generating..." : "Generate with AI"}
                </Button>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                placeholder="Describe the role, responsibilities, and what makes this position special..."
                rows={12}
              />
              <p className="text-sm text-muted-foreground">
                Use our AI assistant to generate a compelling, accessible job description based on the title and requirements.
              </p>
            </div>
          )}

          {/* Step 3: Requirements */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="requirements">Requirements & Qualifications</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => updateFormData("requirements", e.target.value)}
                  placeholder="List the required and preferred qualifications, skills, and experience..."
                  rows={10}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Focus on essential skills and be open to candidates with diverse backgrounds and abilities.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Accessibility */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label>Accessibility Features & Accommodations</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select all accessibility features and accommodations available for this position:
                </p>
                <div className="space-y-3">
                  {ACCESSIBILITY_OPTIONS.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={formData.accessibilityFeatures.includes(option.id)}
                        onCheckedChange={() => toggleAccessibilityFeature(option.id)}
                      />
                      <Label htmlFor={option.id} className="font-normal cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Compensation */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salaryMin">Minimum Salary (Annual)</Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => updateFormData("salaryMin", e.target.value)}
                    placeholder="e.g., 35000"
                  />
                </div>
                <div>
                  <Label htmlFor="salaryMax">Maximum Salary (Annual)</Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => updateFormData("salaryMax", e.target.value)}
                    placeholder="e.g., 45000"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Providing salary information increases transparency and attracts qualified candidates.
              </p>
            </div>
          )}

          {/* Step 6: Review & Publish */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Job Title</h3>
                <p>{formData.title}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Location</h3>
                <p>{formData.location}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Employment Type</h3>
                <p className="capitalize">{formData.employmentType.replace("-", " ")}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="whitespace-pre-wrap">{formData.description}</p>
              </div>
              {formData.requirements && (
                <div>
                  <h3 className="font-semibold mb-2">Requirements</h3>
                  <p className="whitespace-pre-wrap">{formData.requirements}</p>
                </div>
              )}
              {(formData.salaryMin || formData.salaryMax) && (
                <div>
                  <h3 className="font-semibold mb-2">Salary Range</h3>
                  <p>
                    ${formData.salaryMin || "Not specified"} - ${formData.salaryMax || "Not specified"}
                  </p>
                </div>
              )}
              {formData.accessibilityFeatures.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Accessibility Features</h3>
                  <ul className="list-disc list-inside">
                    {formData.accessibilityFeatures.map((featureId) => {
                      const feature = ACCESSIBILITY_OPTIONS.find((opt) => opt.id === featureId);
                      return feature ? <li key={featureId}>{feature.label}</li> : null;
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createJobMutation.isPending}>
              {createJobMutation.isPending ? "Publishing..." : "Publish Job"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
