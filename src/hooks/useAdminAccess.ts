import { useAuth } from './useAuth';
import { useRoles } from './useRoles';

export const useAdminAccess = () => {
  const { profile, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();

  // Badge Makers (approved makers) and Admins can access admin portal
  const canAccessAdmin = () => {
    const adminCheck = isAdmin();
    const makerCheck = profile?.role === 'maker' && profile?.maker_approved;
    
    console.log('Admin access check:', {
      profileRole: profile?.role,
      makerApproved: profile?.maker_approved,
      isAdmin: adminCheck,
      canAccess: adminCheck || makerCheck,
      authLoading,
      rolesLoading
    });
    
    return adminCheck || makerCheck;
  };

  // Only real admins can manage users and teams
  const canManageUsers = () => {
    return isAdmin();
  };

  const canManageTeams = () => {
    return isAdmin();
  };

  // Badge Makers can manage badges for their assigned team, Admins can manage all badges
  const canManageBadges = () => {
    return isAdmin() || (profile?.role === 'maker' && profile?.maker_approved);
  };

  // Badge Makers can only edit badges from their assigned team
  const canEditBadge = (badgeTeamName: string | null) => {
    if (isAdmin()) return true;
    if (profile?.role === 'maker' && profile?.maker_approved) {
      return badgeTeamName === profile?.assigned_team;
    }
    return false;
  };

  const getDisplayRole = () => {
    if (isAdmin()) return 'Admin';
    if (profile?.role === 'maker' && profile?.maker_approved) return 'Badge Maker';
    if (profile?.role === 'maker' && !profile?.maker_approved) return 'Pending Badge Maker';
    return 'User';
  };

  return {
    canAccessAdmin,
    canManageUsers,
    canManageTeams,
    canManageBadges,
    canEditBadge,
    getDisplayRole,
  };
};