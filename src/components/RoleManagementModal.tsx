import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useRoles, AppRole } from '@/hooks/useRoles'
import { Settings, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string | null
  display_name: string | null
  roles: string[]
}

interface RoleManagementModalProps {
  user: User
  onRoleChange: () => void
}

export const RoleManagementModal = ({ user, onRoleChange }: RoleManagementModalProps) => {
  const { assignRole, removeRole } = useRoles()
  const [open, setOpen] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<Set<AppRole>>(
    new Set(user.roles as AppRole[])
  )
  const [loading, setLoading] = useState(false)

  const availableRoles: { role: AppRole; label: string; description: string }[] = [
    { role: 'admin', label: 'Admin', description: 'Full access to admin features' },
    { role: 'moderator', label: 'Moderator', description: 'Can moderate content and users' },
    { role: 'user', label: 'User', description: 'Basic user access' },
  ]

  const handleRoleToggle = (role: AppRole, checked: boolean) => {
    const newSelectedRoles = new Set(selectedRoles)
    if (checked) {
      newSelectedRoles.add(role)
    } else {
      newSelectedRoles.delete(role)
    }
    setSelectedRoles(newSelectedRoles)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const currentRoles = new Set(user.roles as AppRole[])
      const newRoles = selectedRoles

      // Roles to add
      const rolesToAdd = Array.from(newRoles).filter(role => !currentRoles.has(role))
      // Roles to remove
      const rolesToRemove = Array.from(currentRoles).filter(role => !newRoles.has(role))

      // Add new roles
      for (const role of rolesToAdd) {
        await assignRole(user.id, role)
      }

      // Remove old roles
      for (const role of rolesToRemove) {
        await removeRole(user.id, role)
      }

      toast.success(`Roles updated for ${user.display_name || user.email}`)
      setOpen(false)
      onRoleChange()
    } catch (error) {
      console.error('Error updating roles:', error)
      toast.error('Failed to update roles: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Manage Roles
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Roles - {user.display_name || user.email}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Current Roles:</Label>
            <div className="flex gap-1 mt-1">
              {user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline">No roles</Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Assign Roles:</Label>
            {availableRoles.map(({ role, label, description }) => (
              <div key={role} className="flex items-start space-x-3">
                <Checkbox
                  id={role}
                  checked={selectedRoles.has(role)}
                  onCheckedChange={(checked) => handleRoleToggle(role, !!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor={role} className="text-sm font-medium cursor-pointer">
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}