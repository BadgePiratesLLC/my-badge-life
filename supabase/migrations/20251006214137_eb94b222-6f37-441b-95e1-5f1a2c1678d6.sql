-- Allow team members to update their team's description and website
CREATE POLICY "Team members can update their team info"
ON public.teams
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.team_id = teams.id 
    AND tm.user_id = auth.uid()
    AND p.assigned_team = teams.name
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.team_id = teams.id 
    AND tm.user_id = auth.uid()
    AND p.assigned_team = teams.name
  )
);