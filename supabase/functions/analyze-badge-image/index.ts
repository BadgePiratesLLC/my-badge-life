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

    // Step 1: Quick AI analysis to get badge name/basic info
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
                text: 'You are analyzing an electronic conference badge or SAO (Shitty Add-On). Look carefully at any text, logos, or distinctive features. If you see "SAO", "Totem", version numbers, or connector layouts, mention them specifically. Return only: {"name": "badge name", "description": "brief description"}. Focus on technical details and exact text visible.'
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

    // Step 2: Search local database first
    console.log('Searching local database...')
    let matches = []
    
    if (!forceWebSearch) {
      try {
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
          
          console.log('Search input:', quickAnalysis.name)
          console.log('Searching for:', searchName, 'Words:', searchWords)
          console.log('Available badges:', badgeMatches.map(b => b.name))
          
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
            
            // Boost confidence based on user confirmations (upvotes)
            const userConfirmations = confirmationMap.get(badge.id) || 0
            if (userConfirmations > 0) {
              const boost = Math.min(userConfirmations * 5, 20) // Max 20% boost
              confidence = Math.min(confidence + boost, 100)
              console.log(`Badge "${badge.name}": +${boost}% boost from ${userConfirmations} confirmations`)
            }
            
            console.log(`Badge "${badge.name}": score=${score}, confidence=${confidence}`)
            
            return {
              badge,
              similarity: score / 100,
              confidence
            }
          })
          .filter(match => match.confidence >= 20)  // Lower threshold for testing
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
          
          matches = scoredMatches
          console.log(`Found ${matches.length} local matches with confidence >= 20%`)
          if (matches.length > 0) {
            console.log('Best matches:', matches.map(m => `${m.badge.name}: ${m.confidence}%`))
            console.log(`BEST LOCAL MATCH: ${matches[0].confidence}% confidence`)
          }
        }
      } catch (error) {
        console.error('Local database search error:', error)
      }
    }

    // Step 3: Search external sources ONLY if no good local matches
    let webResults: any = null
    let searchSource = 'none'
    
    // CRITICAL: Only search web if we have NO good local matches (confidence < 50%)
    const shouldSearchWeb = forceWebSearch || matches.length === 0 || (matches.length > 0 && matches[0].confidence < 50)
    
    console.log('=== WEB SEARCH DECISION ===')
    console.log('forceWebSearch:', forceWebSearch)
    console.log('matches.length:', matches.length)
    console.log('bestConfidence:', matches[0]?.confidence || 'N/A')
    console.log('threshold: 50%')
    console.log('shouldSearchWeb:', shouldSearchWeb)
    console.log('=== END DECISION ===')
    
    if (shouldSearchWeb) {
      console.log('🔍 STARTING EXTERNAL SEARCH...')
      console.log(`Reason: forceWebSearch=${forceWebSearch}, matches=${matches.length}, bestConfidence=${matches[0]?.confidence || 0}%`)
      
      // Fetch enabled web search sources ordered by priority
      const { data: searchSources, error: sourcesError } = await supabase
        .from('web_search_sources')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: true })
      
      if (sourcesError) {
        console.error('Error fetching search sources:', sourcesError)
        // Fallback to default behavior if database query fails
        console.log('Falling back to default general web search...')
        try {          
          const generalResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${perplexityApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [
                {
                  role: 'user',
                  content: `Find information about "${quickAnalysis.name}" badge. Return JSON: {name, maker, year, event, description, external_link, confidence}. Include source URLs in external_link field.`
                }
              ],
              temperature: 0.2,
              max_tokens: 250
            })
          })

          if (generalResponse.ok) {
            const generalData = await generalResponse.json()
            const generalContent = generalData.choices[0].message.content
            
            try {
              const generalMatch = generalContent.match(/\{[\s\S]*\}/)
              if (generalMatch) {
                webResults = { ...JSON.parse(generalMatch[0]), source: 'Web Search (Fallback)' }
                searchSource = 'Web Search (Fallback)'
                console.log('Found via fallback search:', webResults)
              }
            } catch (e) {
              console.log('Could not parse fallback search results')
            }
          }
        } catch (error) {
          console.error('Fallback web search error:', error)
        }
      } else if (searchSources && searchSources.length > 0) {
        // Try each enabled source in priority order until we find a result
        for (const source of searchSources) {
          if (webResults) break; // Stop on first success
          
          console.log(`Trying search source: ${source.name} (priority ${source.priority})`)
          
          try {
            // Replace {query} placeholder in prompt template
            const searchQuery = source.prompt_template.replace('{query}', quickAnalysis.name)
            
            const response = await fetch(source.url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${perplexityApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'sonar',
                messages: [
                  {
                    role: 'user',
                    content: searchQuery
                  }
                ],
                temperature: 0.2,
                max_tokens: source.name === 'General Web Search' ? 250 : 200
              })
            })

            if (response.ok) {
              const responseData = await response.json()
              const content = responseData.choices[0].message.content
              
              try {
                const match = content.match(/\{[\s\S]*\}/)
                if (match) {
                  const result = JSON.parse(match[0])
                  
                  // For specific sources, check if they found something
                  if (source.name !== 'General Web Search' && result.found === false) {
                    console.log(`${source.name} search found no results, trying next source...`)
                    continue
                  }
                  
                  // Set confidence based on source type
                  const confidence = source.name === 'Tindie' ? 85 : 
                                   source.name === 'Hackaday' ? 80 : 
                                   result.confidence || 70
                  
                  // Normalize the URL field - some sources use 'url', others use 'external_link'
                  const externalLink = result.url || result.external_link
                  
                  webResults = { 
                    ...result, 
                    source: source.name, 
                    confidence,
                    external_link: externalLink 
                  }
                  searchSource = source.name
                  console.log(`Found via ${source.name}:`, webResults)
                  break; // Stop on first success
                }
              } catch (e) {
                console.log(`Could not parse ${source.name} results, trying next source...`)
              }
            } else {
              console.log(`${source.name} search failed with status ${response.status}, trying next source...`)
            }
          } catch (error) {
            console.error(`${source.name} search error:`, error, 'trying next source...')
          }
        }
        
        if (!webResults) {
          console.log('All search sources exhausted without finding results')
        }
      } else {
        console.log('No enabled search sources configured')
      }
    } else {
      console.log('⏭️ SKIPPING EXTERNAL SEARCH - Good local matches found!')
      console.log(`Best local match: "${matches[0]?.badge.name}" with ${matches[0]?.confidence}% confidence (≥50% threshold)`)
    }

    console.log('Analysis complete, returning results')
    
    // Combine all analysis results - but ONLY include web results if we actually searched
    const combinedAnalysis = shouldSearchWeb ? {
      ...quickAnalysis,
      ...webResults,
      confidence: webResults?.confidence || quickAnalysis.confidence || 50,
      search_source: searchSource,
      web_info: webResults,
      database_matches: matches.map(m => m.badge)
    } : {
      // No web search performed - return only quick analysis for display but don't make it primary
      database_matches: matches.map(m => m.badge)
    }

    return new Response(
      JSON.stringify({ 
        analysis: combinedAnalysis,
        matches: matches,
        canAddToDatabase: webResults && (webResults.confidence || 0) >= 80 // Allow admin to add high-confidence results
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