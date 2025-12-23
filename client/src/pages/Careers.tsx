import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { MapPin, Clock, DollarSign, Building2, Briefcase, Users, ArrowLeft, Send, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Public-facing career site for candidates
 * Accessible without authentication at /careers
 */
export default function Careers() {
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const { data: settings } = trpc.jobBoard.getSettings.useQuery();
  const { data: publishedJobs, isLoading } = trpc.jobBoard.listPublishedJobs.useQuery();

  const submitMutation = trpc.jobBoard.submitApplication.useMutation({
    onSuccess: () => {
      setApplicationSubmitted(true);
      toast.success("Application submitted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit application");
    },
  });

  const selectedJobData = publishedJobs?.find((j) => j.jobId === selectedJob);

  const handleSubmitApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedJob) return;

    const formData = new FormData(e.currentTarget);
    
    // Convert resume to base64 if uploaded
    let resumeUrl = "";
    if (resumeFile) {
      const reader = new FileReader();
      resumeUrl = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(resumeFile);
      });
    }

    submitMutation.mutate({
      jobId: selectedJob,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      resumeUrl: resumeUrl,
      coverLetter: formData.get("coverLetter") as string,
      linkedinUrl: formData.get("linkedin") as string,
      portfolioUrl: formData.get("portfolio") as string,
      source: "careers_page",
    });
  };

  // Job Listing View
  if (!selectedJob) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section */}
        <div 
          className="relative py-20 px-4"
          style={{ backgroundColor: settings?.primaryColor || "#667eea" }}
        >
          <div className="container mx-auto text-center text-white">
            {settings?.companyLogo && (
              <img 
                src={settings.companyLogo} 
                alt={settings.companyName}
                className="h-16 mx-auto mb-6"
              />
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Join {settings?.companyName || "Our Team"}
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              {settings?.companyDescription || "Discover exciting career opportunities and grow with us."}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="container mx-auto -mt-10 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Briefcase className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold">{publishedJobs?.length || 0}</div>
                <p className="text-muted-foreground">Open Positions</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold">Multiple</div>
                <p className="text-muted-foreground">Locations</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-3xl font-bold">Growing</div>
                <p className="text-muted-foreground">Team</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Job Listings */}
        <div className="container mx-auto py-16 px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Open Positions</h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading positions...</p>
            </div>
          ) : publishedJobs && publishedJobs.length > 0 ? (
            <div className="grid gap-4 max-w-3xl mx-auto">
              {publishedJobs.map((listing) => (
                <Card 
                  key={listing.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedJob(listing.jobId)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{listing.job?.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          {listing.job?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {listing.job.location}
                            </span>
                          )}
                          {listing.job?.employmentType && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {listing.job.employmentType}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {listing.job?.department || "General"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-2">
                      {listing.job?.description?.substring(0, 200)}...
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      {listing.job?.salaryMin && listing.job?.salaryMax && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          ${listing.job.salaryMin.toLocaleString()} - ${listing.job.salaryMax.toLocaleString()}
                        </span>
                      )}
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Open Positions</h3>
              <p className="text-muted-foreground">
                Check back soon for new opportunities!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t py-8 px-4">
          <div className="container mx-auto text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {settings?.companyName || "Company"}. All rights reserved.</p>
            {settings?.footerText && <p className="mt-2">{settings.footerText}</p>}
          </div>
        </footer>
      </div>
    );
  }

  // Job Detail View
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div 
        className="py-8 px-4"
        style={{ backgroundColor: settings?.primaryColor || "#667eea" }}
      >
        <div className="container mx-auto">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/20 mb-4"
            onClick={() => {
              setSelectedJob(null);
              setIsApplying(false);
              setApplicationSubmitted(false);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Jobs
          </Button>
          <h1 className="text-3xl font-bold text-white">{selectedJobData?.job?.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-white/80">
            {selectedJobData?.job?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {selectedJobData.job.location}
              </span>
            )}
            {selectedJobData?.job?.employmentType && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {selectedJobData.job.employmentType}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>About This Role</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedJobData?.job?.description || "" }} />
                
                {selectedJobData?.job?.requirements && (
                  <>
                    <h3 className="text-lg font-semibold mt-6 mb-3">Requirements</h3>
                    <div dangerouslySetInnerHTML={{ __html: selectedJobData.job.requirements }} />
                  </>
                )}

                {selectedJobData?.job?.benefits && (
                  <>
                    <h3 className="text-lg font-semibold mt-6 mb-3">Benefits</h3>
                    <div dangerouslySetInnerHTML={{ __html: selectedJobData.job.benefits }} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Apply Sidebar */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Apply Now</CardTitle>
                <CardDescription>
                  {applicationSubmitted 
                    ? "Your application has been received!"
                    : "Submit your application for this position"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applicationSubmitted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Application Submitted!</h3>
                    <p className="text-muted-foreground mb-4">
                      Thank you for your interest. We'll review your application and get back to you soon.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSelectedJob(null);
                        setApplicationSubmitted(false);
                      }}
                    >
                      Browse More Jobs
                    </Button>
                  </div>
                ) : !isApplying ? (
                  <div className="space-y-4">
                    {selectedJobData?.job?.salaryMin && selectedJobData?.job?.salaryMax && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Salary Range</p>
                        <p className="text-lg font-semibold">
                          ${selectedJobData.job.salaryMin.toLocaleString()} - ${selectedJobData.job.salaryMax.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => setIsApplying(true)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Apply for This Position
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitApplication} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input id="firstName" name="firstName" required />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input id="lastName" name="lastName" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" type="tel" />
                    </div>
                    <div>
                      <Label htmlFor="resume">Resume</Label>
                      <div className="mt-1">
                        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="text-center">
                            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {resumeFile ? resumeFile.name : "Upload Resume (PDF)"}
                            </span>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="linkedin">LinkedIn Profile</Label>
                      <Input id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div>
                      <Label htmlFor="portfolio">Portfolio/Website</Label>
                      <Input id="portfolio" name="portfolio" placeholder="https://..." />
                    </div>
                    <div>
                      <Label htmlFor="coverLetter">Cover Letter</Label>
                      <Textarea 
                        id="coverLetter" 
                        name="coverLetter" 
                        rows={4}
                        placeholder="Tell us why you're interested in this role..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setIsApplying(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={submitMutation.isPending}
                      >
                        {submitMutation.isPending ? "Submitting..." : "Submit Application"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
