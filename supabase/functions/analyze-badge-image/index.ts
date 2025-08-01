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

    // Step 1: Quick AI analysis to get badge name/basic info for database search
    console.log('Running quick AI analysis for badge identification...')
    
    const quickAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // Cheaper, faster model for basic info
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Quickly identify this badge. Return only: {"name": "badge name", "description": "brief description"}. Be concise.'
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
        max_tokens: 100
      })
    })

    let quickAnalysis = { name: 'Unknown Badge', description: 'Electronic conference badge' }
    if (quickAnalysisResponse.ok) {
      const quickData = await quickAnalysisResponse.json()
      try {
        const quickText = quickData.choices[0].message.content
        const quickMatch = quickText.match(/\{[\s\S]*\}/)
        if (quickMatch) {
          quickAnalysis = { ...quickAnalysis, ...JSON.parse(quickMatch[0]) }
        }
      } catch (e) {
        console.log('Could not parse quick analysis, using defaults')
      }
    }

    console.log('Quick analysis result:', quickAnalysis)

    // Step 2: Search database using simple text matching first (faster and more reliable)
    console.log('Searching database with simple text matching...')
    let matches = []
    
    if (!forceWebSearch) {
      try {
        // First try direct text search in badge names and descriptions
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
          console.log(`Searching ${badgeMatches.length} badges for text matches...`)
          
          const searchName = quickAnalysis.name.toLowerCase()
          const searchWords = searchName.split(' ').filter(word => word.length > 2)
          
          console.log('Searching for:', searchName, 'Words:', searchWords)
          
          // Score badges based on text similarity
          const scoredMatches = badgeMatches.map(badge => {
            const badgeName = badge.name.toLowerCase()
            const badgeDesc = badge.description?.toLowerCase() || ''
            const badgeText = `${badgeName} ${badgeDesc}`
            
            let score = 0
            let confidence = 0
            
            // Exact name match = 100%
            if (badgeName === searchName) {
              score = 100
              confidence = 100
            }
            // Name contains search = 80%
            else if (badgeName.includes(searchName) || searchName.includes(badgeName)) {
              score = 80
              confidence = 80
            }
            // Word matches
            else {
              const matchedWords = searchWords.filter(word => badgeText.includes(word))
              if (matchedWords.length > 0) {
                score = (matchedWords.length / searchWords.length) * 70
                confidence = Math.round(score)
              }
            }
            
            console.log(`Badge "${badge.name}": score=${score}, confidence=${confidence}`)
            
            return {
              badge,
              similarity: score / 100,
              confidence
            }
          })
          .filter(match => match.confidence >= 30)  // Minimum 30% confidence
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
          
          matches = scoredMatches
          console.log(`Found ${matches.length} text matches. Best: ${matches[0]?.confidence}%`)
        }
      } catch (error) {
        console.error('Text search error:', error)
      }
    }

    // Step 3: Only do detailed AI analysis if forced OR no good text matches
    let aiAnalysis: any = quickAnalysis
    if (forceWebSearch || matches.length === 0 || (matches.length > 0 && matches[0].confidence < 70)) {
      console.log('Running detailed AI analysis...')
      
      const detailedResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  text: 'Analyze this electronic badge/conference badge image in detail. Extract: name, year, event/conference name, maker/creator, category (Elect Badge/None Elect Badge/SAO/Tool/Misc), description, and any other relevant details. Return as JSON with fields: name, year, maker, category, description, event, confidence (0-100).'
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

      if (detailedResponse.ok) {
        const detailedData = await detailedResponse.json()
        
        try {
          const analysisText = detailedData.choices[0].message.content
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0])
          }
        } catch (parseError) {
          console.error('Error parsing detailed analysis:', parseError)
        }
        
        console.log('Detailed AI Analysis complete:', aiAnalysis)
      }
    } else {
      console.log('Skipping detailed AI analysis - found good text matches')
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