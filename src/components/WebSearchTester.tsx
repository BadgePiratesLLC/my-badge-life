import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Play, Loader2, Eye, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SearchResult {
  sourceId: string;
  sourceName: string;
  success: boolean;
  result?: any;
  error?: string;
  duration?: number;
  rawResponse?: any;
}

export const WebSearchTester = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<SearchResult[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [searchSources, setSearchSources] = useState<any[]>([]);
  const [showRawResponse, setShowRawResponse] = useState<string>('');

  // Load search sources
  React.useEffect(() => {
    const loadSearchSources = async () => {
      const { data, error } = await supabase
        .from('web_search_sources')
        .select('*')
        .eq('enabled', true)
        .order('priority');
      
      if (error) {
        console.error('Error loading search sources:', error);
        return;
      }

      setSearchSources(data || []);
    };

    loadSearchSources();
  }, []);

  const testSingleSource = async (source: any, query: string): Promise<SearchResult> => {
    const startTime = Date.now();
    
    try {
      console.log(`Testing search source: ${source.name}`);
      
      const { data, error } = await supabase.functions.invoke('test-web-search', {
        body: {
          query,
          sourceId: source.id,
          url: source.url,
          promptTemplate: source.prompt_template
        }
      });

      const duration = Date.now() - startTime;

      if (error) {
        return {
          sourceId: source.id,
          sourceName: source.name,
          success: false,
          error: error.message,
          duration
        };
      }

      return {
        sourceId: source.id,
        sourceName: source.name,
        success: true,
        result: data.result,
        rawResponse: data.rawResponse,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        sourceId: source.id,
        sourceName: source.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  };

  const testAllSources = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setIsTestingAll(true);
    setTestResults([]);

    try {
      const results: SearchResult[] = [];
      
      // Test each source sequentially to match real-world behavior
      for (const source of searchSources) {
        console.log(`Testing source: ${source.name}`);
        const result = await testSingleSource(source, searchQuery);
        results.push(result);
        setTestResults([...results]); // Update UI with each result
      }

      toast({
        title: "Testing Complete",
        description: `Tested ${results.length} search sources`
      });
    } catch (error) {
      console.error('Error testing search sources:', error);
      toast({
        title: "Error",
        description: "Failed to test search sources",
        variant: "destructive"
      });
    } finally {
      setIsTestingAll(false);
    }
  };

  const testSelectedSource = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    if (!selectedSourceId) {
      toast({
        title: "Error", 
        description: "Please select a search source",
        variant: "destructive"
      });
      return;
    }

    const source = searchSources.find(s => s.id === selectedSourceId);
    if (!source) return;

    setIsTestingAll(true);
    setTestResults([]);

    const result = await testSingleSource(source, searchQuery);
    setTestResults([result]);
    setIsTestingAll(false);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          WEB SEARCH TESTER
        </CardTitle>
        <p className="text-muted-foreground">
          Test your web search sources to understand how they work and fine-tune the AI searching.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="search-query">Search Query</Label>
            <Input
              id="search-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter a badge name or description to search for..."
              className="font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={testAllSources}
              disabled={isTestingAll || !searchQuery.trim()}
              className="flex items-center gap-2"
              variant="default"
            >
              {isTestingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Test All Sources ({searchSources.length})
            </Button>

            <div className="flex items-center gap-2">
              <select 
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                disabled={isTestingAll}
              >
                <option value="">Select source...</option>
                {searchSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} (Priority {source.priority})
                  </option>
                ))}
              </select>
              
              <Button
                onClick={testSelectedSource}
                disabled={isTestingAll || !searchQuery.trim() || !selectedSourceId}
                variant="outline"
                size="sm"
              >
                Test Selected
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            {testResults.map((result) => (
              <Card key={result.sourceId} className={result.success ? 'border-green-200' : 'border-red-200'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{result.sourceName}</CardTitle>
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'Success' : 'Failed'}
                      </Badge>
                      {result.duration && (
                        <Badge variant="outline">{result.duration}ms</Badge>
                      )}
                    </div>
                    {result.success && result.rawResponse && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRawResponse(showRawResponse === result.sourceId ? '' : result.sourceId)}
                      >
                        <Eye className="h-4 w-4" />
                        {showRawResponse === result.sourceId ? 'Hide' : 'Show'} Raw
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  )}

                  {result.success && result.result && (
                    <div>
                      <h4 className="font-semibold mb-2">Parsed Result:</h4>
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {showRawResponse === result.sourceId && result.rawResponse && (
                    <div>
                      <h4 className="font-semibold mb-2">Raw API Response:</h4>
                      <div className="bg-muted p-4 rounded-md max-h-64 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(result.rawResponse, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isTestingAll && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing search sources...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};