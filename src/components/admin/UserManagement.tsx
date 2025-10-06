import React, { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { RoleManagementModal } from '@/components/RoleManagementModal'
import { useRoles } from '@/hooks/useRoles'

interface User {
  id: string
  email: string | null
  display_name: string | null
  roles: string[]
  assigned_team?: string | null
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {userData.display_name || userData.email || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-muted-foreground">{userData.email}</p>
                      {userData.assigned_team && (
                        <p className="text-sm text-muted-foreground">Team: {userData.assigned_team}</p>
                      )}
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
