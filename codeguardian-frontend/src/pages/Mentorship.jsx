import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  GraduationCap,
  Brain,
  Target,
  Clock,
  CheckCircle,
  Plus,
  Play,
  BookOpen,
  Code,
  Lightbulb
} from 'lucide-react'
import { useApi } from '@/contexts/ApiContext'

const Mentorship = () => {
  const { mentorship } = useApi()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newSession, setNewSession] = useState({
    topic: '',
    difficulty_level: 'intermediate'
  })

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await mentorship.getSessions({ limit: 20 })
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to load mentorship sessions:', error)
      // Set mock data for demo
      setSessions([
        {
          id: 1,
          title: 'Advanced React Patterns',
          topic: 'react',
          difficulty_level: 'advanced',
          status: 'completed',
          progress_percentage: 100,
          completion_time_minutes: 45,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 82800000).toISOString()
        },
        {
          id: 2,
          title: 'Python Security Best Practices',
          topic: 'python',
          difficulty_level: 'intermediate',
          status: 'in_progress',
          progress_percentage: 65,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          started_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          title: 'JavaScript Fundamentals',
          topic: 'javascript',
          difficulty_level: 'beginner',
          status: 'not_started',
          progress_percentage: 0,
          created_at: new Date(Date.now() - 1800000).toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async () => {
    try {
      const result = await mentorship.generateSession(newSession.topic, newSession.difficulty_level)
      
      // Refresh sessions list
      loadSessions()
      setCreateDialogOpen(false)
      setNewSession({ topic: '', difficulty_level: 'intermediate' })
    } catch (error) {
      console.error('Failed to create mentorship session:', error)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-600" />
      case 'not_started':
        return <Clock className="w-4 h-4 text-gray-600" />
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
      case 'not_started':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const suggestedTopics = [
    { name: 'React', description: 'Modern React patterns and hooks' },
    { name: 'JavaScript', description: 'ES6+ features and best practices' },
    { name: 'Python', description: 'Python development and frameworks' },
    { name: 'TypeScript', description: 'Type-safe JavaScript development' },
    { name: 'Node.js', description: 'Server-side JavaScript development' },
    { name: 'Security', description: 'Application security best practices' }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">AI Mentorship</h1>
          <p className="text-gray-600 mt-1">
            Personalized learning paths and skill development powered by AI
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Learning Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Learning Session</DialogTitle>
              <DialogDescription>
                Generate a personalized AI mentorship session based on your learning goals
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Select value={newSession.topic} onValueChange={(value) => setNewSession({...newSession, topic: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="react">React</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="nodejs">Node.js</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={newSession.difficulty_level} onValueChange={(value) => setNewSession({...newSession, difficulty_level: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreateSession}>
                <Brain className="w-4 h-4 mr-2" />
                Generate Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Start Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="w-5 h-5 mr-2" />
            Suggested Learning Topics
          </CardTitle>
          <CardDescription>
            Popular topics tailored to your coding patterns and skill level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedTopics.map((topic, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{topic.name}</h4>
                    <Code className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{topic.description}</p>
                  <Button size="sm" variant="outline" className="w-full">
                    Start Learning
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learning Sessions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Learning Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(session.status)}
                    <div>
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {session.topic.charAt(0).toUpperCase() + session.topic.slice(1)} • {session.difficulty_level}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getDifficultyColor(session.difficulty_level)}>
                    {session.difficulty_level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(session.status)}>
                    {session.status.replace('_', ' ')}
                  </Badge>
                  <div className="text-sm text-gray-600">
                    {session.progress_percentage}% complete
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${session.progress_percentage}%` }}
                  />
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <div>Created: {new Date(session.created_at).toLocaleDateString()}</div>
                  {session.completion_time_minutes && (
                    <div>Duration: {session.completion_time_minutes} minutes</div>
                  )}
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    variant={session.status === 'completed' ? 'outline' : 'default'}
                  >
                    {session.status === 'completed' ? (
                      <>
                        <BookOpen className="w-4 h-4 mr-1" />
                        Review
                      </>
                    ) : session.status === 'in_progress' ? (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Continue
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No learning sessions yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first AI-powered mentorship session to start learning and improving your coding skills
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Learning Session
            </Button>
          </div>
        )}
      </div>

      {/* Learning Stats */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Learning Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {sessions.length}
                </div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {sessions.filter(s => s.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {Math.round(sessions.reduce((acc, s) => acc + s.progress_percentage, 0) / sessions.length)}%
                </div>
                <div className="text-sm text-gray-600">Avg Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Mentorship

