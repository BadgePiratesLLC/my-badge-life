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
    if (!replicateToken) {
      throw new Error('REPLICATE_API_TOKEN not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Processing badge embeddings...')

    // Get all badges without embeddings
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('id, image_url')
      .not('image_url', 'is', null)

    if (badgesError) {
      throw new Error(`Error fetching badges: ${badgesError.message}`)
    }

    // Check which badges already have embeddings
    const { data: existingEmbeddings } = await supabase
      .from('badge_embeddings')
      .select('badge_id')

    const existingBadgeIds = new Set(existingEmbeddings?.map(e => e.badge_id) || [])
    const badgesToProcess = badges?.filter(badge => !existingBadgeIds.has(badge.id)) || []

    console.log(`Processing ${badgesToProcess.length} badges without embeddings`)

    let processed = 0
    const results = []

    for (const badge of badgesToProcess) {
      try {
        console.log(`Processing badge ${badge.id} (${processed + 1}/${badgesToProcess.length})`)

        // Generate embedding using Replicate CLIP
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
          console.error(`Replicate API error for badge ${badge.id}: ${clipResponse.statusText}`)
          continue
        }

        const clipPrediction = await clipResponse.json()
        let predictionId = clipPrediction.id

        // Poll for completion
        let embedding = null
        let attempts = 0
        const maxAttempts = 30

        while (!embedding && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
              'Authorization': `Token ${replicateToken}`,
            }
          })
          
          const statusData = await statusResponse.json()
          
          if (statusData.status === 'succeeded') {
            embedding = statusData.output
            break
          } else if (statusData.status === 'failed') {
            console.error(`Embedding generation failed for badge ${badge.id}`)
            break
          }
          
          attempts++
        }

        if (embedding) {
          // Store embedding in database
          const { error: insertError } = await supabase
            .from('badge_embeddings')
            .insert({
              badge_id: badge.id,
              embedding: embedding
            })

          if (insertError) {
            console.error(`Error storing embedding for badge ${badge.id}:`, insertError)
          } else {
            console.log(`Successfully processed badge ${badge.id}`)
            results.push({ badge_id: badge.id, success: true })
          }
        } else {
          results.push({ badge_id: badge.id, success: false, error: 'Embedding generation failed' })
        }

        processed++

        // Rate limiting - wait 1 second between requests
        if (processed < badgesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        console.error(`Error processing badge ${badge.id}:`, error)
        results.push({ badge_id: badge.id, success: false, error: error.message })
        processed++
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: processed,
        total: badgesToProcess.length,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-badge-embeddings function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})