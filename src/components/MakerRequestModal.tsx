import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, UserCheck, Clock } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MakerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingRequest {
  id: string;
  team_name: string;
  status: string;
  created_at: string;
}

export const MakerRequestModal = ({ isOpen, onClose }: MakerRequestModalProps) => {
  const { user } = useAuthContext();
  const { teams, createTeamRequest } = useTeams();
  const { toast } = useToast();
  
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [newTeamName, setNewTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      fetchPendingRequests();
    }
  }, [isOpen, user]);

  const fetchPendingRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('team_requests')
        .select('id, team_name, status, created_at')
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // If user wants to create a new team, submit a team creation request
      if (selectedTeam === "new" && newTeamName.trim()) {
        await createTeamRequest(newTeamName.trim());
        
        toast({
          title: "Team Creation Request Sent",
          description: `Your request to create "${newTeamName.trim()}" is awaiting admin approval.`,
        });
        
        await fetchPendingRequests();
        setSelectedTeam("");
        setNewTeamName("");
      } else if (selectedTeam === "new" && !newTeamName.trim()) {
        toast({
          title: "Team Name Required",
          description: "Please enter a name for the new team.",
          variant: "destructive",
        });
        return;
      } else if (selectedTeam && selectedTeam !== "new") {
        // User selected an existing team - create a team join request
        const selectedTeamData = teams.find(t => t.id === selectedTeam);
        if (selectedTeamData) {
          // Check if they already have a pending request for this team
          const hasPendingRequest = pendingRequests.some(
            req => req.team_name === selectedTeamData.name
          );
          
          if (hasPendingRequest) {
            toast({
              title: "Request Already Pending",
              description: `You already have a pending request for ${selectedTeamData.name}.`,
              variant: "destructive",
            });
            return;
          }
          
          await createTeamRequest(
            selectedTeamData.name, 
            `Request to join ${selectedTeamData.name}`,
            selectedTeamData.website_url || undefined
          );
          
          toast({
            title: "Team Join Request Sent",
            description: `Your request to join "${selectedTeamData.name}" is awaiting admin approval.`,
          });
          
          await fetchPendingRequests();
          setSelectedTeam("");
        }
      } else {
        toast({
          title: "Team Required",
          description: "Please select a team or create a new one.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to send team request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTeam("");
    setNewTeamName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-mono">
            REQUEST MAKER STATUS
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pending Requests</Label>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.team_name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Awaiting Approval
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                You can request access to additional teams below
              </p>
            </div>
          )}

          <div className="text-center space-y-2">
            <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm text-foreground">
                {pendingRequests.length > 0 ? 'Request Another Team' : 'Join as a Badge Maker'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingRequests.length > 0 
                  ? 'Select another team to join' 
                  : 'Please select your team or create a new one'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-select">Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ Create New Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedTeam === "new" && (
              <div className="space-y-2">
                <Label htmlFor="new-team-name">New Team Name</Label>
                <Input
                  id="new-team-name"
                  type="text"
                  placeholder="Enter team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your new team will be created but require admin approval for membership
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={handleSubmit}
                disabled={loading || !selectedTeam}
                className="w-full"
              >
                {loading ? "Submitting..." : "SUBMIT REQUEST"}
              </Button>
              
              {pendingRequests.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="w-full"
                >
                  CLOSE
                </Button>
              )}
              
              {pendingRequests.length === 0 && (
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="w-full"
                >
                  CANCEL
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};