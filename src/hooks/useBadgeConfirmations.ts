import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useBadgeConfirmations = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthContext();

  const confirmMatch = async (
    badgeId: string, 
    similarity: number, 
    confidence: number
  ) => {
    if (!user) {
      toast.error('Please sign in to confirm matches');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Confirming badge match:', { badgeId, similarity, confidence });
      
      const { error } = await supabase
        .from('badge_confirmations')
        .insert([
          {
            user_id: user.id,
            badge_id: badgeId,
            confidence_at_time: confidence,
            similarity_score: similarity,
            confirmation_type: 'correct_match'
          }
        ]);

      if (error) {
        console.error('Error confirming match:', error);
        toast.error('Failed to confirm match');
        return;
      }

      toast.success('Thanks for confirming! This helps improve our matching.');
      console.log('Badge match confirmed successfully');
      
    } catch (error) {
      console.error('Error confirming badge match:', error);
      toast.error('Failed to confirm match');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfirmationStats = async (badgeId: string) => {
    try {
      const { data, error } = await supabase
        .from('badge_confirmations')
        .select('confirmation_type, confidence_at_time')
        .eq('badge_id', badgeId);

      if (error) {
        console.error('Error fetching confirmation stats:', error);
        return null;
      }

      const totalConfirmations = data.length;
      const correctMatches = data.filter(c => c.confirmation_type === 'correct_match').length;
      const avgConfidence = data.length > 0 
        ? Math.round(data.reduce((sum, c) => sum + c.confidence_at_time, 0) / data.length)
        : 0;

      return {
        totalConfirmations,
        correctMatches,
        avgConfidence,
        successRate: totalConfirmations > 0 ? Math.round((correctMatches / totalConfirmations) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting confirmation stats:', error);
      return null;
    }
  };

  return {
    confirmMatch,
    getConfirmationStats,
    isSubmitting
  };
};