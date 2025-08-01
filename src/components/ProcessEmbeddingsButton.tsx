import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProcessEmbeddingsButton = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessEmbeddings = async () => {
    setIsProcessing(true);
    
    try {
      console.log('Starting badge embedding processing...');
      
      toast("Starting badge embedding processing...", {
        description: "This may take a few minutes depending on the number of badges.",
      });

      const { data, error } = await supabase.functions.invoke('process-badge-embeddings');

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      const result = data;
      console.log('Processing result:', result);
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      toast.success("Badge embeddings processed!", {
        description: `Processed ${result?.processed || 0}/${result?.total || 0} badges. ${result?.message || 'Image matching is now available.'}`,
      });

    } catch (error) {
      console.error('Error processing embeddings:', error);
      toast.error("Failed to process embeddings", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleProcessEmbeddings}
      disabled={isProcessing}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Brain className="h-4 w-4" />
      )}
      {isProcessing ? "PROCESSING..." : "PROCESS BADGE EMBEDDINGS"}
    </Button>
  );
};