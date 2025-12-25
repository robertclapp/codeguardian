import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Palette, 
  Type, 
  Building2, 
  Globe, 
  Image, 
  Eye,
  Upload,
  Plus,
  X,
  Loader2,
  Check
} from "lucide-react";

export default function BrandingSettings() {
  const { data: branding, isLoading, refetch } = trpc.branding.get.useQuery({});
  const { data: fonts } = trpc.branding.getFonts.useQuery();
  const { data: colorPresets } = trpc.branding.getColorPresets.useQuery();
  
  const updateMutation = trpc.branding.update.useMutation({
    onSuccess: () => {
      toast.success("Branding settings saved!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const uploadLogoMutation = trpc.branding.uploadLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo uploaded!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const uploadHeroMutation = trpc.branding.uploadHeroImage.useMutation({
    onSuccess: () => {
      toast.success("Hero image uploaded!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [formData, setFormData] = useState<any>(null);
  const [newBenefit, setNewBenefit] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data when branding loads
  if (branding && !formData) {
    setFormData({
      primaryColor: branding.primaryColor || "#3B82F6",
      secondaryColor: branding.secondaryColor || "#1E40AF",
      accentColor: branding.accentColor || "#10B981",
      backgroundColor: branding.backgroundColor || "#FFFFFF",
      textColor: branding.textColor || "#1F2937",
      headingFont: branding.headingFont || "Inter",
      bodyFont: branding.bodyFont || "Inter",
      organizationName: branding.organizationName || "",
      tagline: branding.tagline || "",
      description: branding.description || "",
      mission: branding.mission || "",
      contactEmail: branding.contactEmail || "",
      contactPhone: branding.contactPhone || "",
      address: branding.address || "",
      websiteUrl: branding.websiteUrl || "",
      linkedinUrl: branding.linkedinUrl || "",
      twitterUrl: branding.twitterUrl || "",
      facebookUrl: branding.facebookUrl || "",
      instagramUrl: branding.instagramUrl || "",
      showMission: branding.showMission || 1,
      showBenefits: branding.showBenefits || 1,
      showTeamSection: branding.showTeamSection || 0,
      customCss: branding.customCss || "",
      benefits: branding.benefits || [],
    });
  }

  const handleSave = () => {
    if (!formData) return;
    updateMutation.mutate(formData);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadLogoMutation.mutate({
        fileData: base64,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadHeroMutation.mutate({
        fileData: base64,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const addBenefit = () => {
    if (!newBenefit.trim() || !formData) return;
    setFormData({
      ...formData,
      benefits: [...(formData.benefits || []), newBenefit.trim()],
    });
    setNewBenefit("");
  };

  const removeBenefit = (index: number) => {
    if (!formData) return;
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_: string, i: number) => i !== index),
    });
  };

  const applyColorPreset = (preset: { primary: string; secondary: string; accent: string }) => {
    if (!formData) return;
    setFormData({
      ...formData,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    });
  };

  if (isLoading || !formData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Career Site Branding</h1>
            <p className="text-muted-foreground mt-1">
              Customize your public career site to match your organization's brand
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open("/careers", "_blank")}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Site
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Identity</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Colors</span>
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Typography</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>
                  Basic information about your organization displayed on the career site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      placeholder="Your Organization Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      placeholder="Building a Better Future Together"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell candidates about your organization..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mission">Mission Statement</Label>
                  <Textarea
                    id="mission"
                    value={formData.mission}
                    onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                    placeholder="Your organization's mission..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="careers@example.org"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input
                      id="phone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://example.org"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City, State 12345"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benefits & Perks</CardTitle>
                <CardDescription>
                  Highlight what makes working at your organization great
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    placeholder="Add a benefit..."
                    onKeyDown={(e) => e.key === "Enter" && addBenefit()}
                  />
                  <Button onClick={addBenefit} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits?.map((benefit: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm"
                    >
                      {benefit}
                      <button
                        onClick={() => removeBenefit(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Display Settings</CardTitle>
                <CardDescription>
                  Choose what sections to show on your career site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Mission Statement</Label>
                    <p className="text-sm text-muted-foreground">Display your mission on the career site</p>
                  </div>
                  <Switch
                    checked={formData.showMission === 1}
                    onCheckedChange={(checked) => setFormData({ ...formData, showMission: checked ? 1 : 0 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Benefits Section</Label>
                    <p className="text-sm text-muted-foreground">Display benefits and perks</p>
                  </div>
                  <Switch
                    checked={formData.showBenefits === 1}
                    onCheckedChange={(checked) => setFormData({ ...formData, showBenefits: checked ? 1 : 0 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Team Section</Label>
                    <p className="text-sm text-muted-foreground">Display team members (coming soon)</p>
                  </div>
                  <Switch
                    checked={formData.showTeamSection === 1}
                    onCheckedChange={(checked) => setFormData({ ...formData, showTeamSection: checked ? 1 : 0 })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Color Presets</CardTitle>
                <CardDescription>
                  Quick-apply a color scheme or customize individual colors below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {colorPresets?.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyColorPreset(preset)}
                      className="p-4 border rounded-lg hover:border-primary transition-colors text-left"
                    >
                      <div className="flex gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: preset.secondary }}
                        />
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: preset.accent }}
                        />
                      </div>
                      <p className="font-medium">{preset.name}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Colors</CardTitle>
                <CardDescription>
                  Fine-tune your brand colors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    { key: "primaryColor", label: "Primary Color", desc: "Main brand color" },
                    { key: "secondaryColor", label: "Secondary Color", desc: "Supporting color" },
                    { key: "accentColor", label: "Accent Color", desc: "Highlights and CTAs" },
                    { key: "backgroundColor", label: "Background", desc: "Page background" },
                    { key: "textColor", label: "Text Color", desc: "Main text color" },
                  ].map((color) => (
                    <div key={color.key} className="space-y-2">
                      <Label>{color.label}</Label>
                      <p className="text-xs text-muted-foreground">{color.desc}</p>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData[color.key]}
                          onChange={(e) => setFormData({ ...formData, [color.key]: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={formData[color.key]}
                          onChange={(e) => setFormData({ ...formData, [color.key]: e.target.value })}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Color Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="p-6 rounded-lg"
                  style={{ backgroundColor: formData.backgroundColor }}
                >
                  <h3
                    className="text-2xl font-bold mb-2"
                    style={{ color: formData.primaryColor }}
                  >
                    Sample Heading
                  </h3>
                  <p style={{ color: formData.textColor }} className="mb-4">
                    This is how your text will appear on the career site.
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: formData.accentColor }}
                    >
                      Accent Button
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Font Selection</CardTitle>
                <CardDescription>
                  Choose fonts that match your brand personality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Heading Font</Label>
                    <Select
                      value={formData.headingFont}
                      onValueChange={(value) => setFormData({ ...formData, headingFont: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fonts?.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p
                      className="text-2xl font-bold mt-2"
                      style={{ fontFamily: formData.headingFont }}
                    >
                      Preview Heading
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Body Font</Label>
                    <Select
                      value={formData.bodyFont}
                      onValueChange={(value) => setFormData({ ...formData, bodyFont: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fonts?.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p
                      className="mt-2"
                      style={{ fontFamily: formData.bodyFont }}
                    >
                      This is how your body text will appear throughout the career site.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>
                  Upload your organization's logo (recommended: 200x60px, PNG or SVG)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {branding?.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt="Logo"
                      className="h-16 object-contain"
                    />
                  ) : (
                    <div className="h-16 w-48 bg-muted rounded flex items-center justify-center">
                      <span className="text-muted-foreground">No logo</span>
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadLogoMutation.isPending}
                    >
                      {uploadLogoMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Logo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hero Image</CardTitle>
                <CardDescription>
                  Upload a hero image for the career site header (recommended: 1920x600px)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {branding?.heroImageUrl ? (
                    <img
                      src={branding.heroImageUrl}
                      alt="Hero"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground">No hero image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={heroInputRef}
                    onChange={handleHeroUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => heroInputRef.current?.click()}
                    disabled={uploadHeroMutation.isPending}
                  >
                    {uploadHeroMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Hero Image
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
                <CardDescription>
                  Add your social media profiles to the career site footer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input
                      value={formData.linkedinUrl}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter / X</Label>
                    <Input
                      value={formData.twitterUrl}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook</Label>
                    <Input
                      value={formData.facebookUrl}
                      onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input
                      value={formData.instagramUrl}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom CSS</CardTitle>
                <CardDescription>
                  Advanced: Add custom CSS for additional styling (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.customCss}
                  onChange={(e) => setFormData({ ...formData, customCss: e.target.value })}
                  placeholder="/* Add custom CSS here */"
                  rows={6}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
