import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useBadgeManagement } from '@/hooks/useBadgeManagement'
import { toast } from 'sonner'
import { Mail, Send, TestTube, CheckCircle, XCircle } from 'lucide-react'

export function EmailTriggerTester() {
  const { user, profile } = useAuth()
  const { approveBadge, rejectBadge } = useBadgeManagement()
  const [selectedEmailType, setSelectedEmailType] = useState<string>('')
  const [testEmail, setTestEmail] = useState(user?.email || '')
  const [testData, setTestData] = useState({
    badgeName: 'Test Badge',
    makerName: 'Test Maker',
    teamName: 'Test Team',
    rejectionReason: 'This is a test rejection reason for demonstration.',
    userName: 'Test User'
  })
  const [loading, setLoading] = useState(false)

  const sendTestEmail = async () => {
    if (!selectedEmailType || !testEmail) {
      toast.error('Please select email type and enter recipient email')
      return
    }

    setLoading(true)
    try {
      let emailData: any = {}

      switch (selectedEmailType) {
        case 'welcome_user':
          emailData = {
            userName: testData.userName,
            userEmail: testEmail,
            exploreUrl: `${window.location.origin}/`,
            profileUrl: `${window.location.origin}/`,
            makerRequestUrl: `${window.location.origin}/`,
            userId: user?.id
          }
          break

        case 'badge_submitted':
          emailData = {
            badgeName: testData.badgeName,
            makerName: testData.makerName,
            makerEmail: testEmail,
            teamName: testData.teamName,
            category: 'Test Category',
            description: 'This is a test badge submission for email testing.',
            imageUrl: 'https://via.placeholder.com/150x150?text=TEST+BADGE',
            adminUrl: `${window.location.origin}/admin`,
            userId: user?.id
          }
          break

        case 'badge_approved':
          emailData = {
            badgeName: testData.badgeName,
            makerName: testData.makerName,
            teamName: testData.teamName,
            category: 'Test Category',
            imageUrl: 'https://via.placeholder.com/150x150?text=APPROVED',
            badgeUrl: `${window.location.origin}/`,
            exploreUrl: `${window.location.origin}/`,
            userId: user?.id
          }
          break

        case 'badge_rejected':
          emailData = {
            badgeName: testData.badgeName,
            makerName: testData.makerName,
            teamName: testData.teamName,
            category: 'Test Category',
            imageUrl: 'https://via.placeholder.com/150x150?text=REJECTED',
            rejectionReason: testData.rejectionReason,
            guidelinesUrl: `${window.location.origin}/guidelines`,
            submitUrl: `${window.location.origin}/badge/register`,
            userId: user?.id
          }
          break

        case 'maker_request':
          emailData = {
            userName: testData.userName,
            userEmail: testEmail,
            requestMessage: 'This is a test maker request for email testing.',
            userProfileUrl: `${window.location.origin}/admin#users`,
            adminUrl: `${window.location.origin}/admin`,
            registrationDate: new Date().toISOString(),
            userId: user?.id
          }
          break

        default:
          toast.error('Invalid email type selected')
          return
      }

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: selectedEmailType,
          to: testEmail,
          data: emailData
        }
      })

      if (error) throw error

      toast.success(`Test ${selectedEmailType.replace('_', ' ')} email sent to ${testEmail}!`)
      
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error(`Failed to send test email: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testBadgeApproval = async () => {
    setLoading(true)
    try {
      await approveBadge({
        id: 'test-badge-id',
        name: testData.badgeName,
        maker_id: user?.id,
        team_name: testData.teamName,
        category: 'Test Category',
        image_url: 'https://via.placeholder.com/150x150?text=TEST'
      })
    } catch (error) {
      console.error('Error testing badge approval:', error)
    } finally {
      setLoading(false)
    }
  }

  const testBadgeRejection = async () => {
    setLoading(true)
    try {
      await rejectBadge({
        id: 'test-badge-id',
        name: testData.badgeName,
        maker_id: user?.id,
        team_name: testData.teamName,
        category: 'Test Category',
        image_url: 'https://via.placeholder.com/150x150?text=TEST'
      }, testData.rejectionReason)
    } catch (error) {
      console.error('Error testing badge rejection:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Email System Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Type Selection */}
        <div className="space-y-2">
          <Label>Email Template Type</Label>
          <Select value={selectedEmailType} onValueChange={setSelectedEmailType}>
            <SelectTrigger>
              <SelectValue placeholder="Select email template to test" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welcome_user">Welcome User</SelectItem>
              <SelectItem value="badge_submitted">Badge Submitted (to admins)</SelectItem>
              <SelectItem value="badge_approved">Badge Approved (to maker)</SelectItem>
              <SelectItem value="badge_rejected">Badge Rejected (to maker)</SelectItem>
              <SelectItem value="maker_request">Maker Request (to admins)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Test Email Address */}
        <div className="space-y-2">
          <Label>Test Email Address</Label>
          <Input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter email to send test to"
          />
        </div>

        {/* Test Data Configuration */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Test Data</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Badge Name</Label>
              <Input
                value={testData.badgeName}
                onChange={(e) => setTestData(prev => ({ ...prev, badgeName: e.target.value }))}
                placeholder="Test Badge Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Maker Name</Label>
              <Input
                value={testData.makerName}
                onChange={(e) => setTestData(prev => ({ ...prev, makerName: e.target.value }))}
                placeholder="Test Maker Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Team Name</Label>
              <Input
                value={testData.teamName}
                onChange={(e) => setTestData(prev => ({ ...prev, teamName: e.target.value }))}
                placeholder="Test Team Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">User Name</Label>
              <Input
                value={testData.userName}
                onChange={(e) => setTestData(prev => ({ ...prev, userName: e.target.value }))}
                placeholder="Test User Name"
              />
            </div>
          </div>
          
          {selectedEmailType === 'badge_rejected' && (
            <div className="space-y-2">
              <Label className="text-xs">Rejection Reason</Label>
              <Textarea
                value={testData.rejectionReason}
                onChange={(e) => setTestData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                placeholder="Reason for rejection..."
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={sendTestEmail} 
            disabled={loading || !selectedEmailType || !testEmail}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {loading ? 'Sending...' : 'Send Test Email'}
          </Button>

          <Button 
            onClick={testBadgeApproval} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Test Badge Approval Flow
          </Button>

          <Button 
            onClick={testBadgeRejection} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Test Badge Rejection Flow
          </Button>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-start space-x-3">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Email Testing</p>
              <p className="text-xs text-muted-foreground">
                Use this tool to test email templates and delivery. All emails respect user preferences 
                except for welcome emails which are always sent. Check the function logs for delivery status.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}