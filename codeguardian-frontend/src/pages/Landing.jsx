import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Shield,
  Zap,
  Brain,
  Users,
  CheckCircle,
  Star,
  ArrowRight,
  Github,
  GitBranch,
  FileSearch,
  GraduationCap,
  Lock,
  Gauge,
  Target
} from 'lucide-react'

const Landing = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const features = [
    {
      icon: Shield,
      title: 'Security-First Architecture',
      description: 'Zero-knowledge encryption and sandboxed execution ensure your code stays private and secure.',
      highlight: 'Military-grade security'
    },
    {
      icon: Brain,
      title: 'Advanced AI Intelligence',
      description: 'Multi-model AI ensemble provides context-aware reviews with deep codebase understanding.',
      highlight: '10x more accurate'
    },
    {
      icon: Zap,
      title: 'Lightning Fast Reviews',
      description: 'Get comprehensive code reviews in seconds, not minutes. Sub-second response times guaranteed.',
      highlight: 'Sub-second speed'
    },
    {
      icon: GraduationCap,
      title: 'AI-Powered Mentorship',
      description: 'Personalized learning paths and skill development based on your coding patterns.',
      highlight: 'Learn while you code'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Real-time code review sessions with intelligent discussion threads and knowledge sharing.',
      highlight: 'Built for teams'
    },
    {
      icon: Target,
      title: 'Smart Integrations',
      description: 'Works with all major platforms: GitHub, GitLab, Bitbucket, VS Code, and more.',
      highlight: 'Universal compatibility'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Senior Developer at TechCorp',
      avatar: '/api/placeholder/40/40',
      content: 'CodeGuardian caught security vulnerabilities that our team missed. The AI mentorship feature has improved our junior developers\' skills dramatically.',
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      role: 'CTO at StartupXYZ',
      avatar: '/api/placeholder/40/40',
      content: 'We switched from CodeRabbit after their security breach. CodeGuardian is faster, more secure, and the pricing is actually reasonable for small teams.',
      rating: 5
    },
    {
      name: 'Emily Johnson',
      role: 'Lead Engineer at DevStudio',
      avatar: '/api/placeholder/40/40',
      content: 'The real-time collaboration features are game-changing. Our code review process is now 3x faster and much more educational for the whole team.',
      rating: 5
    }
  ]

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for individual developers and open source projects',
      features: [
        '5 reviews per month',
        'Basic AI analysis',
        'GitHub integration',
        'Community support'
      ],
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Pro',
      price: '$15',
      period: 'per developer/month',
      description: 'Ideal for small to medium teams',
      features: [
        'Unlimited reviews',
        'Advanced AI ensemble',
        'All platform integrations',
        'Real-time collaboration',
        'AI mentorship',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      description: 'For large organizations with specific needs',
      features: [
        'Everything in Pro',
        'On-premise deployment',
        'Custom integrations',
        'Advanced analytics',
        'Dedicated support',
        'SLA guarantees'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ]

  const handleGetStarted = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-2">
                <span className="text-white font-bold text-sm">CG</span>
              </div>
              <span className="text-xl font-semibold">CodeGuardian</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={handleGetStarted}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-4" variant="secondary">
              🚀 The CodeRabbit Alternative You've Been Waiting For
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI Code Reviews That
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Actually Work</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Secure, intelligent, and lightning-fast code reviews with AI-powered mentorship. 
              Built for developers who demand excellence without compromising security.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button size="lg" onClick={handleGetStarted} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline">
                <Github className="mr-2 w-4 h-4" />
                Connect GitHub
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Developers Choose CodeGuardian
            </h2>
            <p className="text-xl text-gray-600">
              Built to address the critical gaps in existing code review tools
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {feature.highlight}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Developers Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what teams are saying about CodeGuardian
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-semibold text-sm">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that's right for your team
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`border-2 ${plan.popular ? 'border-blue-500 shadow-xl' : 'border-gray-200'} relative`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {plan.price}
                    {plan.price !== 'Custom' && <span className="text-lg text-gray-500">/{plan.period}</span>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={handleGetStarted}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Code Reviews?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of developers who've made the switch to secure, intelligent code reviews.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={handleGetStarted}>
              Start Free Trial
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white font-bold text-sm">CG</span>
                </div>
                <span className="text-xl font-semibold">CodeGuardian</span>
              </div>
              <p className="text-gray-400">
                Secure, intelligent code reviews for modern development teams.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 CodeGuardian. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing

