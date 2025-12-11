import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// Toast functionality - using alert for simplicity
import Editor from "@monaco-editor/react";
import { Mail, MessageSquare, Eye, Save, Plus, Edit, Trash2, Copy } from "lucide-react";

/**
 * Template Editor Page
 * 
 * Provides a visual editor for email and SMS templates with:
 * - Monaco editor for HTML/text editing
 * - Live preview pane with variable substitution
 * - Dropdown for inserting template variables
 * - Version history and template management
 */
export default function TemplateEditor() {
  const toast = ({ title, description, variant }: any) => {
    if (variant === "destructive") {
      alert(`Error: ${title}${description ? `\n${description}` : ""}`);
    } else {
      alert(title);
    }
  };
  const [templateType, setTemplateType] = useState<"email" | "sms">("email");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("notification");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [smsBody, setSmsBody] = useState("");

  // Preview state
  const [previewData, setPreviewData] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    programName: "Job Training Program",
    stageName: "Document Submission",
    documentName: "I-9 Form",
    jobTitle: "Program Coordinator",
    companyName: "Nonprofit Organization",
    dueDate: new Date().toLocaleDateString(),
  });

  // Queries
  const emailTemplatesQuery = trpc.emailTemplates.getAll.useQuery(undefined, {
    enabled: templateType === "email",
  });
  const smsTemplatesQuery = trpc.smsTemplates.getAll.useQuery(undefined, {
    enabled: templateType === "sms",
  });

  // Mutations
  const createEmailTemplate = trpc.emailTemplates.create.useMutation({
    onSuccess: () => {
      toast({ title: "Email template created successfully" });
      emailTemplatesQuery.refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const updateEmailTemplate = trpc.emailTemplates.update.useMutation({
    onSuccess: () => {
      toast({ title: "Email template updated successfully" });
      emailTemplatesQuery.refetch();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const createSmsTemplate = trpc.smsTemplates.create.useMutation({
    onSuccess: () => {
      toast({ title: "SMS template created successfully" });
      smsTemplatesQuery.refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const updateSmsTemplate = trpc.smsTemplates.update.useMutation({
    onSuccess: () => {
      toast({ title: "SMS template updated successfully" });
      smsTemplatesQuery.refetch();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const deleteEmailTemplate = trpc.emailTemplates.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Email template deleted successfully" });
      emailTemplatesQuery.refetch();
      resetForm();
    },
  });

  const deleteSmsTemplate = trpc.smsTemplates.delete.useMutation({
    onSuccess: () => {
      toast({ title: "SMS template deleted successfully" });
      smsTemplatesQuery.refetch();
      resetForm();
    },
  });

  // Available template variables
  const templateVariables = [
    { key: "{{firstName}}", description: "Participant first name" },
    { key: "{{lastName}}", description: "Participant last name" },
    { key: "{{email}}", description: "Participant email" },
    { key: "{{programName}}", description: "Program name" },
    { key: "{{stageName}}", description: "Current stage name" },
    { key: "{{documentName}}", description: "Document name" },
    { key: "{{jobTitle}}", description: "Job title" },
    { key: "{{companyName}}", description: "Company name" },
    { key: "{{dueDate}}", description: "Due date" },
  ];

  // Load selected template
  useEffect(() => {
    if (selectedTemplateId) {
      if (templateType === "email") {
        const template = emailTemplatesQuery.data?.find((t: any) => t.id === selectedTemplateId);
        if (template) {
          setName(template.name);
          setDescription(template.description || "");
          setType(template.type);
          setSubject(template.subject);
          setHtmlBody(template.htmlBody);
          setTextBody(template.textBody || "");
          setIsCreating(false);
        }
      } else {
        const template = smsTemplatesQuery.data?.find((t: any) => t.id === selectedTemplateId);
        if (template) {
          setName(template.name);
          setDescription(template.description || "");
          setType(template.type);
          setSmsBody(template.body);
          setIsCreating(false);
        }
      }
    }
  }, [selectedTemplateId, templateType, emailTemplatesQuery.data, smsTemplatesQuery.data]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("notification");
    setSubject("");
    setHtmlBody("");
    setTextBody("");
    setSmsBody("");
    setSelectedTemplateId(null);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (templateType === "email") {
      if (selectedTemplateId && !isCreating) {
        updateEmailTemplate.mutate({
          id: selectedTemplateId,
          name,
          description,
          type: type as any,
          subject,
          htmlBody,
          textBody,
        });
      } else {
        createEmailTemplate.mutate({
          name,
          description,
          type: type as any,
          subject,
          htmlBody,
          textBody,
        });
      }
    } else {
      if (selectedTemplateId && !isCreating) {
        updateSmsTemplate.mutate({
          id: selectedTemplateId,
          name,
          description,
          type: type as any,
          body: smsBody,
        });
      } else {
        createSmsTemplate.mutate({
          name,
          description,
          type: type as any,
          body: smsBody,
        });
      }
    }
  };

  const handleDelete = () => {
    if (!selectedTemplateId) return;
    if (!confirm("Are you sure you want to delete this template?")) return;

    if (templateType === "email") {
      deleteEmailTemplate.mutate({ id: selectedTemplateId });
    } else {
      deleteSmsTemplate.mutate({ id: selectedTemplateId });
    }
  };

  const insertVariable = (variable: string) => {
    if (templateType === "email") {
      setHtmlBody((prev) => prev + variable);
    } else {
      setSmsBody((prev) => prev + variable);
    }
  };

  // Substitute variables in preview
  const substituteVariables = (text: string): string => {
    let result = text;
    Object.entries(previewData).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    });
    return result;
  };

  const templates = templateType === "email" ? emailTemplatesQuery.data : smsTemplatesQuery.data;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Template Editor</h1>
        <p className="text-muted-foreground">
          Create and manage email and SMS templates with live preview
        </p>
      </div>

      <Tabs value={templateType} onValueChange={(v) => setTemplateType(v as "email" | "sms")}>
        <TabsList className="mb-4">
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS Templates
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates?.map((template: any) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                    selectedTemplateId === template.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.type}</div>
                  {template.isDefault === 1 && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {isCreating ? "Create New Template" : selectedTemplateId ? "Edit Template" : "Select a Template"}
              </CardTitle>
              <CardDescription>
                Use template variables like {"{{firstName}}"}, {"{{email}}"}, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Welcome Email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this template"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Template Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="reference_check">Reference Check</SelectItem>
                    {templateType === "email" && <SelectItem value="compliance">Compliance</SelectItem>}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {templateType === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Welcome to {{programName}}"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Template Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {templateVariables.map((v) => (
                    <Button
                      key={v.key}
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(v.key)}
                      title={v.description}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      {v.key}
                    </Button>
                  ))}
                </div>
              </div>

              {templateType === "email" ? (
                <>
                  <div className="space-y-2">
                    <Label>HTML Body</Label>
                    <div className="border rounded-md overflow-hidden">
                      <Editor
                        height="300px"
                        defaultLanguage="html"
                        value={htmlBody}
                        onChange={(value) => setHtmlBody(value || "")}
                        theme="vs-light"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: "on",
                          wordWrap: "on",
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="textBody">Plain Text Body (Optional)</Label>
                    <Textarea
                      id="textBody"
                      value={textBody}
                      onChange={(e) => setTextBody(e.target.value)}
                      placeholder="Plain text version for email clients that don't support HTML"
                      rows={6}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="smsBody">SMS Body (max 1600 characters)</Label>
                  <Textarea
                    id="smsBody"
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    placeholder="e.g., Hi {{firstName}}, your document {{documentName}} is due on {{dueDate}}."
                    rows={8}
                    maxLength={1600}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {smsBody.length} / 1600 characters
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={!name || (templateType === "email" && !subject)}>
                  <Save className="mr-2 h-4 w-4" />
                  {isCreating ? "Create" : "Save Changes"}
                </Button>
                {selectedTemplateId && !isCreating && (
                  <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>
                <Eye className="inline mr-2 h-4 w-4" />
                Live Preview
              </CardTitle>
              <CardDescription>Preview with sample data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Sample Data</Label>
                <div className="text-xs space-y-1">
                  <div>
                    <strong>Name:</strong> {previewData.firstName} {previewData.lastName}
                  </div>
                  <div>
                    <strong>Email:</strong> {previewData.email}
                  </div>
                  <div>
                    <strong>Program:</strong> {previewData.programName}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
                {templateType === "email" ? (
                  <>
                    {subject && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Subject:</div>
                        <div className="text-sm font-medium">{substituteVariables(subject)}</div>
                      </div>
                    )}
                    {htmlBody && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Body:</div>
                        <div
                          className="text-sm prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: substituteVariables(htmlBody) }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  smsBody && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">SMS Message:</div>
                      <div className="text-sm whitespace-pre-wrap">{substituteVariables(smsBody)}</div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
