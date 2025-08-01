import { useState, useEffect } from 'react'
import { useRoles } from '@/hooks/useRoles'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Upload, Users, Image, Shield, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface Upload {
  id: string
  user_id: string | null
  image_url: string
  created_at: string
  profiles?: {
    display_name: string | null
    email: string | null
  } | null
}

interface User {
  id: string
  email: string | null
  display_name: string | null
  roles: string[]
}

export default function Admin() {
  const { isAdmin, loading: rolesLoading } = useRoles()
  const { user, loading: authLoading } = useAuth()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!rolesLoading && !authLoading) {
      if (isAdmin()) {
        fetchUploads()
        fetchUsers()
      }
      setLoading(false)
    }
  }, [isAdmin, rolesLoading, authLoading])

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUploads(data || [])
    } catch (error) {
      console.error('Error fetching uploads:', error)
      toast.error('Failed to load uploads')
    }
  }

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          display_name,
          user_roles (
            role
          )
        `)

      if (profilesError) throw profilesError

      const usersWithRoles = (profilesData || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        roles: (profile as any).user_roles?.map((r: any) => r.role) || []
      }))

      setUsers(usersWithRoles)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    }
  }

  const createBadgeFromUpload = async (upload: Upload) => {
    try {
      const badgeName = prompt('Enter badge name:')
      if (!badgeName) return

      const description = prompt('Enter badge description (optional):') || ''
      const year = prompt('Enter badge year (optional):')

      const { error } = await supabase
        .from('badges')
        .insert({
          name: badgeName,
          description,
          year: year ? parseInt(year) : null,
          image_url: upload.image_url,
          maker_id: user?.id
        })

      if (error) throw error

      toast.success('Badge created successfully!')
      // Optionally remove from uploads or mark as processed
    } catch (error) {
      console.error('Error creating badge:', error)
      toast.error('Failed to create badge')
    }
  }

  if (authLoading || rolesLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground font-mono">LOADING ADMIN PANEL...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center font-mono">ACCESS DENIED</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">You must be logged in to access the admin panel.</p>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center font-mono text-red-500">INSUFFICIENT PRIVILEGES</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Admin access required.</p>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-mono">ADMIN PANEL</h1>
            <p className="text-muted-foreground">Manage badges and users</p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="uploads" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="uploads" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Uploaded Images
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uploads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono">
                  <Upload className="h-5 w-5" />
                  UPLOADED IMAGES ({uploads.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploads.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No uploads found</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploads.map((upload) => (
                      <Card key={upload.id} className="overflow-hidden">
                        <div className="aspect-video relative">
                          <img
                            src={upload.image_url}
                            alt="Upload"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Uploaded by: {upload.profiles?.display_name || upload.profiles?.email || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(upload.created_at).toLocaleDateString()}
                            </p>
                            <Button
                              onClick={() => createBadgeFromUpload(upload)}
                              className="w-full"
                              variant="matrix"
                            >
                              Create Badge
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono">
                  <Users className="h-5 w-5" />
                  USER MANAGEMENT ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((userData) => (
                      <Card key={userData.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {userData.display_name || userData.email || 'Unknown User'}
                              </h3>
                              <p className="text-sm text-muted-foreground">{userData.email}</p>
                              <div className="flex gap-1 mt-2">
                                {userData.roles.length > 0 ? (
                                  userData.roles.map((role) => (
                                    <Badge key={role} variant="secondary">
                                      {role}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline">No roles</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // TODO: Implement role assignment modal
                                  toast.info('Role management coming soon!')
                                }}
                              >
                                Manage Roles
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}