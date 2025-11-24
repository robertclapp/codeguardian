import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { 
  Sparkles, 
  Users, 
  Brain, 
  Zap, 
  Shield, 
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  MessageSquare
} from "lucide-react";
import { Link } from "wouter";

/**
 * Landing page for the AI-Powered HR Platform
 * Showcases key features and differentiators vs JazzHR/BambooHR
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <span className="text-2xl font-bold text-primary">{APP_TITLE}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href="#pricing">Pricing</a>
            </Button>
            <Button asChild>
              <a href={getLoginUrl()}>Get Started</a>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI-Powered Recruiting Platform
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
            Hire Better, Faster with{" "}
            <span className="text-primary">AI Intelligence</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The only HR platform that actually solves your problems. No more hours-long outages, 
            useless support, or 90% unqualified candidates. Get instant setup, AI-powered matching, 
            and 24/7 intelligent assistance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="text-lg px-8" asChild>
              <a href={getLoginUrl()}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>

          <p className="text-sm text-gray-500">
            No credit card required • Setup in under 5 minutes • Cancel anytime
          </p>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="container py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                Tired of Your Current HR Platform?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-gray-700 font-medium">❌ Hours-long system outages weekly</p>
                  <p className="text-gray-700 font-medium">❌ Support tickets go unanswered for weeks</p>
                  <p className="text-gray-700 font-medium">❌ 90% of applicants are unqualified</p>
                </div>
                <div className="space-y-3">
                  <p className="text-gray-700 font-medium">❌ 2-month implementation nightmare</p>
                  <p className="text-gray-700 font-medium">❌ Limited customization options</p>
                  <p className="text-gray-700 font-medium">❌ Hidden fees and opaque pricing</p>
                </div>
              </div>
              <p className="text-center mt-6 text-gray-600 italic">
                Sound familiar? You're not alone. These are real complaints from JazzHR and BambooHR users.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Built Different. Built Better.
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Every feature designed to solve the real problems HR teams face every day.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Brain className="h-12 w-12 text-primary mb-4" />
              <CardTitle>AI Candidate Matching</CardTitle>
              <CardDescription>
                Stop wasting time on unqualified applicants. Our AI analyzes resumes and ranks candidates 
                by fit, so you only interview the best.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>0-100 match scores</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Automatic ranking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Batch processing</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <CardTitle>24/7 AI Assistant</CardTitle>
              <CardDescription>
                Get instant help that actually solves problems. No more waiting days for support tickets 
                or dealing with useless chatbots.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Context-aware responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Instant troubleshooting</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Best practice guidance</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Instant Setup</CardTitle>
              <CardDescription>
                Start hiring in minutes, not months. No painful implementation, no complex training, 
                no hidden setup fees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>5-minute onboarding</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>AI-guided setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>No sales calls required</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature 4 */}
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Sparkles className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Smart Job Descriptions</CardTitle>
              <CardDescription>
                Generate compelling, optimized job postings in seconds. Our AI writes descriptions 
                that attract top talent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>SEO optimized</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Inclusive language</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>ATS compatible</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature 5 */}
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>99.9% Uptime SLA</CardTitle>
              <CardDescription>
                No more hours-long outages or printing resumes because the system is down. 
                Enterprise-grade reliability you can count on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Automatic failover</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Real-time monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Transparent status page</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature 6 */}
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Predictive Analytics</CardTitle>
              <CardDescription>
                Get proactive insights on hiring trends, bottlenecks, and candidate quality. 
                Make data-driven decisions with confidence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Time-to-hire tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Pipeline analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Quality metrics</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="container py-20 bg-gray-50 rounded-3xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How We Compare
          </h2>
          <p className="text-xl text-gray-600">
            See why teams are switching from JazzHR and BambooHR
          </p>
        </div>

        <div className="max-w-5xl mx-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2">
                <th className="text-left py-4 px-6 font-semibold">Feature</th>
                <th className="text-center py-4 px-6 font-semibold text-primary">{APP_TITLE}</th>
                <th className="text-center py-4 px-6 font-semibold text-gray-500">JazzHR</th>
                <th className="text-center py-4 px-6 font-semibold text-gray-500">BambooHR</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-4 px-6">AI Candidate Matching</td>
                <td className="text-center py-4 px-6">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                </td>
                <td className="text-center py-4 px-6 text-gray-400">—</td>
                <td className="text-center py-4 px-6 text-gray-400">—</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-6">24/7 AI Support</td>
                <td className="text-center py-4 px-6">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                </td>
                <td className="text-center py-4 px-6 text-gray-400">—</td>
                <td className="text-center py-4 px-6 text-red-500">Deflects to tickets</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-6">Setup Time</td>
                <td className="text-center py-4 px-6 font-semibold text-green-600">5 minutes</td>
                <td className="text-center py-4 px-6 text-gray-600">Hours-Days</td>
                <td className="text-center py-4 px-6 text-red-500">2 months</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-6">Uptime SLA</td>
                <td className="text-center py-4 px-6 font-semibold text-green-600">99.9%</td>
                <td className="text-center py-4 px-6 text-gray-600">Not guaranteed</td>
                <td className="text-center py-4 px-6 text-red-500">Frequent outages</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-6">Transparent Pricing</td>
                <td className="text-center py-4 px-6">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                </td>
                <td className="text-center py-4 px-6 text-red-500">Hidden fees</td>
                <td className="text-center py-4 px-6 text-red-500">Quote-based</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold text-gray-900">
            Ready to Hire Smarter?
          </h2>
          <p className="text-xl text-gray-600">
            Join forward-thinking companies who refuse to settle for outdated HR platforms.
          </p>
          <Button size="lg" className="text-lg px-8" asChild>
            <a href={getLoginUrl()}>
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
          <p className="text-sm text-gray-500">
            No credit card • No sales call • No 2-month implementation
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="container py-12 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-6 w-6" />}
            <span className="font-semibold text-gray-700">{APP_TITLE}</span>
          </div>
          <p className="text-sm text-gray-500">
            © 2025 {APP_TITLE}. Built with ❤️ for HR teams who deserve better.
          </p>
        </div>
      </footer>
    </div>
  );
}
