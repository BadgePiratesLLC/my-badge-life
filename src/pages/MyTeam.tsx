import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyTeamManagement } from '@/components/admin/MyTeamManagement';
import { useAuthContext } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';

const MyTeam = () => {
  console.log('🔵 MyTeam COMPONENT RENDERING');
  const navigate = useNavigate();
  const { profile, user, loading, initialized } = useAuthContext();
  const [showAuth, setShowAuth] = useState(false);

  console.log('🔵 MyTeam state:', { 
    hasProfile: !!profile, 
    hasUser: !!user, 
    loading,
    initialized,
    profileEmail: profile?.email,
    assignedTeam: profile?.assigned_team 
  });

  // Wait for auth to initialize before showing anything
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your team.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onCameraClick={() => navigate('/')}
        onMenuClick={() => {}}
        isAuthenticated={!!user}
        onAuthClick={() => setShowAuth(true)}
      />
      
      <div className="container mx-auto px-4 py-8">
        <MyTeamManagement />
      </div>

      <AuthModal 
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
      />
    </div>
  );
};

export default MyTeam;
