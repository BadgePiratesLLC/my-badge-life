import React, { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, Clock } from 'lucide-react'
import { RoleManagementModal } from '@/components/RoleManagementModal'
import { useRoles } from '@/hooks/useRoles'
import { format } from 'date-fns'

interface User {
  id: string
  email: string | null
  display_name: string | null
  roles: string[]
  assigned_team?: string | null
  created_at?: string
  last_login?: string | null
}

interface UserManagementProps {
  users: User[]
  onRoleChange: () => void
}

export const UserManagement = memo(function UserManagement({
  users,
  onRoleChange
}: UserManagementProps) {
  const { getAllUserRoles } = useRoles()
  
  return (
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {userData.display_name || userData.email || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-muted-foreground">{userData.email}</p>
                      {userData.assigned_team && (
                        <p className="text-sm text-muted-foreground">Team: {userData.assigned_team}</p>
                      )}
                      
                      <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                        {userData.created_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Registered: {format(new Date(userData.created_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        )}
                        {userData.last_login && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Last Login: {format(new Date(userData.last_login), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-1 mt-2">
                        {getAllUserRoles(null, userData.roles).map((displayRole) => (
                          <Badge key={displayRole} variant="secondary">
                            {displayRole}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <RoleManagementModal 
                        user={userData} 
                        onRoleChange={onRoleChange}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
