import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  CreditCard,
  Key,
  Trash2,
  Save,
  Github
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const Settings = () => {
  const { user, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    company: user?.company || '',
    location: user?.location || '',
    bio: user?.bio || ''
  })
  
  const [notifications, setNotifications] = useState({
    email_reviews: true,
    email_mentions: true,
    email_security: true,
    push_reviews: false,
    push_mentions: true,
    push_security: true
  })

  const [reviewSettings, setReviewSettings] = useState({
    auto_review: true,
    security_scan: true,
    performance_check: true,
    style_check: false,
    review_depth: 'comprehensive'
  })

  const handleProfileUpdate = async () => {
    setLoading(true)
    try {
      await updateProfile(profileData)
      // Show success message
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                <a href="#profile" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-900">
                  <User className="w-4 h-4 mr-3" />
                  Profile
                </a>
                <a href="#notifications" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50">
                  <Bell className="w-4 h-4 mr-3" />
                  Notifications
                </a>
                <a href="#reviews" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50">
                  <SettingsIcon className="w-4 h-4 mr-3" />
                  Review Settings
                </a>
                <a href="#security" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50">
                  <Shield className="w-4 h-4 mr-3" />
                  Security
                </a>
                <a href="#billing" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50">
                  <CreditCard className="w-4 h-4 mr-3" />
                  Billing
                </a>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card id="profile">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profileData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="Enter your company"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profileData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter your location"
                />
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={profileData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself"
                />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Button onClick={handleProfileUpdate} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>
                Your current plan and account information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-medium">Current Plan</div>
                  <div className="text-sm text-gray-600">
                    {user?.plan_type?.toUpperCase() || 'FREE'} Plan
                  </div>
                </div>
                <Badge variant="secondary">
                  {user?.plan_type?.toUpperCase() || 'FREE'}
                </Badge>
              </div>
              
              {user?.trial_end_date && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600">
                    Trial ends: {new Date(user.trial_end_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Button variant="outline">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
                <Button variant="outline">
                  View Billing
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card id="notifications">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Email Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Code Reviews</div>
                      <div className="text-sm text-gray-600">Get notified when reviews are completed</div>
                    </div>
                    <Switch
                      checked={notifications.email_reviews}
                      onCheckedChange={(checked) => setNotifications(prev => ({...prev, email_reviews: checked}))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Mentions</div>
                      <div className="text-sm text-gray-600">When someone mentions you in comments</div>
                    </div>
                    <Switch
                      checked={notifications.email_mentions}
                      onCheckedChange={(checked) => setNotifications(prev => ({...prev, email_mentions: checked}))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Security Alerts</div>
                      <div className="text-sm text-gray-600">Critical security findings</div>
                    </div>
                    <Switch
                      checked={notifications.email_security}
                      onCheckedChange={(checked) => setNotifications(prev => ({...prev, email_security: checked}))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Push Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Code Reviews</div>
                      <div className="text-sm text-gray-600">Real-time review notifications</div>
                    </div>
                    <Switch
                      checked={notifications.push_reviews}
                      onCheckedChange={(checked) => setNotifications(prev => ({...prev, push_reviews: checked}))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Mentions</div>
                      <div className="text-sm text-gray-600">Instant mention notifications</div>
                    </div>
                    <Switch
                      checked={notifications.push_mentions}
                      onCheckedChange={(checked) => setNotifications(prev => ({...prev, push_mentions: checked}))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Settings */}
          <Card id="reviews">
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                Review Settings
              </CardTitle>
              <CardDescription>
                Configure how AI reviews analyze your code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto Review</div>
                  <div className="text-sm text-gray-600">Automatically review new pull requests</div>
                </div>
                <Switch
                  checked={reviewSettings.auto_review}
                  onCheckedChange={(checked) => setReviewSettings(prev => ({...prev, auto_review: checked}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Security Scanning</div>
                  <div className="text-sm text-gray-600">Scan for security vulnerabilities</div>
                </div>
                <Switch
                  checked={reviewSettings.security_scan}
                  onCheckedChange={(checked) => setReviewSettings(prev => ({...prev, security_scan: checked}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Performance Analysis</div>
                  <div className="text-sm text-gray-600">Analyze code performance and optimization</div>
                </div>
                <Switch
                  checked={reviewSettings.performance_check}
                  onCheckedChange={(checked) => setReviewSettings(prev => ({...prev, performance_check: checked}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Style Checking</div>
                  <div className="text-sm text-gray-600">Check code style and formatting</div>
                </div>
                <Switch
                  checked={reviewSettings.style_check}
                  onCheckedChange={(checked) => setReviewSettings(prev => ({...prev, style_check: checked}))}
                />
              </div>

              <div>
                <Label htmlFor="review-depth">Review Depth</Label>
                <Select value={reviewSettings.review_depth} onValueChange={(value) => setReviewSettings(prev => ({...prev, review_depth: value}))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic - Quick overview</SelectItem>
                    <SelectItem value="standard">Standard - Balanced analysis</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive - Deep analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Connected Accounts
              </CardTitle>
              <CardDescription>
                Manage your connected development platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Github className="w-8 h-8 text-gray-700" />
                    <div>
                      <div className="font-medium">GitHub</div>
                      <div className="text-sm text-gray-600">
                        Connected as {user?.username || 'user'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-green-600">
                      Connected
                    </Badge>
                    <Button variant="outline" size="sm">
                      Disconnect
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <Trash2 className="w-5 h-5 mr-2" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div>
                    <div className="font-medium text-red-600">Delete Account</div>
                    <div className="text-sm text-gray-600">
                      Permanently delete your account and all associated data
                    </div>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Settings

