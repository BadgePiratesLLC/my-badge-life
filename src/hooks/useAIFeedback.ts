import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useAIFeedback = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const submitFeedback = async (
    searchQuery: string,
    aiResult: any,
    feedbackType: 'helpful' | 'not_helpful' | 'incorrect' | 'spam',
    sourceUrl?: string,
    notes?: string
  ) => {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting AI feedback:', { searchQuery, feedbackType, sourceUrl });
      
      const { error } = await supabase
        .from('ai_search_feedback')
        .insert([
          {
            user_id: user?.id || null,
            search_query: searchQuery,
            ai_result: aiResult,
            feedback_type: feedbackType,
            source_url: sourceUrl,
            notes: notes
          }
        ]);

      if (error) {
        console.error('Error submitting feedback:', error);
        toast.error('Failed to submit feedback');
        return;
      }

      const feedbackMessages = {
        'helpful': 'Thanks! This helps us improve our search results.',
        'not_helpful': 'Thanks for the feedback. We\'ll work on better results.',
        'incorrect': 'Thanks for reporting incorrect information. We\'ll investigate.',
        'spam': 'Thanks for reporting spam. We\'ll improve our filters.'
      };

      toast.success(feedbackMessages[feedbackType]);
      console.log('AI feedback submitted successfully');
      
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFeedbackStats = async (searchQuery: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_search_feedback')
        .select('feedback_type')
        .eq('search_query', searchQuery);

      if (error) {
        console.error('Error fetching feedback stats:', error);
        return null;
      }

      const stats = {
        helpful: data.filter(f => f.feedback_type === 'helpful').length,
        not_helpful: data.filter(f => f.feedback_type === 'not_helpful').length,
        incorrect: data.filter(f => f.feedback_type === 'incorrect').length,
        spam: data.filter(f => f.feedback_type === 'spam').length,
        total: data.length
      };

      return stats;
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return null;
    }
  };

  return {
    submitFeedback,
    getFeedbackStats,
    isSubmitting
  };
};