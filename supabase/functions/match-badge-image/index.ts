import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiKey = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!openaiKey) {
      console.error('❌ OPENAI_API_KEY not configured')
      throw new Error('OPENAI_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { imageBase64 } = await req.json()

    console.log('Processing image for badge matching...')

    // For now, return empty matches since image-to-text embedding comparison doesn't work well
    // This will force the system to suggest adding as new badge when confidence is low
    console.log('Image matching temporarily disabled - will suggest adding as new badge')
    
    const embedding = [] // Empty array will cause all matches to have 0 similarity

    console.log('Searching database for matches...')
    console.log('Note: Image matching is simplified - will mostly suggest new badge creation')

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

    const allMatches = badgeEmbeddings.map(item => {
      console.log(`Processing badge "${item.badges?.name}", embedding type:`, typeof item.embedding, 'Length:', Array.isArray(item.embedding) ? item.embedding.length : 'not array')
      
      // Since we're using empty embedding, all similarities will be 0
      // This ensures the system suggests creating a new badge
      const similarity = 0
      console.log(`Similarity for "${item.badges?.name}": 0% (image matching disabled)`)
      
      return {
        badge: item.badges,
        similarity,
        confidence: Math.round(similarity * 100)
      }
    }).sort((a, b) => b.similarity - a.similarity)

    // Log all similarities for debugging
    console.log('All badge similarities:', allMatches.slice(0, 10).map(m => 
      `${m.badge?.name || 'Unknown'}: ${(m.similarity * 100).toFixed(1)}%`
    ))

    const matches = allMatches
      .filter(match => match.similarity >= 0.25)  // Use 25% threshold as requested
      .slice(0, 5)

    console.log(`Found ${matches.length} matches above 25% threshold (out of ${badgeEmbeddings?.length || 0} total badges)`)

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