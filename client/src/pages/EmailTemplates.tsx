import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Eye, Edit, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * Email Templates Management Page
 * Create and manage email templates with merge fields
 */
export default function EmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Mock data - replace with tRPC query
  const templates = [
    {
      id: 1,
      name: "Interview Invitation",
      type: "notification",
      subject: "Interview Invitation for {{jobTitle}}",
      htmlBody: "<p>Dear {{candidateName}},</p><p>We are pleased to invite you for an interview for the position of {{jobTitle}} on {{interviewDate}} at {{interviewTime}}.</p><p>Best regards,<br>{{companyName}}</p>",
      isActive: 1,
      isDefault: 1,
    },
    {
      id: 2,
      name: "Rejection Letter",
      type: "notification",
      subject: "Application Update - {{jobTitle}}",
      htmlBody: "<p>Dear {{candidateName}},</p><p>Thank you for your interest in the {{jobTitle}} position. After careful consideration, we have decided to move forward with other candidates.</p><p>Best regards,<br>{{companyName}}</p>",
      isActive: 1,
      isDefault: 1,
    },
    {
      id: 3,
      name: "Offer Letter",
      type: "notification",
      subject: "Job Offer - {{jobTitle}}",
      htmlBody: "<p>Dear {{candidateName}},</p><p>We are delighted to offer you the position of {{jobTitle}} with a starting salary of {{salary}}. Your start date is {{startDate}}.</p><p>Best regards,<br>{{companyName}}</p>",
      isActive: 1,
      isDefault: 0,
    },
  ];

  const mergeFields = [
    { name: "candidateName", description: "Candidate's full name" },
    { name: "candidateEmail", description: "Candidate's email address" },
    { name: "jobTitle", description: "Job position title" },
    { name: "companyName", description: "Company name" },
    { name: "interviewDate", description: "Interview date" },
    { name: "interviewTime", description: "Interview time" },
    { name: "salary", description: "Offered salary" },
    { name: "startDate", description: "Job start date" },
  ];

  const handlePreview = (template: any) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      toast.success("Template deleted successfully");
    }
  };

  const handleDuplicate = (template: any) => {
    toast.success(`Template "${template.name}" duplicated`);
  };

  const insertMergeField = (field: string) => {
    // Insert merge field at cursor position in editor
    toast.info(`Inserted {{${field}}}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage email templates with merge fields
            </p>
          </div>
          <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedTemplate(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedTemplate ? "Edit Template" : "Create New Template"}
                </DialogTitle>
                <DialogDescription>
                  Use merge fields like {'{{candidateName}}'} to personalize emails
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Interview Invitation"
                      defaultValue={selectedTemplate?.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select defaultValue={selectedTemplate?.type || "notification"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="reference_check">Reference Check</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Interview Invitation for {{jobTitle}}"
                    defaultValue={selectedTemplate?.subject}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Email Body</Label>
                  <Textarea
                    id="body"
                    rows={10}
                    placeholder="Write your email template here..."
                    defaultValue={selectedTemplate?.htmlBody?.replace(/<[^>]*>/g, '')}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Available Merge Fields</Label>
                  <div className="flex flex-wrap gap-2">
                    {mergeFields.map((field) => (
                      <Button
                        key={field.name}
                        variant="outline"
                        size="sm"
                        onClick={() => insertMergeField(field.name)}
                        title={field.description}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {`{{${field.name}}}`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    toast.success("Template saved successfully");
                    setIsEditorOpen(false);
                  }}>
                    Save Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates List */}
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <CardTitle>{template.name}</CardTitle>
                      {template.isDefault === 1 && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {template.isActive === 1 && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    <CardDescription>
                      Type: {template.type} • Subject: {template.subject}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {template.isDefault === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id, template.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                Preview how this template will look with sample data
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Subject:</Label>
                  <p className="mt-1 text-sm">
                    {selectedTemplate.subject
                      .replace(/\{\{candidateName\}\}/g, "John Doe")
                      .replace(/\{\{jobTitle\}\}/g, "Software Engineer")
                      .replace(/\{\{companyName\}\}/g, "Acme Corp")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Body:</Label>
                  <div
                    className="mt-2 p-4 border rounded-lg bg-muted/50"
                    dangerouslySetInnerHTML={{
                      __html: selectedTemplate.htmlBody
                        .replace(/\{\{candidateName\}\}/g, "John Doe")
                        .replace(/\{\{jobTitle\}\}/g, "Software Engineer")
                        .replace(/\{\{companyName\}\}/g, "Acme Corp")
                        .replace(/\{\{interviewDate\}\}/g, "December 20, 2025")
                        .replace(/\{\{interviewTime\}\}/g, "2:00 PM")
                        .replace(/\{\{salary\}\}/g, "$85,000")
                        .replace(/\{\{startDate\}\}/g, "January 15, 2026"),
                    }}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
