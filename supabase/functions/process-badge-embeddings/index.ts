import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const replicateToken = Deno.env.get('REPLICATE_API_TOKEN')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting badge embeddings processing...')
    
    if (!replicateToken) {
      console.error('REPLICATE_API_TOKEN not configured')
      return new Response(
        JSON.stringify({ 
          error: 'REPLICATE_API_TOKEN not configured',
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
      .select('id, name, image_url')
      .not('image_url', 'is', null)

    if (badgesError) {
      console.error('Error fetching badges:', badgesError)
      throw new Error(`Error fetching badges: ${badgesError.message}`)
    }

    console.log(`Found ${badges?.length || 0} badges with images`)

    // Check which badges already have embeddings
    const { data: existingEmbeddings } = await supabase
      .from('badge_embeddings')
      .select('badge_id')

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

    // Process up to 3 badges at a time to avoid overwhelming the API
    const batchSize = Math.min(3, badgesToProcess.length)
    const badgesToProcessBatch = badgesToProcess.slice(0, batchSize)

    console.log(`Processing batch of ${badgesToProcessBatch.length} badges`)

    for (const badge of badgesToProcessBatch) {
      try {
        console.log(`Processing badge ${badge.id}: ${badge.name}`)

        // Generate embedding using Replicate CLIP
        console.log('Calling Replicate API...')
        const clipResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${replicateToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: "b102e40c6bd7ad74ce68c84c17bc7c9f1a48df1b1afce0b1b8e24ca97c7a8c0f",
            input: {
              image: badge.image_url,
              mode: "image"
            }
          })
        })

        if (!clipResponse.ok) {
          const errorText = await clipResponse.text()
          console.error(`Replicate API error for badge ${badge.id}: ${clipResponse.status} ${clipResponse.statusText} - ${errorText}`)
          results.push({ badge_id: badge.id, success: false, error: `Replicate API error: ${clipResponse.statusText}` })
          continue
        }

        const clipPrediction = await clipResponse.json()
        console.log(`Prediction started: ${clipPrediction.id}`)
        let predictionId = clipPrediction.id

        // Poll for completion with shorter attempts for better responsiveness
        let embedding = null
        let attempts = 0
        const maxAttempts = 20 // Reduced but still reasonable

        while (!embedding && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between checks
          
          console.log(`Checking prediction status (attempt ${attempts + 1}/${maxAttempts})...`)
          
          const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
              'Authorization': `Token ${replicateToken}`,
            }
          })
          
          if (!statusResponse.ok) {
            console.error(`Status check failed: ${statusResponse.statusText}`)
            break
          }
          
          const statusData = await statusResponse.json()
          console.log(`Prediction status: ${statusData.status}`)
          
          if (statusData.status === 'succeeded') {
            embedding = statusData.output
            console.log('Embedding generated successfully')
            break
          } else if (statusData.status === 'failed') {
            console.error(`Embedding generation failed for badge ${badge.id}: ${statusData.error}`)
            results.push({ badge_id: badge.id, success: false, error: 'Embedding generation failed' })
            break
          }
          
          attempts++
        }

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
          console.log(`Embedding generation timed out for badge ${badge.id}`)
          results.push({ badge_id: badge.id, success: false, error: 'Embedding generation timed out' })
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
        message: `Processed ${processed} badges successfully`
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