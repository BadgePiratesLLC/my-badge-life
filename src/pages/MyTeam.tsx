import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MyTeamManagement } from '@/components/admin/MyTeamManagement';
import { useAuthContext } from '@/contexts/AuthContext';

const MyTeam = () => {
  const navigate = useNavigate();
  const { profile } = useAuthContext();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your team.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        
        <MyTeamManagement />
      </div>
    </div>
  );
};

export default MyTeam;
