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
    const { imageBase64, debug } = await req.json()

    console.log('Starting simple badge analysis - local database only...')

    // Step 1: Search local database only
    console.log('🔍 Searching local database...')
    
    const localSearchStart = Date.now()
    let localMatches = []
    let bestLocalConfidence = 0
    
    try {
      // Try image-based matching
      const { data: matchResult, error: matchError } = await supabase.functions.invoke('match-badge-image', {
        body: { imageBase64, debug }
      })
      
      if (!matchError && matchResult?.matches && matchResult.matches.length > 0) {
        localMatches = matchResult.matches.map(match => ({
          badge: match.badge,
          similarity: match.similarity,
          confidence: Math.round(match.similarity * 100)
        }))
        console.log(`Found ${localMatches.length} image matches:`, localMatches.map(m => 
          `${m.badge?.name || 'Unknown'}: ${m.confidence}%`
        ))
      }

      bestLocalConfidence = localMatches.length > 0 ? localMatches[0].confidence : 0
      console.log(`Local search complete. Best confidence: ${bestLocalConfidence}%`)
      
    } catch (error) {
      console.error('Local search error:', error)
    }

    // Save analytics
    const totalDuration = Date.now() - localSearchStart
    try {
      await supabase.from('analytics_searches').insert({
        search_type: 'image_analysis',
        image_matching_duration_ms: totalDuration,
        total_duration_ms: totalDuration,
        results_found: localMatches.length,
        best_confidence_score: bestLocalConfidence,
        found_in_database: bestLocalConfidence >= 50,
        found_via_web_search: false,
        found_via_image_matching: bestLocalConfidence >= 50
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }

    // Check if we found a match above 25% threshold
    if (bestLocalConfidence >= 50) {
      console.log(`✅ Local match found: ${bestLocalConfidence}% confidence`)
      
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
          debug: matchResult?.debug
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If confidence is below 25%, suggest creating new badge
    console.log('❌ No confident match found - suggesting new badge creation')
    
    return new Response(
      JSON.stringify({ 
        analysis: null,
        matches: localMatches,
        canAddToDatabase: true,
        message: 'Badge not found in database. Would you like to add it for review?',
        suggest_new_badge: true,
        debug: matchResult?.debug
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