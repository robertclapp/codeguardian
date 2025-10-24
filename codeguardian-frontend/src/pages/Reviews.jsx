import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileSearch,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Star,
  GitBranch
} from 'lucide-react'
import { useApi } from '@/contexts/ApiContext'

const Reviews = () => {
  const { reviews } = useApi()
  const [reviewList, setReviewList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      const data = await reviews.getAll({ limit: 50 })
      setReviewList(data.reviews || [])
    } catch (error) {
      console.error('Failed to load reviews:', error)
      // Set mock data for demo
      setReviewList([
        {
          id: 1,
          pull_request: {
            title: 'Add user authentication system',
            number: 123,
            repository: { name: 'web-app', full_name: 'company/web-app' }
          },
          status: 'completed',
          overall_score: 89,
          security_score: 92,
          performance_score: 85,
          maintainability_score: 91,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        },
        {
          id: 2,
          pull_request: {
            title: 'Fix memory leak in data processing',
            number: 124,
            repository: { name: 'api-server', full_name: 'company/api-server' }
          },
          status: 'in_progress',
          overall_score: null,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          pull_request: {
            title: 'Implement new dashboard features',
            number: 125,
            repository: { name: 'web-app', full_name: 'company/web-app' }
          },
          status: 'completed',
          overall_score: 94,
          security_score: 96,
          performance_score: 92,
          maintainability_score: 94,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 86000000).toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredReviews = reviewList.filter(review => {
    const matchesSearch = review.pull_request?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.pull_request?.repository?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || review.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Code Reviews</h1>
          <p className="text-gray-600 mt-1">
            AI-powered code reviews and analysis results
          </p>
        </div>
        <Button>
          <FileSearch className="w-4 h-4 mr-2" />
          Start New Review
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <Card key={review.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(review.status)}
                    <h3 className="font-semibold text-lg">
                      {review.pull_request?.title || 'Untitled Review'}
                    </h3>
                    <Badge className={getStatusColor(review.status)}>
                      {review.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <GitBranch className="w-4 h-4 mr-1" />
                      {review.pull_request?.repository?.full_name}
                    </div>
                    <div>PR #{review.pull_request?.number}</div>
                    <div>
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {review.status === 'completed' && review.overall_score && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {review.overall_score}
                        </div>
                        <div className="text-xs text-gray-600">Overall</div>
                      </div>
                      {review.security_score && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {review.security_score}
                          </div>
                          <div className="text-xs text-gray-600">Security</div>
                        </div>
                      )}
                      {review.performance_score && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {review.performance_score}
                          </div>
                          <div className="text-xs text-gray-600">Performance</div>
                        </div>
                      )}
                      {review.maintainability_score && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {review.maintainability_score}
                          </div>
                          <div className="text-xs text-gray-600">Maintainability</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  {review.overall_score && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="font-semibold">{review.overall_score}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReviews.length === 0 && (
        <div className="text-center py-12">
          <FileSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterStatus !== 'all' ? 'No reviews found' : 'No reviews yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Start your first code review by connecting a repository and creating a pull request'
            }
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Button>
              <FileSearch className="w-4 h-4 mr-2" />
              Start Review
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default Reviews

