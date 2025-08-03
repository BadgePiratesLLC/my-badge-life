import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Settings } from "lucide-react";
import { EmailPreferencesSettings } from "./EmailPreferencesSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal = ({ isOpen, onClose }: UserSettingsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <Settings className="h-5 w-5" />
            USER SETTINGS
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[calc(80vh-100px)]">
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="notifications">Email Notifications</TabsTrigger>
              {/* Future tabs can be added here */}
              {/* <TabsTrigger value="privacy">Privacy</TabsTrigger> */}
              {/* <TabsTrigger value="account">Account</TabsTrigger> */}
            </TabsList>
            
            <TabsContent value="notifications" className="mt-6">
              <EmailPreferencesSettings />
            </TabsContent>
            
            {/* Future tab content can be added here */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};