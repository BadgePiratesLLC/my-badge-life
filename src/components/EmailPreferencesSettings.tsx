import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useEmailPreferences } from '@/hooks/useEmailPreferences'
import { Skeleton } from '@/components/ui/skeleton'
import { Mail, Bell, Megaphone, CheckCircle, XCircle } from 'lucide-react'

export function EmailPreferencesSettings() {
  const { preferences, loading, saving, togglePreference } = useEmailPreferences()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Loading your email preferences...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-11" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Failed to load email preferences</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const preferenceItems = [
    {
      key: 'badge_submission_notifications' as const,
      icon: <Bell className="h-4 w-4 text-blue-500" />,
      title: 'Badge Submission Notifications',
      description: 'Get notified when badges you submitted are reviewed (admins only)',
      value: preferences.badge_submission_notifications,
      category: 'Badge Updates'
    },
    {
      key: 'badge_approval_notifications' as const,
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      title: 'Badge Approval Notifications',
      description: 'Receive emails when your badges are approved',
      value: preferences.badge_approval_notifications,
      category: 'Badge Updates'
    },
    {
      key: 'badge_rejection_notifications' as const,
      icon: <XCircle className="h-4 w-4 text-red-500" />,
      title: 'Badge Rejection Notifications',
      description: 'Get feedback when badges need revision',
      value: preferences.badge_rejection_notifications,
      category: 'Badge Updates'
    },
    {
      key: 'weekly_digest_emails' as const,
      icon: <Mail className="h-4 w-4 text-purple-500" />,
      title: 'Weekly Digest',
      description: 'Summary of new badges, trending makers, and community updates',
      value: preferences.weekly_digest_emails,
      category: 'Regular Updates'
    },
    {
      key: 'system_announcements' as const,
      icon: <Megaphone className="h-4 w-4 text-orange-500" />,
      title: 'System Announcements',
      description: 'Important updates about MyBadgeLife features and policies',
      value: preferences.system_announcements,
      category: 'System'
    }
  ]

  const categories = [...new Set(preferenceItems.map(item => item.category))]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Control which email notifications you receive from MyBadgeLife
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map((category, categoryIndex) => (
          <div key={category}>
            {categoryIndex > 0 && <Separator className="my-6" />}
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
              
              {preferenceItems
                .filter(item => item.category === category)
                .map((item) => (
                  <div key={item.key} className="flex items-center justify-between space-x-4">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-1">
                        {item.icon}
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label 
                          htmlFor={item.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {item.title}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={item.key}
                      checked={item.value}
                      onCheckedChange={() => togglePreference(item.key)}
                      disabled={saving}
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}
        
        <Separator className="my-6" />
        
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-start space-x-3">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Opt-In Email System</p>
              <p className="text-xs text-muted-foreground">
                All email notifications are <strong>disabled by default</strong>. Enable the notifications you want to receive above. 
                Welcome emails and critical security notifications will always be sent regardless of these settings.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}