import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useBadges } from '@/hooks/useBadges'
import { useTeams } from '@/hooks/useTeams'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BadgeCategory } from '@/lib/supabase'
import { ArrowLeft, Save, Upload, Bug } from 'lucide-react'
import { toast } from 'sonner'

export default function BadgeRegister() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { createBadge } = useBadges()
  const { teams } = useTeams()
  
  // Get image URL and upload ID from query params if coming from admin
  const prefilledImageUrl = searchParams.get('image_url') || ''
  const uploadId = searchParams.get('upload_id')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    year: '',
    external_link: '',
    image_url: prefilledImageUrl,
    team_name: '',
    category: '' as BadgeCategory | ''
  })
  
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('You must be logged in to create a badge')
      return
    }

    if (!formData.name.trim()) {
      toast.error('Badge name is required')
      return
    }

    setLoading(true)

    try {
      await createBadge({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        external_link: formData.external_link.trim() || undefined,
        image_url: formData.image_url.trim() || undefined,
        team_name: formData.team_name.trim() || undefined,
        category: formData.category || undefined
      })

      // If this badge was created from an upload, delete the upload record
      if (uploadId) {
        try {
          console.log('Deleting upload record:', uploadId)
          const { error: deleteError } = await supabase
            .from('uploads')
            .delete()
            .eq('id', uploadId)

          if (deleteError) {
            console.error('Error deleting upload:', deleteError)
            // Don't fail the whole operation, just log it
          } else {
            console.log('Upload record deleted successfully')
          }
        } catch (error) {
          console.error('Error deleting upload record:', error)
          // Don't fail the whole operation
        }
      }

      toast.success('Badge created successfully!')
      navigate('/')
    } catch (error) {
      console.error('Error creating badge:', error)
      toast.error('Failed to create badge: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Badge Register Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold font-mono">BADGE REGISTER</h1>
              <span className="text-xs text-muted-foreground">Create a new badge entry</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Bug Report Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://github.com/BadgePiratesLLC/my-badge-life/issues/new?template=bug_report.md', '_blank')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Bug className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Report Bug</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Badge Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Badge Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., DEF CON 31, BSides Vegas 2024"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the badge, event, or significance..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team_name">Team</Label>
                  <Select value={formData.team_name} onValueChange={(value) => handleInputChange('team_name', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.name}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select badge category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Elect Badge">Elect Badge</SelectItem>
                      <SelectItem value="None Elect Badge">None Elect Badge</SelectItem>
                      <SelectItem value="SAO">SAO</SelectItem>
                      <SelectItem value="Tool">Tool</SelectItem>
                      <SelectItem value="Misc">Misc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => handleInputChange('year', e.target.value)}
                      placeholder="2024"
                      min="1990"
                      max="2030"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="external_link">External Link</Label>
                    <Input
                      id="external_link"
                      type="url"
                      value={formData.external_link}
                      onChange={(e) => handleInputChange('external_link', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleInputChange('image_url', e.target.value)}
                    placeholder="https://..."
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url}
                        alt="Badge preview"
                        className="w-32 h-32 object-cover rounded border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !formData.name.trim()}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Creating Badge...' : 'Create Badge'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}