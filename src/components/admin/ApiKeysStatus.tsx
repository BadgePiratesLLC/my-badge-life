import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface ApiKeyStatus {
  name: string;
  configured: boolean;
  lastTested?: Date;
  settingsUrl: string;
}

export const ApiKeysStatus = () => {
  const [keyStatuses, setKeyStatuses] = useState<ApiKeyStatus[]>([
    {
      name: 'SERPAPI_KEY',
      configured: false,
      settingsUrl: 'https://supabase.com/dashboard/project/zdegwavcldwlgzzandae/settings/functions'
    },
    {
      name: 'REPLICATE_API_TOKEN',
      configured: false,
      settingsUrl: 'https://supabase.com/dashboard/project/zdegwavcldwlgzzandae/settings/functions'
    },
    {
      name: 'OPENAI_API_KEY',
      configured: false,
      settingsUrl: 'https://supabase.com/dashboard/project/zdegwavcldwlgzzandae/settings/functions'
    },
    {
      name: 'PERPLEXITY_API_KEY',
      configured: false,
      settingsUrl: 'https://supabase.com/dashboard/project/zdegwavcldwlgzzandae/settings/functions'
    },
    {
      name: 'RESEND_API_KEY',
      configured: false,
      settingsUrl: 'https://supabase.com/dashboard/project/zdegwavcldwlgzzandae/settings/functions'
    },
    {
      name: 'DISCORD_WEBHOOK_URL',
      configured: false,
      settingsUrl: 'https://supabase.com/dashboard/project/zdegwavcldwlgzzandae/settings/functions'
    }
  ]);

  useEffect(() => {
    checkApiKeyStatuses();
  }, []);

  const checkApiKeyStatuses = async () => {
    // Test each API by calling test edge functions
    const testResults = await Promise.all([
      testSerpApi(),
      testReplicate(),
      // We can't easily test others without making actual API calls
    ]);

    setKeyStatuses(prev => prev.map((key, index) => {
      if (index === 0) return { ...key, configured: testResults[0] };
      if (index === 1) return { ...key, configured: testResults[1] };
      return key;
    }));
  };

  const testSerpApi = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('test-serpapi');
      return !error && data?.success;
    } catch {
      return false;
    }
  };

  const testReplicate = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('test-replicate');
      return !error && data?.success;
    } catch {
      return false;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono">
          <Key className="h-5 w-5" />
          API KEYS STATUS
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Overview of configured API keys. For security, actual key values are not displayed.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {keyStatuses.map((keyStatus) => (
            <div
              key={keyStatus.name}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {keyStatus.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-mono text-sm font-medium">{keyStatus.name}</p>
                  {keyStatus.lastTested && (
                    <p className="text-xs text-muted-foreground">
                      Last tested: {keyStatus.lastTested.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={keyStatus.configured ? "default" : "secondary"}>
                  {keyStatus.configured ? "Configured" : "Not Tested"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(keyStatus.settingsUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> To update API keys, visit the{' '}
            <a
              href="https://supabase.com/dashboard/project/zdegwavcldwlgzzandae/settings/functions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Supabase Edge Functions Secrets
            </a>{' '}
            settings page.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
