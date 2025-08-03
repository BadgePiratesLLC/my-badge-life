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

    // Use OpenAI vision model to compare uploaded image with stored badge images
    console.log('Analyzing uploaded image and comparing with database badges...')
    
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }
    
    // Convert base64 to proper data URL if needed
    let uploadedImageData = imageBase64;
    if (!uploadedImageData.startsWith('data:')) {
      uploadedImageData = `data:image/jpeg;base64,${imageBase64}`;
    }

    // Get all badges with images from database
    const { data: badgeData, error: searchError } = await supabase
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

    if (searchError) {
      throw new Error(`Database search error: ${searchError.message}`)
    }

    console.log(`Found ${badgeData?.length || 0} badges with images to compare`)

    // Compare uploaded image with badges in parallel for faster processing
    const badgesToCompare = badgeData.slice(0, 10) // Increased from 5 to 10 for better matches
    console.log(`Comparing with ${badgesToCompare.length} badges in parallel...`)
    
    const comparePromises = badgesToCompare.map(async (badge) => {
      try {
        // Use OpenAI vision to compare the two images
        const comparison = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Compare these two badge images. Rate similarity 0-100% based on visual design, shape, colors, text, and overall appearance. Respond with only a number.`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: uploadedImageData }
                  },
                  {
                    type: 'image_url', 
                    image_url: { url: badge.image_url }
                  }
                ]
              }
            ],
            max_tokens: 10
          })
        })

        if (comparison.ok) {
          const result = await comparison.json()
          const similarityText = result.choices[0]?.message?.content?.trim()
          const similarity = parseInt(similarityText) || 0
          
          console.log(`Similarity for "${badge.name}": ${similarity}%`)
          
          return {
            badge: badge,
            similarity: similarity / 100,
            confidence: similarity
          }
        } else {
          console.log(`Failed to compare with ${badge.name}`)
          return {
            badge: badge,
            similarity: 0,
            confidence: 0
          }
        }
      } catch (error) {
        console.error(`Error comparing with ${badge.name}:`, error)
        return {
          badge: badge,
          similarity: 0,
          confidence: 0
        }
      }
    })

    const allMatches = await Promise.all(comparePromises)

    // Sort by similarity
    allMatches.sort((a, b) => b.similarity - a.similarity)

    // Log all similarities for debugging
    console.log('All badge similarities:', allMatches.slice(0, 10).map(m => 
      `${m.badge?.name || 'Unknown'}: ${(m.similarity * 100).toFixed(1)}%`
    ))

    const matches = allMatches
      .filter(match => match.similarity >= 0.25)  // Use 25% threshold as requested
      .slice(0, 5)

    console.log(`Found ${matches.length} matches above 25% threshold (out of ${badgeData?.length || 0} total badges)`)

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