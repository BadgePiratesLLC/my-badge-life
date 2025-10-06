import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthContext } from '@/contexts/AuthContext'

// Generate a unique session ID for tracking
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

interface AnalyticsSession {
  sessionId: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  platform?: string
  browser?: string
  deviceType?: string
}

interface SearchAnalytics {
  searchType: 'image_upload' | 'camera_capture'
  searchDuration?: number
  aiAnalysisDuration?: number
  imageMatchingDuration?: number
  webSearchDuration?: number
  totalDuration?: number
  resultsFound: number
  bestConfidenceScore?: number
  searchSourceUsed?: string
  webSearchSourcesTried?: string[]
  foundInDatabase: boolean
  foundViaWebSearch: boolean
  foundViaImageMatching: boolean
}

export function useAnalyticsTracking() {
  const { user } = useAuthContext()
  const [sessionId] = useState(() => generateSessionId())
  const [sessionInitialized, setSessionInitialized] = useState(false)

  // Initialize session tracking
  useEffect(() => {
    if (!sessionInitialized) {
      initializeSession()
      setSessionInitialized(true)
    }
  }, [sessionInitialized])

  // Update session when user changes
  useEffect(() => {
    if (sessionInitialized) {
      updateSession()
    }
  }, [user?.id, sessionInitialized])

  const getBrowserInfo = () => {
    const ua = navigator.userAgent
    let browser = 'Unknown'
    let platform = 'Unknown' 
    let deviceType = 'Unknown'

    // Detect browser
    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Edge')) browser = 'Edge'

    // Detect platform
    if (ua.includes('Windows')) platform = 'Windows'
    else if (ua.includes('Mac')) platform = 'macOS'
    else if (ua.includes('Linux')) platform = 'Linux'
    else if (ua.includes('Android')) platform = 'Android'
    else if (ua.includes('iOS')) platform = 'iOS'

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/.test(ua)) {
      deviceType = ua.includes('iPad') ? 'Tablet' : 'Mobile'
    } else {
      deviceType = 'Desktop'
    }

    return { browser, platform, deviceType }
  }

  const initializeSession = async () => {
    try {
      const { browser, platform, deviceType } = getBrowserInfo()
      
      const sessionData = {
        session_id: sessionId,
        user_id: user?.id || null,
        user_agent: navigator.userAgent,
        platform,
        browser,
        device_type: deviceType,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      }

      const { error } = await supabase
        .from('analytics_sessions')
        .insert([sessionData])

      if (error) {
        console.error('Failed to initialize analytics session:', error)
      }
    } catch (error) {
      console.error('Error initializing analytics session:', error)
    }
  }

  const updateSession = async () => {
    try {
      const { error } = await supabase
        .from('analytics_sessions')
        .update({
          user_id: user?.id || null,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)

      if (error) {
        console.error('Failed to update analytics session:', error)
      }
    } catch (error) {
      console.error('Error updating analytics session:', error)
    }
  }

  const trackSearch = async (analytics: SearchAnalytics) => {
    try {
      // Ensure we have a valid session ID
      const currentSessionId = sessionId || generateSessionId()
      
      const searchData = {
        session_id: currentSessionId,
        user_id: user?.id || null,
        search_type: analytics.searchType,
        search_duration_ms: analytics.searchDuration,
        ai_analysis_duration_ms: analytics.aiAnalysisDuration,
        image_matching_duration_ms: analytics.imageMatchingDuration,
        web_search_duration_ms: analytics.webSearchDuration,
        total_duration_ms: analytics.totalDuration,
        results_found: analytics.resultsFound,
        best_confidence_score: analytics.bestConfidenceScore,
        search_source_used: analytics.searchSourceUsed,
        web_search_sources_tried: analytics.webSearchSourcesTried,
        found_in_database: analytics.foundInDatabase,
        found_via_web_search: analytics.foundViaWebSearch,
        found_via_image_matching: analytics.foundViaImageMatching,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('analytics_searches')
        .insert([searchData])

      if (error) {
        console.error('Failed to track search analytics:', error)
      }
    } catch (error) {
      console.error('Error tracking search analytics:', error)
      // Don't throw - analytics shouldn't break the main flow
    }
  }

  const trackBadgeInteraction = async (
    badgeId: string, 
    interactionType: 'view' | 'ownership_toggle' | 'detail_view'
  ) => {
    try {
      const interactionData = {
        session_id: sessionId,
        user_id: user?.id || null,
        badge_id: badgeId,
        interaction_type: interactionType,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('analytics_badge_interactions')
        .insert([interactionData])

      if (error) {
        console.error('Failed to track badge interaction:', error)
      }
    } catch (error) {
      console.error('Error tracking badge interaction:', error)
    }
  }

  return {
    sessionId,
    trackSearch,
    trackBadgeInteraction
  }
}