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
    const { imageBase64 } = await req.json()

    console.log('Analyzing badge image with AI...')

    // Step 1: Analyze image with OpenAI Vision
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

    if (!visionResponse.ok) {
      throw new Error(`OpenAI Vision API error: ${visionResponse.statusText}`)
    }

    const visionData = await visionResponse.json()
    let aiAnalysis: any = {}
    
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

    console.log('AI Analysis complete:', aiAnalysis)

    // Step 2: Generate embedding using Replicate CLIP for similarity search
    let embedding = null
    if (replicateToken) {
      try {
        const clipResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${replicateToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: "b102e40c6bd7ad74ce68c84c17bc7c9f1a48df1b1afce0b1b8e24ca97c7a8c0f",
            input: {
              image: imageBase64,
              mode: "image"
            }
          })
        })

        if (clipResponse.ok) {
          const clipPrediction = await clipResponse.json()
          let predictionId = clipPrediction.id

          // Poll for completion with shorter timeout for responsiveness
          let attempts = 0
          const maxAttempts = 15 // Reduced from 30 for faster response

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
              console.error('Embedding generation failed')
              break
            }
            
            attempts++
          }
        }
      } catch (embeddingError) {
        console.error('Error generating embedding:', embeddingError)
      }
    }

    console.log('Generated embedding, searching database first...')

    // Step 3: Search database FIRST to avoid unnecessary web searches
    let matches = []
    let hasGoodDatabaseMatch = false
    
    if (embedding) {
      try {
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
              const similarity = cosineSimilarity(embedding, item.embedding)
              return {
                badge: item.badges,
                similarity,
                confidence: Math.round(similarity * 100)
              }
            })
            .filter(match => match.similarity >= 0.7)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)

          // Check if we have a high-confidence match (85%+)
          hasGoodDatabaseMatch = matches.length > 0 && matches[0].confidence >= 85
          
          if (hasGoodDatabaseMatch) {
            console.log(`Found high-confidence database match (${matches[0].confidence}%), skipping web search`)
          }
        } else {
          console.error('Database search error:', searchError?.message || 'No embeddings found')
        }
      } catch (embeddingSearchError) {
        console.error('Error searching embeddings:', embeddingSearchError)
      }
    }

    // Step 4: Only do web search if no good database match AND AI found something specific
    let webResults: any = null
    if (!hasGoodDatabaseMatch && aiAnalysis.name && aiAnalysis.name !== 'Unknown Badge') {
      console.log('No high-confidence database match found, searching web...')
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
                content: `Find basic info about: ${searchQuery}. Return brief JSON: {name, maker, year, description}`
              }
            ],
            temperature: 0.2,
            max_tokens: 200
          })
        })

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json()
          const webContent = perplexityData.choices[0].message.content
          
          try {
            const webJsonMatch = webContent.match(/\{[\s\S]*\}/)
            if (webJsonMatch) {
              webResults = JSON.parse(webJsonMatch[0])
              console.log('Web search completed')
            }
          } catch (webParseError) {
            console.log('Could not parse web results as JSON')
          }
        }
      } catch (webError) {
        console.error('Web search error:', webError)
      }
    } else if (hasGoodDatabaseMatch) {
      console.log('Skipped web search - found good database match')
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