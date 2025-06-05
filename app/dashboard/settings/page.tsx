"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Bell, 
  Shield, 
  Key, 
  Trash2, 
  Download,
  Mail,
  Globe,
  Palette
} from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/libs/supabase/client"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [reports, setReports] = useState(true)
  const [twoFactor, setTwoFactor] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    company: '',
    timezone: ''
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      
      setUser(user)
      setProfileData({
        name: user.user_metadata?.full_name || '',
        email: user.email || '',
        company: user.user_metadata?.company || '',
        timezone: user.user_metadata?.timezone || 'America/New_York'
      })
      
      // Load user preferences (you might want to store these in a separate table)
      setNotifications(user.user_metadata?.notifications !== false)
      setMarketing(user.user_metadata?.marketing === true)
      setReports(user.user_metadata?.reports !== false)
      setTwoFactor(user.user_metadata?.two_factor === true)
      
      setLoading(false)
    }

    getUser()
  }, [supabase.auth, router])

  const handleProfileUpdate = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profileData.name,
          company: profileData.company,
          timezone: profileData.timezone,
        }
      })

      if (error) throw error
      
      // Show success message (you might want to add a toast notification)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    }
  }

  const handlePreferenceUpdate = async (preference: string, value: boolean) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          [preference]: value
        }
      })

      if (error) throw error
    } catch (error) {
      console.error('Error updating preference:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences, security settings, and integrations.
          </p>
        </div>
        <div className="flex items-center justify-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences, security settings, and integrations.
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and account details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="Enter your full name" 
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter your email" 
                value={profileData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support if needed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company (Optional)</Label>
              <Input 
                id="company" 
                placeholder="Enter your company name" 
                value={profileData.company}
                onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input 
                id="timezone" 
                placeholder="Your timezone" 
                value={profileData.timezone}
                onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
              />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setProfileData({
                name: user.user_metadata?.full_name || '',
                email: user.email || '',
                company: user.user_metadata?.company || '',
                timezone: user.user_metadata?.timezone || 'America/New_York'
              })
            }}>Cancel</Button>
            <Button onClick={handleProfileUpdate}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about account activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications about account activity, billing, and updates.
              </p>
            </div>
            <Switch 
              id="email-notifications"
              checked={notifications}
              onCheckedChange={(checked) => {
                setNotifications(checked)
                handlePreferenceUpdate('notifications', checked)
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about new features, tips, and special offers.
              </p>
            </div>
            <Switch 
              id="marketing-emails"
              checked={marketing}
              onCheckedChange={(checked) => {
                setMarketing(checked)
                handlePreferenceUpdate('marketing', checked)
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-reports">Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">
                Get a summary of your usage and activity every week.
              </p>
            </div>
            <Switch 
              id="weekly-reports"
              checked={reports}
              onCheckedChange={(checked) => {
                setReports(checked)
                handlePreferenceUpdate('reports', checked)
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Privacy
          </CardTitle>
          <CardDescription>
            Manage your account security and privacy settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {twoFactor && <Badge variant="secondary" className="text-xs">Enabled</Badge>}
              <Switch 
                id="two-factor"
                checked={twoFactor}
                onCheckedChange={(checked) => {
                  setTwoFactor(checked)
                  handlePreferenceUpdate('two_factor', checked)
                }}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">
                  Last changed: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Active Sessions</Label>
                <p className="text-sm text-muted-foreground">
                  Manage your active login sessions
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage Sessions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API & Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API & Integrations
          </CardTitle>
          <CardDescription>
            Manage API keys and third-party integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <Label>API Access</Label>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Generate API keys to integrate SoundReal with your applications.
            </p>
            <Button variant="outline" disabled>
              Generate API Key
            </Button>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label>Webhook Settings</Label>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Configure webhooks to receive real-time notifications.
            </p>
            <Button variant="outline" disabled>
              Configure Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Export your data or permanently delete your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Export Account Data</Label>
              <p className="text-sm text-muted-foreground">
                Download a copy of all your transformations and account data.
              </p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
            <div>
              <Label className="text-destructive">Delete Account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 