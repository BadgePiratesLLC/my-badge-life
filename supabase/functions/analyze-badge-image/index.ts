import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { imageBase64, forceWebSearch } = await req.json()

    console.log('Starting smart badge analysis...')

    // Initialize analytics tracking
    const searchStartTime = Date.now()
    const analytics = {
      search_type: 'image_analysis',
      local_search_duration_ms: 0,
      google_search_duration_ms: 0,
      ai_analysis_duration_ms: 0,
      found_in_database: false,
      found_via_google: false,
      found_via_ai: false,
      local_confidence: 0,
      google_confidence: 0,
      ai_confidence: 0,
      search_stages: [],
      total_duration_ms: 0
    }

    const statusUpdates = []
    
    // Step 1: Search local database first
    statusUpdates.push({ stage: 'local_search', status: 'searching', message: 'Searching local database...' })
    console.log('🔍 STEP 1: Searching local database...')
    
    const localSearchStart = Date.now()
    let localMatches = []
    let bestLocalConfidence = 0
    
    try {
      // Try image-based matching first
      statusUpdates.push({ stage: 'local_search', status: 'processing', message: 'Comparing with stored badge images...' })
      
      const { data: matchResult, error: matchError } = await supabase.functions.invoke('match-badge-image', {
        body: { imageBase64 }
      })
      
      if (!matchError && matchResult?.matches && matchResult.matches.length > 0) {
        const imageMatches = matchResult.matches.map(match => ({
          badge: match.badge,
          similarity: match.similarity,
          confidence: Math.round(match.similarity * 100)
        }))
        localMatches = imageMatches
        console.log(`Found ${imageMatches.length} image matches:`, imageMatches.map(m => 
          `${m.badge?.name || 'Unknown'}: ${m.confidence}%`
        ))
      }

      // Try text-based matching using simple keyword extraction
      statusUpdates.push({ stage: 'local_search', status: 'processing', message: 'Checking text-based matches...' })
      
      const { data: badgeMatches, error: textSearchError } = await supabase
        .from('badges')
        .select(`
          id,
          name,
          maker_id,
          image_url,
          description,
          year,
          category,
          profiles (display_name)
        `)
        .not('image_url', 'is', null)

      if (!textSearchError && badgeMatches) {
        // Simple text matching without AI - just use common badge terms
        const commonBadgeTerms = ['yoda', 'grogu', 'child', 'baby', 'star', 'wars', 'character', 'green', 'pcb']
        
        // Get user confirmations for badges to boost confidence
        const { data: confirmations } = await supabase
          .from('badge_confirmations')
          .select('badge_id, confirmation_type')
          .eq('confirmation_type', 'correct_match')

        const confirmationMap = new Map()
        if (confirmations) {
          confirmations.forEach(conf => {
            const count = confirmationMap.get(conf.badge_id) || 0
            confirmationMap.set(conf.badge_id, count + 1)
          })
        }

        // Score badges based on simple text similarity
        const textMatches = badgeMatches.map(badge => {
          const badgeName = badge.name.toLowerCase()
          const badgeDesc = badge.description?.toLowerCase() || ''
          const badgeText = `${badgeName} ${badgeDesc}`
          
          let score = 0
          let confidence = 0
          
          // Check for matches with common terms
          const matchedTerms = commonBadgeTerms.filter(term => 
            badgeText.includes(term)
          )
          
          if (matchedTerms.length > 0) {
            score = (matchedTerms.length / commonBadgeTerms.length) * 50 // Lower max score for simple matching
            confidence = Math.round(score)
          }
          
          // Boost confidence based on user confirmations
          const userConfirmations = confirmationMap.get(badge.id) || 0
          if (userConfirmations > 0) {
            const boost = Math.min(userConfirmations * 5, 20)
            confidence = Math.min(confidence + boost, 100)
          }
          
          return {
            badge,
            similarity: score / 100,
            confidence
          }
        })
        .filter(match => match.confidence >= 15) // Lower threshold for simple matching
        .sort((a, b) => b.confidence - a.confidence)

        // Merge with image matches
        localMatches = localMatches.concat(textMatches)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
      }

      bestLocalConfidence = localMatches.length > 0 ? localMatches[0].confidence : 0
      analytics.local_search_duration_ms = Date.now() - localSearchStart
      analytics.local_confidence = bestLocalConfidence
      analytics.search_stages.push({
        stage: 'local_search',
        duration_ms: analytics.local_search_duration_ms,
        success: bestLocalConfidence >= 60,
        confidence: bestLocalConfidence,
        results_count: localMatches.length
      })
      
      console.log(`Local search complete. Best confidence: ${bestLocalConfidence}%`)
      
    } catch (error) {
      analytics.local_search_duration_ms = Date.now() - localSearchStart
      analytics.search_stages.push({
        stage: 'local_search',
        duration_ms: analytics.local_search_duration_ms,
        success: false,
        error: error.message,
        results_count: 0
      })
      console.error('Local search error:', error)
    }

    // Check if local search found good matches (60% threshold)
    if (bestLocalConfidence >= 60) {
      analytics.found_in_database = true
      analytics.total_duration_ms = Date.now() - searchStartTime
      
      statusUpdates.push({ 
        stage: 'local_search', 
        status: 'success', 
        message: `Found match: ${localMatches[0].badge.name} (${bestLocalConfidence}% confidence)` 
      })
      
      console.log(`✅ LOCAL MATCH FOUND: ${bestLocalConfidence}% confidence (≥60% threshold)`)
      console.log(`Best match: "${localMatches[0]?.badge.name}"`)
      
      // Save analytics
      try {
        await supabase.from('analytics_searches').insert({
          search_type: analytics.search_type,
          image_matching_duration_ms: analytics.local_search_duration_ms,
          total_duration_ms: analytics.total_duration_ms,
          results_found: localMatches.length,
          best_confidence_score: bestLocalConfidence,
          found_in_database: true,
          found_via_web_search: false,
          found_via_image_matching: true
        })
      } catch (error) {
        console.error('Analytics tracking error:', error)
      }
      
      return new Response(
        JSON.stringify({ 
          analysis: {
            name: localMatches[0].badge.name,
            description: localMatches[0].badge.description,
            confidence: bestLocalConfidence,
            search_source: 'Local Database',
            found_locally: true
          },
          matches: localMatches,
          canAddToDatabase: false,
          statusUpdates,
          analytics
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    statusUpdates.push({ 
      stage: 'local_search', 
      status: 'failed', 
      message: `Local search insufficient (${bestLocalConfidence}% < 60%)` 
    })
    console.log(`❌ Local search insufficient (${bestLocalConfidence}% < 60% threshold)`)

    // STOP HERE - Only return local results, frontend will handle sequential flow
    analytics.total_duration_ms = Date.now() - searchStartTime
    
    return new Response(
      JSON.stringify({ 
        analysis: null,
        matches: localMatches,
        canAddToDatabase: true,
        statusUpdates,
        analytics,
        shouldContinueToGoogle: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in analyze-badge-image function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})