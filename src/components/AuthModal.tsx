import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X, LogIn, UserCheck, Crown, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { MakerRequestModal } from "./MakerRequestModal";
import { UserSettingsModal } from "./UserSettingsModal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { user, profile, signInWithGoogle, signOut, getDisplayRole } = useAuthContext();
  const { toast } = useToast();
  const [showMakerRequest, setShowMakerRequest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  

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
                {profile?.role === 'user' && !profile.wants_to_be_maker && (
                  <Button
                    variant="outline"
                    onClick={handleRequestMaker}
                    className="w-full"
                  >
                    <UserCheck className="h-4 w-4" />
                    REQUEST MAKER STATUS
                  </Button>
                )}
                
                {profile?.wants_to_be_maker && !profile.maker_approved && (
                  <div className="p-3 bg-muted rounded border">
                    <p className="text-xs text-muted-foreground text-center">
                      Maker request pending admin approval
                    </p>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(true)}
                  className="w-full"
                >
                  <Settings className="h-4 w-4" />
                  SETTINGS
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                  className="w-full"
                >
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
      
      <UserSettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};