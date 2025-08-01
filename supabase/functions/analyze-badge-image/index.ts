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
      throw new Error('Missing required API keys')
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
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: create structured data from text
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

    // Step 2: Search web for additional information
    let webResults: any = null
    if (aiAnalysis.name && aiAnalysis.name !== 'Unknown Badge') {
      try {
        const searchQuery = `${aiAnalysis.name} ${aiAnalysis.event || ''} ${aiAnalysis.year || ''} electronic badge conference`.trim()
        
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
                role: 'system',
                content: 'Find information about electronic badges/conference badges. Return structured data as JSON with fields: name, maker, year, event, category, description, external_link.'
              },
              {
                role: 'user',
                content: `Find information about: ${searchQuery}`
              }
            ],
            temperature: 0.2,
            max_tokens: 300,
            return_related_questions: false
          })
        })

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json()
          const webContent = perplexityData.choices[0].message.content
          
          try {
            const webJsonMatch = webContent.match(/\{[\s\S]*\}/)
            if (webJsonMatch) {
              webResults = JSON.parse(webJsonMatch[0])
              console.log('Web search results:', webResults)
            }
          } catch (webParseError) {
            console.log('Could not parse web results as JSON, using as description')
            webResults = { description: webContent }
          }
        }
      } catch (webError) {
        console.error('Web search error:', webError)
      }
    }

    // Step 3: Search existing database
    const { data: existingBadges, error: dbError } = await supabase
      .from('badges')
      .select(`
        *,
        profiles (display_name)
      `)

    if (dbError) {
      console.error('Database search error:', dbError)
    }

    // Step 4: Find potential matches
    const searchTerms = [
      aiAnalysis.name,
      aiAnalysis.event,
      webResults?.name,
      webResults?.event
    ].filter(Boolean).map(term => term.toLowerCase())

    const potentialMatches = existingBadges?.filter(badge => {
      const badgeText = `${badge.name} ${badge.description || ''} ${badge.team_name || ''}`.toLowerCase()
      return searchTerms.some(term => badgeText.includes(term))
    }) || []

    // Combine AI analysis with web results
    const combinedAnalysis = {
      ...aiAnalysis,
      ...webResults,
      // AI analysis takes precedence for confidence
      confidence: aiAnalysis.confidence || 50,
      web_info: webResults,
      database_matches: potentialMatches.slice(0, 3) // Top 3 matches
    }

    console.log('Analysis complete, returning results')

    return new Response(
      JSON.stringify({ 
        analysis: combinedAnalysis,
        matches: potentialMatches.slice(0, 3)
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