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
    const { imageBase64 } = await req.json()

    console.log('Processing image for badge matching...')

    // Generate embedding for uploaded image using Replicate CLIP
    console.log('Generating image embedding with CLIP...')
    
    // Ensure proper image format
    let imageData = imageBase64;
    if (!imageData.startsWith('data:')) {
      imageData = `data:image/jpeg;base64,${imageBase64}`;
    }
    
    const clipResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
        input: {
          image: imageData
        }
      })
    })

    if (!clipResponse.ok) {
      throw new Error(`Replicate API error: ${clipResponse.statusText}`)
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
        throw new Error('Image processing failed')
      }
      
      attempts++
    }

    if (!embedding) {
      throw new Error('Image processing timed out')
    }

    console.log('Generated embedding, searching for matches...')

    // Search for similar embeddings in the database
    const { data: badgeEmbeddings, error: searchError } = await supabase
      .from('badge_embeddings')
      .select(`
        *,
        badges (
          id,
          name,
          maker_id,
          image_url,
          description,
          year,
          category,
          profiles (display_name)
        )
      `)

    if (searchError) {
      throw new Error(`Database search error: ${searchError.message}`)
    }

    // Calculate cosine similarity
    const cosineSimilarity = (a: number[], b: number[]) => {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
      return dotProduct / (magnitudeA * magnitudeB)
    }

    const matches = badgeEmbeddings
      .map(item => {
        const similarity = cosineSimilarity(embedding, item.embedding)
        return {
          badge: item.badges,
          similarity,
          confidence: Math.round(similarity * 100)
        }
      })
      .filter(match => match.similarity >= 0.85)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)

    console.log(`Found ${matches.length} matches above threshold`)

    return new Response(
      JSON.stringify({ matches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in match-badge-image function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})