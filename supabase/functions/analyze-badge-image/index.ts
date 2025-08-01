import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!openaiApiKey || !perplexityApiKey) {
      throw new Error('Missing required API keys (OpenAI and Perplexity required)')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { imageBase64, forceWebSearch } = await req.json()

    console.log('Starting smart badge analysis...')

    // Step 1: Search local database first
    console.log('🔍 STEP 1: Searching local database...')
    let localMatches = []
    let bestLocalConfidence = 0
    
    try {
      // Try image-based matching first
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

      // Also try text-based matching for better coverage
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
        // Quick AI analysis for text matching
        const quickAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: `Extract key search terms from this badge image. Return JSON: {"search_terms": ["term1", "term2", ...]}`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `What are the key identifying terms for this badge?`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: imageBase64 }
                  }
                ]
              }
            ],
            max_tokens: 100,
            temperature: 0.3
          })
        })

        let searchTerms = []
        if (quickAnalysisResponse.ok) {
          const quickData = await quickAnalysisResponse.json()
          try {
            const content = quickData.choices[0].message.content
            const match = content.match(/\{[\s\S]*\}/)
            if (match) {
              const parsed = JSON.parse(match[0])
              searchTerms = parsed.search_terms || []
            }
          } catch (e) {
            console.log('Could not parse quick search terms')
          }
        }

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

        // Score badges based on text similarity
        const textMatches = badgeMatches.map(badge => {
          const badgeName = badge.name.toLowerCase()
          const badgeDesc = badge.description?.toLowerCase() || ''
          const badgeText = `${badgeName} ${badgeDesc}`
          
          let score = 0
          let confidence = 0
          
          // Check for matches with extracted search terms
          const matchedTerms = searchTerms.filter(term => 
            badgeText.includes(term.toLowerCase())
          )
          
          if (matchedTerms.length > 0) {
            score = (matchedTerms.length / Math.max(searchTerms.length, 1)) * 70
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
        .filter(match => match.confidence >= 20)
        .sort((a, b) => b.confidence - a.confidence)

        // Merge with image matches
        localMatches = localMatches.concat(textMatches)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
      }

      bestLocalConfidence = localMatches.length > 0 ? localMatches[0].confidence : 0
      console.log(`Local search complete. Best confidence: ${bestLocalConfidence}%`)
      
    } catch (error) {
      console.error('Local search error:', error)
    }

    // Check if local search found good matches (60% threshold)
    if (bestLocalConfidence >= 60) {
      console.log(`✅ LOCAL MATCH FOUND: ${bestLocalConfidence}% confidence (≥60% threshold)`)
      console.log(`Best match: "${localMatches[0]?.badge.name}"`)
      
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
          canAddToDatabase: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`❌ Local search insufficient (${bestLocalConfidence}% < 60% threshold)`)

    // Step 2: Google Reverse Image Search
    console.log('🔍 STEP 2: Trying Google reverse image search...')
    let googleResult = null
    
    const serpApiKey = Deno.env.get('SERPAPI_KEY')
    if (serpApiKey) {
      try {
        const imageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
        
        console.log('Performing Google reverse image search...')
        const googleResponse = await fetch('https://serpapi.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            engine: 'google_reverse_image',
            image_base64: imageData,
            api_key: serpApiKey,
            num: 3  // Get top 3 results
          })
        })

        if (googleResponse.ok) {
          const googleData = await googleResponse.json()
          console.log('Google search response received')
          
          if (googleData.image_results && googleData.image_results.length > 0) {
            const topResult = googleData.image_results[0]
            googleResult = {
              name: topResult.title || 'Unknown Badge',
              description: topResult.snippet || 'Found via Google reverse image search',
              external_link: topResult.link,
              source: 'Google Image Search',
              confidence: 90,
              thumbnail: topResult.thumbnail,
              found_via_google: true
            }
            console.log(`✅ GOOGLE MATCH FOUND: "${googleResult.name}"`)
            
            return new Response(
              JSON.stringify({ 
                analysis: googleResult,
                matches: localMatches,
                canAddToDatabase: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          } else {
            console.log('❌ Google search returned no image results')
          }
        } else {
          console.log(`❌ Google search failed with status: ${googleResponse.status}`)
        }
      } catch (error) {
        console.error('❌ Google reverse image search error:', error)
      }
    } else {
      console.log('❌ SERPAPI_KEY not found, skipping Google search')
    }

    // Step 3: AI Analysis as last resort
    console.log('🔍 STEP 3: Running AI analysis as fallback...')
    
    try {
      const aiAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert in electronic conference badges, SAO badges, and hacker badges. Analyze this image and provide detailed information.

Return JSON: {
  "name": "specific badge name",
  "description": "detailed description",
  "maker": "maker name if visible",
  "category": "badge category",
  "confidence": 70
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this electronic badge image in detail. What specific badge is this?`
                },
                {
                  type: 'image_url',
                  image_url: { url: imageBase64 }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        })
      })

      let aiResult = {
        name: 'Unknown Electronic Badge',
        description: 'Electronic conference or hacker badge',
        confidence: 50,
        search_source: 'AI Analysis',
        found_via_ai: true
      }

      if (aiAnalysisResponse.ok) {
        const aiData = await aiAnalysisResponse.json()
        try {
          const content = aiData.choices[0].message.content
          const match = content.match(/\{[\s\S]*\}/)
          if (match) {
            const parsed = JSON.parse(match[0])
            aiResult = { ...aiResult, ...parsed }
          }
        } catch (e) {
          console.log('Could not parse AI analysis, using defaults')
        }
      }

      console.log(`✅ AI ANALYSIS COMPLETE: "${aiResult.name}" (${aiResult.confidence}% confidence)`)

      return new Response(
        JSON.stringify({ 
          analysis: aiResult,
          matches: localMatches,
          canAddToDatabase: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('❌ AI analysis error:', error)
      
      return new Response(
        JSON.stringify({ 
          analysis: {
            name: 'Unknown Badge',
            description: 'Could not identify this badge',
            confidence: 0,
            search_source: 'None',
            error: 'All search methods failed'
          },
          matches: localMatches,
          canAddToDatabase: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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