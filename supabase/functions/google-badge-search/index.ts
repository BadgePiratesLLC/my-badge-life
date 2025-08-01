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
      
      statusUpdates.push({ stage: 'google_search', status: 'processing', message: 'Uploading image for Google search...' })
      
      // Upload image to storage first to get a public URL
      const fileName = `temp-search-${Date.now()}.jpg`
      const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0))
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('badge-images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        })
      
      if (uploadError) {
        console.error('Failed to upload image:', uploadError)
        throw new Error('Failed to upload image for search')
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('badge-images')
        .getPublicUrl(fileName)
      
      statusUpdates.push({ stage: 'google_search', status: 'processing', message: 'Submitting image to Google...' })
      console.log('Performing Google reverse image search with URL:', publicUrl)
      
      // Use the public URL for reverse image search
      const searchParams = new URLSearchParams({
        engine: 'google_reverse_image',
        api_key: serpApiKey,
        num: '3',
        image_url: publicUrl
      })
      
      console.log('Making reverse image search request...')
      const googleResponse = await fetch(`https://serpapi.com/search?${searchParams.toString()}`, {
        method: 'GET'
      })
      
      // Clean up the temporary file
      await supabase.storage.from('badge-images').remove([fileName])

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
          console.log('Raw Google response:', JSON.stringify(googleData.image_results.slice(0, 3), null, 2))
          console.log('Google returned results, applying STRICT badge filtering...')
          
          // TEMPORARY: Return first result for debugging
          const firstResult = googleData.image_results[0]
          console.log('🔍 DEBUGGING: Returning first Google result regardless of filtering')
          
          const debugResult = {
            name: firstResult.title || 'Debug Result',
            description: `DEBUG: ${firstResult.snippet || 'Found via Google reverse image search'}`,
            external_link: firstResult.link,
            source: 'Google Image Search (DEBUG)',
            confidence: 50,
            thumbnail: firstResult.thumbnail,
            found_via_google: true,
            search_source: 'Google Image Search'
          }
          
          analytics.found_via_google = true
          analytics.google_confidence = 50
          analytics.total_duration_ms = Date.now() - searchStartTime
          
          statusUpdates.push({ 
            stage: 'google_search', 
            status: 'success', 
            message: `DEBUG: Found result: ${debugResult.name}` 
          })
          
          console.log(`🔍 DEBUG RESULT: "${debugResult.name}"`)
          
          return new Response(
            JSON.stringify({ 
              analysis: debugResult,
              statusUpdates,
              analytics
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
          
          // EXTREMELY strict filtering - only these specific terms
          const requiredBadgeTerms = [
            'conference badge', 'con badge', 'electronic badge', 'pcb badge', 'led badge',
            'defcon badge', 'bsides badge', 'hacker badge', 'security badge',
            'badge design', 'badge pcb', 'badge circuit'
          ]
          
          const exactEventNames = ['defcon', 'bsides', 'blackhat', 'derbycon', 'shmoocon', 'toorcon', 'hackaday']
          
          let foundValidBadge = false
          let bestResult = null
          
          for (let i = 0; i < Math.min(googleData.image_results.length, 5); i++) {
            const result = googleData.image_results[i]
            const title = (result.title || '').toLowerCase()
            const snippet = (result.snippet || '').toLowerCase()
            const link = (result.link || '').toLowerCase()
            const combined = `${title} ${snippet} ${link}`
            
            console.log(`\n--- Analyzing result ${i + 1} ---`)
            console.log(`Title: "${result.title}"`)
            console.log(`Snippet: "${result.snippet}"`)
            console.log(`Link: "${result.link}"`)
            
            // Check if it contains required badge terminology
            const hasRequiredBadgeTerm = requiredBadgeTerms.some(term => combined.includes(term))
            const hasEventName = exactEventNames.some(event => combined.includes(event))
            
            // Additional check: must not be from entertainment/wiki sites unless it's about actual badges
            const isEntertainmentSite = combined.includes('fandom.com') || combined.includes('wikipedia.org') || 
                                      combined.includes('wiki') || combined.includes('starwars') || 
                                      combined.includes('movie') || combined.includes('character')
            
            console.log(`Has required badge term: ${hasRequiredBadgeTerm}`)
            console.log(`Has event name: ${hasEventName}`)
            console.log(`Is entertainment site: ${isEntertainmentSite}`)
            
            // Only accept if it has specific badge terminology AND is not an entertainment site
            // OR if it's from a known tech event (even if entertainment site, if it mentions the event + badge)
            const isValid = (hasRequiredBadgeTerm && !isEntertainmentSite) || 
                           (hasEventName && combined.includes('badge'))
            
            console.log(`Final result: ${isValid ? 'ACCEPTED' : 'REJECTED'}`)
            
            if (isValid && !foundValidBadge) {
              foundValidBadge = true
              bestResult = {
                name: result.title || 'Unknown Badge',
                description: result.snippet || 'Found via Google reverse image search',
                external_link: result.link,
                source: 'Google Image Search',
                confidence: 65,
                thumbnail: result.thumbnail,
                found_via_google: true,
                search_source: 'Google Image Search'
              }
              break // Take the first valid result
            }
          }
          
          if (foundValidBadge && bestResult) {
            analytics.found_via_google = true
            analytics.google_confidence = 65
            analytics.total_duration_ms = Date.now() - searchStartTime
            
            statusUpdates.push({ 
              stage: 'google_search', 
              status: 'success', 
              message: `Found verified badge: ${bestResult.name}` 
            })
            
            console.log(`✅ VERIFIED BADGE FOUND: "${bestResult.name}"`)
            
            return new Response(
              JSON.stringify({ 
                analysis: bestResult,
                statusUpdates,
                analytics
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          } else {
            statusUpdates.push({ 
              stage: 'google_search', 
              status: 'failed', 
              message: 'No verified badge results found (strict filtering applied)' 
            })
            console.log('❌ NO VERIFIED BADGE RESULTS - All results rejected by strict filtering')
          }
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