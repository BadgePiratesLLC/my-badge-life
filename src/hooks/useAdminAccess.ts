import { useAuth } from './useAuth';
import { useRoles } from './useRoles';

export const useAdminAccess = () => {
  const { profile, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();

  // Badge Makers (approved makers) and Admins can access admin portal
  const canAccessAdmin = () => {
    // Don't show admin access until both auth and roles have finished loading
    if (authLoading || rolesLoading) {
      console.log('useAdminAccess still loading:', { authLoading, rolesLoading });
      return false;
    }
    
    // Debug logging
    console.log('useAdminAccess debug:', {
      authLoading,
      rolesLoading,
      isAdminResult: isAdmin(),
      profileRole: profile?.role,
      makerApproved: profile?.maker_approved
    });
    
    const adminCheck = isAdmin();
    const makerCheck = profile?.role === 'maker' && profile?.maker_approved;
    const result = adminCheck || makerCheck;
    
    console.log('canAccessAdmin result:', result);
    return result;
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