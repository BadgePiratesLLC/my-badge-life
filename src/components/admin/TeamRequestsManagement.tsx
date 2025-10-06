import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Clock } from 'lucide-react';
import type { TeamRequest } from '@/hooks/useTeams';

interface TeamRequestsManagementProps {
  teamRequests: TeamRequest[];
  onApprove: (requestId: string) => Promise<any>;
  onReject: (requestId: string) => Promise<void>;
}

export const TeamRequestsManagement = React.memo(({ 
  teamRequests, 
  onApprove, 
  onReject 
}: TeamRequestsManagementProps) => {
  const pendingRequests = teamRequests.filter(r => r.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono">TEAM REQUESTS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending team requests</p>
        ) : (
          pendingRequests.map((request) => (
            <div
              key={request.id}
              className="p-4 border border-border rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-mono font-semibold">{request.team_name}</h4>
                  </div>
                  {request.team_description && (
                    <p className="text-sm text-muted-foreground">
                      {request.team_description}
                    </p>
                  )}
                  {request.team_website_url && (
                    <a
                      href={request.team_website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {request.team_website_url}
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Requested: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onApprove(request.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(request.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}

        {teamRequests.filter(r => r.status !== 'pending').length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="font-mono text-sm mb-4">PROCESSED REQUESTS</h4>
            <div className="space-y-2">
              {teamRequests
                .filter(r => r.status !== 'pending')
                .map((request) => (
                  <div
                    key={request.id}
                    className="p-3 border border-border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm">{request.team_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                          {request.reviewed_at
                            ? new Date(request.reviewed_at).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          request.status === 'approved'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TeamRequestsManagement.displayName = 'TeamRequestsManagement';
