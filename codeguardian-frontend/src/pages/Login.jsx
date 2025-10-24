import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Github, Mail, ArrowLeft, Shield, Zap, Brain } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const { login, loginWithGitHub } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await login(formData.email, formData.password)
      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGitHubLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      // In a real implementation, this would redirect to GitHub OAuth
      // For demo purposes, we'll simulate a successful login
      const mockGitHubToken = 'demo-github-token'
      const result = await loginWithGitHub(mockGitHubToken)
      
      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error || 'GitHub login failed')
      }
    } catch (err) {
      setError('GitHub login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await login('demo@codeguardian.dev', 'demo123')
      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error || 'Demo login failed')
      }
    } catch (err) {
      setError('Demo login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">CG</span>
              </div>
              <span className="text-2xl font-bold">CodeGuardian</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome back to the future of code reviews
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Secure, intelligent, and lightning-fast AI-powered code reviews that help you ship better code faster.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700">Military-grade security with zero-knowledge architecture</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-gray-700">Sub-second code analysis with 10x better accuracy</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Brain className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">AI mentorship that helps you grow as a developer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center lg:hidden mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white font-bold">CG</span>
                </div>
                <span className="text-xl font-bold">CodeGuardian</span>
              </div>
              <CardTitle className="text-2xl">Sign in to your account</CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Demo Login Button */}
              <Button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Mail className="mr-2 h-4 w-4" />
                Try Demo Account
              </Button>

              <Separator className="my-4" />

              {/* GitHub Login */}
              <Button
                onClick={handleGitHubLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <Github className="mr-2 h-4 w-4" />
                Continue with GitHub
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              {/* Email Login Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Button variant="link" className="p-0 h-auto font-normal">
                  Sign up for free
                </Button>
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="text-sm"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to home
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Demo credentials info */}
          <Card className="mt-4 bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">Demo Credentials:</div>
                <div>Email: demo@codeguardian.dev</div>
                <div>Password: demo123</div>
                <div className="mt-2 text-xs text-blue-600">
                  Or click "Try Demo Account" for instant access
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Login

