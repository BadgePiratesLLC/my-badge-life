import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, UserCheck } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";

interface MakerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MakerRequestModal = ({ isOpen, onClose }: MakerRequestModalProps) => {
  const { requestMakerStatus } = useAuthContext();
  const { teams, createTeamRequest } = useTeams();
  const { toast } = useToast();
  
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [newTeamName, setNewTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // If user wants to create a new team, submit a team creation request
      if (selectedTeam === "new" && newTeamName.trim()) {
        await createTeamRequest(newTeamName.trim());
        
        toast({
          title: "Team Request Sent",
          description: "Your team creation request has been sent to admins for approval.",
        });
      } else if (selectedTeam === "new" && !newTeamName.trim()) {
        toast({
          title: "Team Name Required",
          description: "Please enter a name for the new team.",
          variant: "destructive",
        });
        return;
      }
      
      // Request maker status (this will still require admin approval)
      await requestMakerStatus();
      
      toast({
        title: "Maker Request Sent",
        description: selectedTeam === "new" 
          ? "Your maker request and team creation request have been submitted for admin approval."
          : "Your maker request has been sent to admins for approval.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to send maker request. Please try again.",
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
          <div className="text-center space-y-2">
            <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm text-foreground">
                Join as a Badge Maker
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please select your team or create a new one
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
              
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};