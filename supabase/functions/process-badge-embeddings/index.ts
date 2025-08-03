import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { logApiCall, estimateOpenAICost, countTokensApprox } from '../_shared/api-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting badge embeddings processing using OpenAI...')
    
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY not configured',
          processed: 0,
          total: 0,
          results: []
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Fetching badges with images...')

    // Get all badges with images
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('id, name, image_url, description')
      .not('image_url', 'is', null)

    if (badgesError) {
      console.error('Error fetching badges:', badgesError)
      throw new Error(`Error fetching badges: ${badgesError.message}`)
    }

    console.log(`Found ${badges?.length || 0} badges with images`)

    // First, clean up any orphaned embeddings (embeddings for badges that no longer exist)
    console.log('Checking for orphaned embeddings...')
    const { data: allEmbeddings, error: embeddingsError } = await supabase
      .from('badge_embeddings')
      .select('badge_id')
    
    if (embeddingsError) {
      console.error('Error fetching embeddings:', embeddingsError)
    } else {
      const badgeIds = new Set(badges?.map(b => b.id) || [])
      const orphanedEmbeddings = allEmbeddings?.filter(e => !badgeIds.has(e.badge_id)) || []
      
      if (orphanedEmbeddings.length > 0) {
        console.log(`Found ${orphanedEmbeddings.length} orphaned embeddings, cleaning up...`)
        const { error: deleteError } = await supabase
          .from('badge_embeddings')
          .delete()
          .in('badge_id', orphanedEmbeddings.map(e => e.badge_id))
        
        if (deleteError) {
          console.error('Error cleaning up orphaned embeddings:', deleteError)
        } else {
          console.log('Successfully cleaned up orphaned embeddings')
        }
      }
    }

    // Check which badges already have embeddings (only from remaining badges)
    const { data: existingEmbeddings } = await supabase
      .from('badge_embeddings')
      .select('badge_id')
      .in('badge_id', badges?.map(b => b.id) || [])

    console.log(`Found ${existingEmbeddings?.length || 0} existing embeddings`)

    const existingBadgeIds = new Set(existingEmbeddings?.map(e => e.badge_id) || [])
    const badgesToProcess = badges?.filter(badge => !existingBadgeIds.has(badge.id)) || []

    console.log(`Need to process ${badgesToProcess.length} badges`)

    if (badgesToProcess.length === 0) {
      console.log('All badges already have embeddings')
      return new Response(
        JSON.stringify({ 
          processed: 0,
          total: badges?.length || 0,
          results: [],
          message: 'All badges already have embeddings'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    const results = []

    // Process up to 3 badges at a time
    const batchSize = Math.min(3, badgesToProcess.length)
    const badgesToProcessBatch = badgesToProcess.slice(0, batchSize)

    console.log(`Processing batch of ${badgesToProcessBatch.length} badges using OpenAI embeddings`)

    for (const badge of badgesToProcessBatch) {
      try {
        console.log(`\n=== Processing badge ${badge.id}: "${badge.name}" ===`)
        console.log('Image URL:', badge.image_url)

        // Skip blob URLs as they cannot be accessed from server context
        if (badge.image_url && badge.image_url.startsWith('blob:')) {
          const error = `Skipping blob URL (not accessible from server): ${badge.image_url}`
          console.log(error)
          results.push({ badge_id: badge.id, success: false, error })
          continue
        }

        // For HTTP/HTTPS URLs, test accessibility
        if (badge.image_url && (badge.image_url.startsWith('http://') || badge.image_url.startsWith('https://'))) {
          console.log('Testing image URL accessibility...')
          try {
            const imageTestResponse = await fetch(badge.image_url, { method: 'HEAD' })
            console.log('Image URL test status:', imageTestResponse.status)
            
            if (!imageTestResponse.ok) {
              const error = `Image URL not accessible: ${imageTestResponse.status} ${imageTestResponse.statusText}`
              console.error(error)
              results.push({ badge_id: badge.id, success: false, error })
              continue
            }
          } catch (fetchError) {
            const error = `Failed to test image URL: ${fetchError.message}`
            console.error(error)
            results.push({ badge_id: badge.id, success: false, error })
            continue
          }
        }

        // Use OpenAI to create text embedding from badge info
        console.log('Creating text-based embedding using OpenAI...')
        const textToEmbed = `Badge: ${badge.name}. Description: ${badge.description || 'Electronic conference badge'}. Image URL: ${badge.image_url}`
        
        const startTime = Date.now()
        const requestData = {
          input: textToEmbed,
          model: 'text-embedding-3-small'
        }
        
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        })

        const responseTime = Date.now() - startTime
        console.log('OpenAI embedding response status:', embeddingResponse.status)

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text()
          const error = `OpenAI API error: ${embeddingResponse.status} ${embeddingResponse.statusText} - ${errorText}`
          console.error(error)
          
          // Log failed API call
          await logApiCall({
            api_provider: 'openai',
            endpoint: '/v1/embeddings',
            method: 'POST',
            request_data: requestData,
            response_status: embeddingResponse.status,
            response_time_ms: responseTime,
            success: false,
            error_message: error
          })
          
          results.push({ badge_id: badge.id, success: false, error })
          continue
        }

        const embeddingData = await embeddingResponse.json()
        const embedding = embeddingData.data[0].embedding
        
        // Log successful API call
        const inputTokens = countTokensApprox(textToEmbed)
        const estimatedCost = estimateOpenAICost('text-embedding-3-small', inputTokens, 0)
        
        await logApiCall({
          api_provider: 'openai',
          endpoint: '/v1/embeddings',
          method: 'POST',
          request_data: requestData,
          response_status: embeddingResponse.status,
          response_time_ms: responseTime,
          tokens_used: inputTokens,
          estimated_cost_usd: estimatedCost,
          success: true
        })
        
        console.log('Embedding generated successfully! Length:', embedding?.length)

        if (embedding) {
          console.log('Storing embedding in database...')
          // Store embedding in database
          const { error: insertError } = await supabase
            .from('badge_embeddings')
            .insert({
              badge_id: badge.id,
              embedding: embedding
            })

          if (insertError) {
            console.error(`Error storing embedding for badge ${badge.id}:`, insertError)
            results.push({ badge_id: badge.id, success: false, error: `Database error: ${insertError.message}` })
          } else {
            console.log(`Successfully processed badge ${badge.id}`)
            results.push({ badge_id: badge.id, success: true })
            processed++
          }
        } else {
          results.push({ badge_id: badge.id, success: false, error: 'No embedding generated' })
        }

        // Rate limiting - wait between requests
        if (processed < badgesToProcessBatch.length) {
          console.log('Waiting before next request...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        console.error(`Error processing badge ${badge.id}:`, error)
        results.push({ badge_id: badge.id, success: false, error: error.message })
      }
    }

    console.log(`Processing complete. Processed ${processed}/${badgesToProcessBatch.length} badges successfully`)

    return new Response(
      JSON.stringify({ 
        processed: processed,
        total: badgesToProcess.length,
        results: results,
        message: `Processed ${processed} badges successfully using OpenAI embeddings`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-badge-embeddings function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        processed: 0,
        total: 0,
        results: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})