import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, LogIn, UserCheck, Crown, Clock, LogOut, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { MakerRequestModal } from "./MakerRequestModal";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingRequest {
  team_name: string;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { user, profile, signInWithGoogle, signOut, getDisplayRole, isBadgeMaker } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showMakerRequest, setShowMakerRequest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    if (isOpen && user && !isBadgeMaker) {
      fetchPendingRequests();
    }
  }, [isOpen, user, isBadgeMaker]);

  const fetchPendingRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('team_requests')
        .select('team_name')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(keepLoggedIn);
      toast({
        title: "Welcome to MyBadgeLife!",
        description: "You can now track badges and connect with makers.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Sign In Failed",
        description: "There was an error signing in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Sign Out Failed",
        description: "There was an error signing out.",
        variant: "destructive",
      });
    }
  };

  const handleRequestMaker = () => {
    setShowMakerRequest(true);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-mono">
            {user ? "ACCOUNT" : "SIGN IN"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!user ? (
            <>
              <div className="text-center space-y-3">
                <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                  <LogIn className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-sm text-foreground">
                    Join the badge tracking community
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Track badges, connect with makers, and build your collection
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="keep-logged-in" 
                    checked={keepLoggedIn}
                    onCheckedChange={(checked) => setKeepLoggedIn(checked === true)}
                  />
                  <label 
                    htmlFor="keep-logged-in" 
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Keep me logged in for 5 days
                  </label>
                </div>
                
                <Button
                  variant="matrix"
                  size="lg"
                  onClick={handleGoogleSignIn}
                  className="w-full"
                >
                  <LogIn className="h-4 w-4" />
                  SIGN IN WITH GOOGLE
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Secure authentication powered by Supabase
              </p>
            </>
          ) : (
            <>
              <div className="text-center space-y-3">
                <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                  {getDisplayRole() === 'Admin' ? (
                    <Crown className="h-8 w-8 text-primary" />
                  ) : getDisplayRole().includes('Badge Maker') ? (
                    <UserCheck className="h-8 w-8 text-primary" />
                  ) : (
                    <LogIn className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-mono text-sm text-foreground">
                    {profile?.display_name || user.email}
                  </p>
                  <div className="flex items-center justify-center space-x-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {getDisplayRole().toUpperCase()}
                    </span>
                    {profile?.role === 'maker' && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        profile.maker_approved 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {profile.maker_approved ? 'APPROVED' : 'PENDING'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {/* Only show team button and request option for non-admin users */}
                {profile?.role !== 'admin' && profile?.assigned_team && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigate('/my-team');
                      onClose();
                    }}
                    className="w-full"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    MY TEAM: {profile.assigned_team}
                  </Button>
                )}

                {profile?.role !== 'admin' && !isBadgeMaker && pendingRequests.length > 0 && (
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Pending Team Requests</span>
                    </div>
                    {pendingRequests.map((request, index) => (
                      <div key={index} className="flex items-center justify-between pl-6">
                        <span className="text-sm text-muted-foreground">{request.team_name}</span>
                        <Badge variant="secondary" className="text-xs">Awaiting Approval</Badge>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pl-6 mt-2">
                      You can request access to additional teams
                    </p>
                  </div>
                )}
                
                {/* Only show REQUEST TEAM MEMBERSHIP button if user is not admin, not a maker, and hasn't already requested */}
                {profile?.role !== 'admin' && !isBadgeMaker && (
                  <Button
                    variant="outline"
                    onClick={handleRequestMaker}
                    className="w-full"
                  >
                    <UserCheck className="h-4 w-4" />
                    REQUEST TEAM MEMBERSHIP
                  </Button>
                )}
                
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  SIGN OUT
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <MakerRequestModal 
        isOpen={showMakerRequest}
        onClose={() => setShowMakerRequest(false)}
      />
    </div>
  );
};