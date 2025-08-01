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
    const { imageBase64 } = await req.json()

    console.log('🔍 STEP 2: Starting Google reverse image search...')
    
    const searchStartTime = Date.now()
    const statusUpdates = []
    const analytics = {
      search_type: 'google_image_search',
      google_search_duration_ms: 0,
      found_via_google: false,
      google_confidence: 0,
      total_duration_ms: 0
    }
    
    statusUpdates.push({ stage: 'google_search', status: 'searching', message: 'Trying Google reverse image search...' })
    
    const serpApiKey = Deno.env.get('SERPAPI_KEY')
    console.log('SERPAPI_KEY check:', serpApiKey ? `Found (length: ${serpApiKey.length})` : 'Not found')
    
    if (!serpApiKey) {
      statusUpdates.push({ 
        stage: 'google_search', 
        status: 'skipped', 
        message: 'Google search unavailable - SERPAPI_KEY not configured in Supabase secrets' 
      })
      console.log('❌ SERPAPI_KEY not found, skipping Google search')
      
      analytics.total_duration_ms = Date.now() - searchStartTime
      
      return new Response(
        JSON.stringify({ 
          analysis: null,
          statusUpdates,
          analytics,
          shouldContinueToAI: true,
          error: 'SERPAPI_KEY not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      const imageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      
      statusUpdates.push({ stage: 'google_search', status: 'processing', message: 'Submitting image to Google...' })
      console.log('Performing Google reverse image search...')
      
      // For SerpAPI reverse image search, we need to use POST with multipart/form-data
      const formData = new FormData()
      formData.append('engine', 'google_reverse_image')
      formData.append('api_key', serpApiKey)
      formData.append('num', '3')
      
      // Convert base64 to blob for the image upload
      const binaryString = atob(imageData)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      formData.append('image_upload', blob, 'image.jpg')
      
      const googleResponse = await fetch('https://serpapi.com/search', {
        method: 'POST',
        body: formData
      })

      analytics.google_search_duration_ms = Date.now() - searchStartTime
      
      console.log('Google response status:', googleResponse.status)
      console.log('Google response headers:', Object.fromEntries(googleResponse.headers.entries()))

      if (googleResponse.ok) {
        const googleData = await googleResponse.json()
        console.log('Google search response received:', JSON.stringify(googleData, null, 2))
        
        if (googleData.error) {
          console.log('❌ Google API returned error:', googleData.error)
          statusUpdates.push({ 
            stage: 'google_search', 
            status: 'failed', 
            message: `Google API error: ${googleData.error}` 
          })
        } else if (googleData.image_results && googleData.image_results.length > 0) {
          const topResult = googleData.image_results[0]
          const googleResult = {
            name: topResult.title || 'Unknown Badge',
            description: topResult.snippet || 'Found via Google reverse image search',
            external_link: topResult.link,
            source: 'Google Image Search',
            confidence: 90,
            thumbnail: topResult.thumbnail,
            found_via_google: true,
            search_source: 'Google Image Search'
          }
          
          analytics.found_via_google = true
          analytics.google_confidence = 90
          analytics.total_duration_ms = Date.now() - searchStartTime
          
          statusUpdates.push({ 
            stage: 'google_search', 
            status: 'success', 
            message: `Found: ${googleResult.name}` 
          })
          
          console.log(`✅ GOOGLE MATCH FOUND: "${googleResult.name}"`)
          
          // Save analytics
          try {
            await supabase.from('analytics_searches').insert({
              search_type: analytics.search_type,
              web_search_duration_ms: analytics.google_search_duration_ms,
              total_duration_ms: analytics.total_duration_ms,
              results_found: 1,
              best_confidence_score: 90,
              found_in_database: false,
              found_via_web_search: true,
              found_via_image_matching: false,
              search_source_used: 'Google Image Search'
            })
          } catch (error) {
            console.error('Analytics tracking error:', error)
          }
          
          return new Response(
            JSON.stringify({ 
              analysis: googleResult,
              statusUpdates,
              analytics
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          statusUpdates.push({ 
            stage: 'google_search', 
            status: 'failed', 
            message: 'No results found in Google search' 
          })
          console.log('❌ Google search returned no image results')
        }
      } else {
        statusUpdates.push({ 
          stage: 'google_search', 
          status: 'failed', 
          message: `Google search failed (${googleResponse.status})` 
        })
        console.log(`❌ Google search failed with status: ${googleResponse.status}`)
      }
    } catch (error) {
      analytics.google_search_duration_ms = Date.now() - searchStartTime
      statusUpdates.push({ 
        stage: 'google_search', 
        status: 'failed', 
        message: `Google search error: ${error.message}` 
      })
      console.error('❌ Google reverse image search error:', error)
    }

    analytics.total_duration_ms = Date.now() - searchStartTime
    
    return new Response(
      JSON.stringify({ 
        analysis: null,
        statusUpdates,
        analytics,
        shouldContinueToAI: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in google-badge-search function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})