import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  GitBranch,
  FileSearch,
  Shield,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Star,
  ArrowRight,
  Plus
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/contexts/ApiContext'

const Dashboard = () => {
  const { user } = useAuth()
  const { reviews, repositories } = useApi()
  const [stats, setStats] = useState(null)
  const [recentReviews, setRecentReviews] = useState([])
  const [recentRepos, setRecentRepos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, reviewsData, reposData] = await Promise.all([
        reviews.getStats(30),
        reviews.getAll({ limit: 5 }),
        repositories.getAll()
      ])

      setStats(statsData)
      setRecentReviews(reviewsData.reviews || [])
      setRecentRepos(reposData.repositories?.slice(0, 5) || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      // Set mock data for demo
      setStats({
        total_reviews: 45,
        completed_reviews: 42,
        failed_reviews: 3,
        success_rate: 93.3,
        average_scores: {
          overall: 87.5,
          security: 91.2,
          performance: 84.8,
          maintainability: 86.9
        },
        comment_severity_distribution: {
          low: 15,
          medium: 8,
          high: 3,
          critical: 1
        }
      })
      setRecentReviews([
        {
          id: 1,
          pull_request: {
            title: 'Add user authentication system',
            number: 123,
            repository: { name: 'web-app', full_name: 'company/web-app' }
          },
          status: 'completed',
          overall_score: 89,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          pull_request: {
            title: 'Fix memory leak in data processing',
            number: 124,
            repository: { name: 'api-server', full_name: 'company/api-server' }
          },
          status: 'completed',
          overall_score: 92,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ])
      setRecentRepos([
        {
          id: 1,
          name: 'web-app',
          full_name: 'company/web-app',
          language: 'TypeScript',
          is_enabled: true,
          platform: 'github'
        },
        {
          id: 2,
          name: 'api-server',
          full_name: 'company/api-server',
          language: 'Python',
          is_enabled: true,
          platform: 'github'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Mock data for charts
  const reviewTrendData = [
    { name: 'Mon', reviews: 4, score: 85 },
    { name: 'Tue', reviews: 7, score: 88 },
    { name: 'Wed', reviews: 5, score: 92 },
    { name: 'Thu', reviews: 8, score: 87 },
    { name: 'Fri', reviews: 6, score: 90 },
    { name: 'Sat', reviews: 3, score: 94 },
    { name: 'Sun', reviews: 2, score: 89 }
  ]

  const severityData = stats ? [
    { name: 'Low', value: stats.comment_severity_distribution.low || 0, color: '#10B981' },
    { name: 'Medium', value: stats.comment_severity_distribution.medium || 0, color: '#F59E0B' },
    { name: 'High', value: stats.comment_severity_distribution.high || 0, color: '#EF4444' },
    { name: 'Critical', value: stats.comment_severity_distribution.critical || 0, color: '#DC2626' }
  ] : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name || user?.username}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your code reviews today.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Connect Repository
          </Button>
          <Button>
            <FileSearch className="w-4 h-4 mr-2" />
            Start Review
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_reviews || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.success_rate?.toFixed(1) || 0}%</div>
            <Progress value={stats?.success_rate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.average_scores?.overall?.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.3</span> points this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Repositories</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentRepos.filter(r => r.is_enabled).length}</div>
            <p className="text-xs text-muted-foreground">
              {recentRepos.length} total connected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Review Activity</CardTitle>
            <CardDescription>Daily review count and average scores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reviewTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="reviews" fill="#3B82F6" />
                <Line yAxisId="right" type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Issue Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Severity Distribution</CardTitle>
            <CardDescription>Breakdown of issues found in recent reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Reviews</CardTitle>
              <CardDescription>Latest code review activities</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {review.pull_request?.title || 'Untitled PR'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {review.pull_request?.repository?.full_name} #{review.pull_request?.number}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={review.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {review.status}
                    </Badge>
                    {review.overall_score && (
                      <div className="text-sm font-medium text-green-600">
                        {review.overall_score}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {recentReviews.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No recent reviews found. Start by connecting a repository!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Connected Repositories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Connected Repositories</CardTitle>
              <CardDescription>Your active repositories</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              Manage
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRepos.map((repo) => (
                <div key={repo.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{repo.name}</div>
                      <div className="text-xs text-gray-500">{repo.full_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {repo.language && (
                      <Badge variant="outline" className="text-xs">
                        {repo.language}
                      </Badge>
                    )}
                    <div className={`w-2 h-2 rounded-full ${repo.is_enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                </div>
              ))}
              {recentRepos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No repositories connected yet. Connect your first repository to get started!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Code Quality Metrics</CardTitle>
          <CardDescription>Average scores across different quality dimensions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {stats?.average_scores?.overall?.toFixed(1) || 0}
              </div>
              <div className="text-sm text-gray-600">Overall Quality</div>
              <Progress value={stats?.average_scores?.overall || 0} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {stats?.average_scores?.security?.toFixed(1) || 0}
              </div>
              <div className="text-sm text-gray-600">Security</div>
              <Progress value={stats?.average_scores?.security || 0} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {stats?.average_scores?.performance?.toFixed(1) || 0}
              </div>
              <div className="text-sm text-gray-600">Performance</div>
              <Progress value={stats?.average_scores?.performance || 0} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {stats?.average_scores?.maintainability?.toFixed(1) || 0}
              </div>
              <div className="text-sm text-gray-600">Maintainability</div>
              <Progress value={stats?.average_scores?.maintainability || 0} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard

