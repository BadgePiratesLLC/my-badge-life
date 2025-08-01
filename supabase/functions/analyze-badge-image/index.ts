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

    console.log('Starting badge analysis...')

    // Step 1: Quick database search first using basic image hash or simple analysis
    let matches = []
    let basicAnalysis = { name: 'Unknown Badge', confidence: 30 }
    
    // If not forced web search, try database search first
    if (!forceWebSearch) {
      console.log('Searching database first...')
      
      // Create a simple text embedding for quick database comparison
      // Use a basic description since we don't know what the badge is yet
      const basicTextToEmbed = `Electronic conference badge image analysis`
      
      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: basicTextToEmbed,
            model: 'text-embedding-3-small'
          })
        })

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json()
          const queryEmbedding = embeddingData.data[0].embedding
          
          // Search existing embeddings
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

          if (!searchError && badgeEmbeddings) {
            // Calculate cosine similarity
            const cosineSimilarity = (a: number[], b: number[]) => {
              const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
              const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
              const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
              return dotProduct / (magnitudeA * magnitudeB)
            }

            matches = badgeEmbeddings
              .map(item => {
                const similarity = cosineSimilarity(queryEmbedding, item.embedding)
                let confidence = Math.round(similarity * 100)
                
                // Boost confidence for very high similarities (likely exact matches)
                if (similarity > 0.95) {
                  confidence = Math.min(100, confidence + 5)
                }
                
                console.log(`Badge ${item.badges?.name}: similarity = ${similarity}, confidence = ${confidence}%`)
                
                return {
                  badge: item.badges,
                  similarity,
                  confidence
                }
              })
              .filter(match => match.similarity >= 0.3)  // Very low threshold for initial screening
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, 5)

            console.log(`Found ${matches.length} potential database matches`)
          }
        }
      } catch (error) {
        console.error('Database search error:', error)
      }
    }

    // Step 2: Only do expensive AI analysis if forced web search OR no good database matches
    let aiAnalysis: any = basicAnalysis
    if (forceWebSearch || matches.length === 0) {
      console.log('Running full AI vision analysis...')
      
      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this electronic badge/conference badge image. Extract: name, year, event/conference name, maker/creator, category (Elect Badge/None Elect Badge/SAO/Tool/Misc), description, and any other relevant details. Return as JSON with fields: name, year, maker, category, description, event, confidence (0-100).'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        })
      })

      if (visionResponse.ok) {
        const visionData = await visionResponse.json()
        
        try {
          const analysisText = visionData.choices[0].message.content
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0])
          } else {
            aiAnalysis = {
              name: 'Unknown Badge',
              confidence: 50,
              description: analysisText
            }
          }
        } catch (parseError) {
          console.error('Error parsing AI analysis:', parseError)
          aiAnalysis = {
            name: 'Unknown Badge',
            confidence: 30,
            description: visionData.choices[0].message.content
          }
        }
        
        console.log('Full AI Analysis complete:', aiAnalysis)
      }
    } else {
      console.log('Skipping AI vision analysis - found database matches')
    }

    // Step 4: Do web search if forced OR if no database matches found
    let webResults: any = null
    if ((forceWebSearch || matches.length === 0) && aiAnalysis.name && aiAnalysis.name !== 'Unknown Badge') {
      console.log(forceWebSearch ? 'Forced web search requested' : 'No database matches found, searching web...')
      try {
        const searchQuery = `${aiAnalysis.name} ${aiAnalysis.event || ''} electronic badge conference`.trim()
        
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              {
                role: 'user',
                content: `Find detailed information about: ${searchQuery}. Return JSON with: {name, maker, year, description, external_link, confidence}`
              }
            ],
            temperature: 0.2,
            max_tokens: 300
          })
        })

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json()
          const webContent = perplexityData.choices[0].message.content
          
          try {
            const webJsonMatch = webContent.match(/\{[\s\S]*\}/)
            if (webJsonMatch) {
              webResults = JSON.parse(webJsonMatch[0])
              console.log('Web search completed successfully')
            }
          } catch (webParseError) {
            console.log('Could not parse web results as JSON')
          }
        }
      } catch (webError) {
        console.error('Web search error:', webError)
      }
    } else if (matches.length > 0 && !forceWebSearch) {
      console.log('Found database matches - skipping web search (user can request it)')
    } else {
      console.log('Skipped web search - AI could not identify badge clearly')
    }

    // Fallback to text-based search if no embedding matches
    if (matches.length === 0) {
      console.log('No embedding matches found, falling back to text search...')
      
      const { data: existingBadges } = await supabase
        .from('badges')
        .select(`
          *,
          profiles (display_name)
        `)

      if (existingBadges) {
        const searchTerms = [
          aiAnalysis.name,
          aiAnalysis.event
        ].filter(Boolean).map(term => term.toLowerCase())

        const potentialMatches = existingBadges.filter(badge => {
          const badgeText = `${badge.name} ${badge.description || ''} ${badge.team_name || ''}`.toLowerCase()
          return searchTerms.some(term => badgeText.includes(term))
        })

        matches = potentialMatches.slice(0, 3).map(badge => ({
          badge,
          similarity: 0.5,
          confidence: 50
        }))
      }
    }

    console.log(`Found ${matches.length} matches`)

    // Combine AI analysis with web results
    const combinedAnalysis = {
      ...aiAnalysis,
      ...webResults,
      confidence: aiAnalysis.confidence || 50,
      web_info: webResults,
      database_matches: matches.map(m => m.badge)
    }

    console.log('Analysis complete, returning results')

    return new Response(
      JSON.stringify({ 
        analysis: combinedAnalysis,
        matches: matches
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