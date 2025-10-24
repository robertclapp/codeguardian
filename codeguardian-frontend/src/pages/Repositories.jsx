import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GitBranch,
  Plus,
  Settings,
  Sync,
  Trash2,
  Github,
  Search,
  Filter,
  Star,
  GitFork,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react'
import { useApi } from '@/contexts/ApiContext'

const Repositories = () => {
  const { repositories } = useApi()
  const [repos, setRepos] = useState([])
  const [discoveredRepos, setDiscoveredRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [discoverDialogOpen, setDiscoverDialogOpen] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  useEffect(() => {
    loadRepositories()
  }, [])

  const loadRepositories = async () => {
    try {
      const data = await repositories.getAll()
      setRepos(data.repositories || [])
    } catch (error) {
      console.error('Failed to load repositories:', error)
      // Set mock data for demo
      setRepos([
        {
          id: 1,
          name: 'web-app',
          full_name: 'company/web-app',
          platform: 'github',
          language: 'TypeScript',
          description: 'Main web application frontend',
          is_private: false,
          is_enabled: true,
          stars_count: 45,
          forks_count: 12,
          last_sync: new Date().toISOString()
        },
        {
          id: 2,
          name: 'api-server',
          full_name: 'company/api-server',
          platform: 'github',
          language: 'Python',
          description: 'Backend API server with FastAPI',
          is_private: true,
          is_enabled: true,
          stars_count: 23,
          forks_count: 5,
          last_sync: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          name: 'mobile-app',
          full_name: 'company/mobile-app',
          platform: 'github',
          language: 'React Native',
          description: 'Cross-platform mobile application',
          is_private: true,
          is_enabled: false,
          stars_count: 8,
          forks_count: 2,
          last_sync: new Date(Date.now() - 86400000).toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleDiscoverRepos = async () => {
    try {
      // Mock GitHub token for demo
      const mockToken = 'demo-github-token'
      const data = await repositories.discover('github', mockToken)
      setDiscoveredRepos(data.repositories || [])
    } catch (error) {
      console.error('Failed to discover repositories:', error)
      // Set mock discovered repos for demo
      setDiscoveredRepos([
        {
          id: 'gh-123',
          name: 'new-project',
          full_name: 'company/new-project',
          description: 'A new exciting project',
          language: 'JavaScript',
          is_private: false,
          stars_count: 15,
          is_connected: false
        },
        {
          id: 'gh-124',
          name: 'data-pipeline',
          full_name: 'company/data-pipeline',
          description: 'ETL pipeline for data processing',
          language: 'Python',
          is_private: true,
          stars_count: 7,
          is_connected: false
        }
      ])
    }
  }

  const handleConnectRepo = async (repoData) => {
    try {
      const result = await repositories.connect({
        platform: 'github',
        repo_url: `https://github.com/${repoData.full_name}`,
        access_token: 'demo-github-token'
      })
      
      // Refresh repositories list
      loadRepositories()
      setConnectDialogOpen(false)
      setDiscoverDialogOpen(false)
    } catch (error) {
      console.error('Failed to connect repository:', error)
    }
  }

  const handleToggleRepo = async (repo) => {
    try {
      await repositories.updateSettings(repo.id, {
        is_enabled: !repo.is_enabled
      })
      
      // Update local state
      setRepos(repos.map(r => 
        r.id === repo.id ? { ...r, is_enabled: !r.is_enabled } : r
      ))
    } catch (error) {
      console.error('Failed to toggle repository:', error)
    }
  }

  const handleSyncRepo = async (repo) => {
    try {
      await repositories.sync(repo.id)
      
      // Update last sync time
      setRepos(repos.map(r => 
        r.id === repo.id ? { ...r, last_sync: new Date().toISOString() } : r
      ))
    } catch (error) {
      console.error('Failed to sync repository:', error)
    }
  }

  const handleDeleteRepo = async (repo) => {
    if (confirm(`Are you sure you want to disconnect ${repo.full_name}?`)) {
      try {
        await repositories.disconnect(repo.id)
        setRepos(repos.filter(r => r.id !== repo.id))
      } catch (error) {
        console.error('Failed to delete repository:', error)
      }
    }
  }

  const filteredRepos = repos.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'enabled' && repo.is_enabled) ||
                         (filterStatus === 'disabled' && !repo.is_enabled) ||
                         (filterStatus === 'private' && repo.is_private) ||
                         (filterStatus === 'public' && !repo.is_private)
    
    return matchesSearch && matchesFilter
  })

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
          <h1 className="text-3xl font-bold text-gray-900">Repositories</h1>
          <p className="text-gray-600 mt-1">
            Manage your connected repositories and review settings
          </p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={discoverDialogOpen} onOpenChange={setDiscoverDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={handleDiscoverRepos}>
                <Search className="w-4 h-4 mr-2" />
                Discover
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Discover Repositories</DialogTitle>
                <DialogDescription>
                  Find repositories from your connected platforms
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {discoveredRepos.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{repo.full_name}</div>
                      <div className="text-sm text-gray-500 mt-1">{repo.description}</div>
                      <div className="flex items-center space-x-4 mt-2">
                        {repo.language && (
                          <Badge variant="outline" className="text-xs">
                            {repo.language}
                          </Badge>
                        )}
                        <div className="flex items-center text-xs text-gray-500">
                          <Star className="w-3 h-3 mr-1" />
                          {repo.stars_count}
                        </div>
                        {repo.is_private ? (
                          <EyeOff className="w-3 h-3 text-gray-500" />
                        ) : (
                          <Eye className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleConnectRepo(repo)}
                      disabled={repo.is_connected}
                      size="sm"
                    >
                      {repo.is_connected ? 'Connected' : 'Connect'}
                    </Button>
                  </div>
                ))}
                {discoveredRepos.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No repositories found. Make sure you have access to repositories on GitHub.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Connect Repository
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Repository</DialogTitle>
                <DialogDescription>
                  Connect a repository from GitHub, GitLab, or Bitbucket
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select defaultValue="github">
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">
                        <div className="flex items-center">
                          <Github className="w-4 h-4 mr-2" />
                          GitHub
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="repo-url">Repository URL</Label>
                  <Input
                    id="repo-url"
                    placeholder="https://github.com/username/repository"
                  />
                </div>
                <div>
                  <Label htmlFor="access-token">Access Token</Label>
                  <Input
                    id="access-token"
                    type="password"
                    placeholder="Your GitHub personal access token"
                  />
                </div>
                <Button className="w-full">Connect Repository</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search repositories..."
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
            <SelectItem value="all">All Repositories</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Repository Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRepos.map((repo) => (
          <Card key={repo.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{repo.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {repo.full_name}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Switch
                    checked={repo.is_enabled}
                    onCheckedChange={() => handleToggleRepo(repo)}
                    size="sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">
                {repo.description || 'No description available'}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {repo.language && (
                    <Badge variant="outline" className="text-xs">
                      {repo.language}
                    </Badge>
                  )}
                  <div className="flex items-center text-xs text-gray-500">
                    <Star className="w-3 h-3 mr-1" />
                    {repo.stars_count}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <GitFork className="w-3 h-3 mr-1" />
                    {repo.forks_count}
                  </div>
                </div>
                {repo.is_private ? (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-500" />
                )}
              </div>

              <div className="text-xs text-gray-500">
                Last synced: {new Date(repo.last_sync).toLocaleDateString()}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSyncRepo(repo)}
                  >
                    <Sync className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRepo(repo)
                      setSettingsDialogOpen(true)
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRepo(repo)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRepos.length === 0 && (
        <div className="text-center py-12">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterStatus !== 'all' ? 'No repositories found' : 'No repositories connected'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Connect your first repository to start getting AI-powered code reviews'
            }
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Button onClick={() => setConnectDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Repository
            </Button>
          )}
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repository Settings</DialogTitle>
            <DialogDescription>
              Configure review settings for {selectedRepo?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-review">Enable Auto Review</Label>
              <Switch id="auto-review" defaultChecked={selectedRepo?.is_enabled} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="security-scan">Security Scanning</Label>
              <Switch id="security-scan" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="performance-check">Performance Analysis</Label>
              <Switch id="performance-check" defaultChecked />
            </div>
            <div>
              <Label htmlFor="review-level">Review Depth</Label>
              <Select defaultValue="comprehensive">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full">Save Settings</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Repositories

