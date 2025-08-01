import { useAuth } from './useAuth';
import { useRoles } from './useRoles';

export const useRoleDisplay = () => {
  const { profile } = useAuth();
  const { roles, isAdmin } = useRoles();

  const getDisplayRole = () => {
    // Check admin first (from user_roles table)
    if (isAdmin()) return 'Admin';
    
    // Check for approved badge maker (from profiles table)
    if (profile?.role === 'maker' && profile?.maker_approved) {
      return 'Badge Maker';
    }
    
    // Check for pending badge maker
    if (profile?.role === 'maker' && !profile?.maker_approved) {
      return 'Pending Badge Maker';
    }
    
    // Check other roles from user_roles table
    if (roles.includes('moderator')) return 'Moderator';
    
    // Default to User
    return 'User';
  };

  const getRoleVariant = () => {
    const role = getDisplayRole();
    switch (role) {
      case 'Admin': return 'destructive';
      case 'Badge Maker': return 'default';
      case 'Pending Badge Maker': return 'secondary';
      case 'Moderator': return 'outline';
      default: return 'outline';
    }
  };

  const getAllUserRoles = (userProfile: any, userRoles: string[]) => {
    const displayRoles = [];
    
    // Add admin role if present
    if (userRoles.includes('admin')) {
      displayRoles.push('Admin');
    }
    
    // Add badge maker status
    if (userProfile?.role === 'maker') {
      if (userProfile.maker_approved) {
        displayRoles.push('Badge Maker');
      } else {
        displayRoles.push('Pending Badge Maker');
      }
    }
    
    // Add other roles
    userRoles.forEach(role => {
      if (role === 'moderator') displayRoles.push('Moderator');
      if (role === 'user' && displayRoles.length === 0) displayRoles.push('User');
    });
    
    // If no roles found, default to User
    if (displayRoles.length === 0) {
      displayRoles.push('User');
    }
    
    return displayRoles;
  };

  return {
    getDisplayRole,
    getRoleVariant,
    getAllUserRoles,
  };
};