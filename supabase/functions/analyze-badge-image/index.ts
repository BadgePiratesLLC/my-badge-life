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

    // Step 1: Detailed AI analysis to get badge identification
    console.log('Running detailed AI analysis for badge identification...')
    
    // Add timestamp to prevent cached responses
    const timestamp = Date.now()
    
    const quickAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Use better model for more accurate analysis
        messages: [
          {
            role: 'system',
            content: `You are an expert in electronic conference badges, SAO badges, and hacker badges with deep knowledge of Tindie marketplace. 

CRITICAL: Look at this image like Google's reverse image search would - identify the EXACT CHARACTER, BRAND, or SPECIFIC DESIGN.

For this Baby Yoda/Grogu-like character badge, you should identify:
1. CHARACTER: Is this Baby Yoda, Grogu, The Child, or similar character?
2. DESIGN ELEMENTS: Green PCB, brown robe design, electronic components
3. MARKETPLACE TERMS: How would this be listed on Tindie?
4. BRAND/MAKER: Any visible brand indicators

Generate 8-10 SPECIFIC search terms that would find this exact badge on Tindie:
- Include character names (Baby Yoda, Grogu, The Child)
- Include PCB/badge specific terms
- Include design descriptors
- Include size/form factor terms

Return JSON: {"name": "specific character/badge name", "description": "detailed description including character", "search_terms": ["Baby Yoda PCB", "Grogu badge", "The Child SAO", "character badge", "green PCB badge", "electronic badge", "conference badge", "hacker badge"]}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `[Analysis #${timestamp}] Analyze this electronic badge image in detail. What specific text, characters, shapes, colors, and design elements do you see? Generate diverse and specific search terms that would help identify this exact badge online.`
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
        max_tokens: 300,
        temperature: 0.5  // Add some variation to prevent identical responses
      })
    })

    let quickAnalysis = { name: 'Unknown Badge', description: 'Electronic conference badge', search_terms: [] }
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

    // Step 2: Try image-based matching first for higher accuracy
    console.log('Attempting image-based matching...')
    let imageMatches = []
    try {
      const { data: matchResult, error: matchError } = await supabase.functions.invoke('match-badge-image', {
        body: { imageBase64 }
      })
      
      if (!matchError && matchResult?.matches && matchResult.matches.length > 0) {
        imageMatches = matchResult.matches
        console.log(`Found ${imageMatches.length} image matches:`, imageMatches.map(m => 
          `${m.badge?.name || 'Unknown'}: ${Math.round(m.similarity * 100)}%`
        ))
      } else {
        console.log('No significant local image matches found, trying Google reverse image search...')
      }
    } catch (error) {
      console.error('Image matching error (continuing with Google search):', error)
    }

    // Step 2.5: Google Reverse Image Search (if no local matches)
    let googleResult = null
    if (imageMatches.length === 0) {
      console.log('🔍 STARTING GOOGLE REVERSE IMAGE SEARCH...')
      
      const serpApiKey = Deno.env.get('SERPAPI_KEY')
      if (serpApiKey) {
        try {
          // Convert base64 image to a format SerpAPI can use
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
              num: 1  // Just get the top result
            })
          })

          if (googleResponse.ok) {
            const googleData = await googleResponse.json()
            console.log('Google search response:', googleData)
            
            if (googleData.image_results && googleData.image_results.length > 0) {
              const topResult = googleData.image_results[0]
              googleResult = {
                name: topResult.title || 'Unknown Badge',
                description: topResult.snippet || 'Found via Google reverse image search',
                external_link: topResult.link,
                source: 'Google Image Search',
                confidence: 90, // High confidence for Google's top result
                thumbnail: topResult.thumbnail
              }
              console.log('Google found top result:', googleResult)
            } else {
              console.log('Google search returned no image results')
            }
          } else {
            console.log('Google search failed with status:', googleResponse.status)
          }
        } catch (error) {
          console.error('Google reverse image search error:', error)
        }
      } else {
        console.log('SERPAPI_KEY not found, skipping Google search')
      }
    }

    // Step 3: Search local database for text matches
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
          console.log(`Found ${matches.length} local text matches with confidence >= 20%`)
          if (matches.length > 0) {
            console.log('Best text matches:', matches.map(m => `${m.badge.name}: ${m.confidence}%`))
            console.log(`BEST LOCAL TEXT MATCH: ${matches[0].confidence}% confidence`)
          }
        }
      } catch (error) {
        console.error('Local database search error:', error)
      }
    }

    // Combine image matches with text matches, prioritizing image matches
    if (imageMatches.length > 0) {
      console.log('Merging image and text matches...')
      // Convert image matches to same format as text matches
      const imageMatchesFormatted = imageMatches.map(match => ({
        badge: match.badge,
        similarity: match.similarity,
        confidence: Math.round(match.similarity * 100) // Convert similarity to percentage
      }))
      
      // Prioritize high-confidence image matches
      const highConfidenceImageMatches = imageMatchesFormatted.filter(m => m.confidence >= 85)
      if (highConfidenceImageMatches.length > 0) {
        console.log(`Found ${highConfidenceImageMatches.length} high-confidence image matches (≥85%)`)
        matches = highConfidenceImageMatches.concat(matches).slice(0, 5) // Image matches first, then text
      } else {
        // Merge all matches and sort by confidence
        matches = imageMatchesFormatted.concat(matches)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
      }
      
      console.log('Final combined matches:', matches.map(m => `${m.badge.name}: ${m.confidence}%`))
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
          
          // For each source, try multiple search terms with randomization
          const baseSearchTerms = [
            quickAnalysis.name,
            ...(quickAnalysis.search_terms || [])
          ].filter(term => term && term.length > 0)
          
          // Add randomization to prevent getting stuck on same results
          const searchTerms = [...baseSearchTerms].sort(() => Math.random() - 0.5)
          
          console.log(`${source.name} search terms (randomized):`, searchTerms)
          
          for (const searchTerm of searchTerms) {
            if (webResults) break; // Stop on first success
            
            try {
              // Replace {query} placeholder in prompt template
              const searchQuery = source.prompt_template.replace('{query}', searchTerm)
              
              console.log(`Searching ${source.name} for: "${searchTerm}"`)
              
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
                      console.log(`${source.name} search for "${searchTerm}" found no results, trying next term...`)
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
                      external_link: externalLink,
                      search_term_used: searchTerm
                    }
                    searchSource = source.name
                    console.log(`Found via ${source.name} using "${searchTerm}":`, webResults)
                    break; // Stop on first success
                  }
                } catch (e) {
                  console.log(`Could not parse ${source.name} results for "${searchTerm}", trying next term...`)
                }
              } else {
                console.log(`${source.name} search for "${searchTerm}" failed with status ${response.status}`)
              }
            } catch (error) {
              console.error(`${source.name} search error for "${searchTerm}":`, error)
            }
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
    
    // Combine all analysis results - prioritize Google result if found
    const combinedAnalysis = googleResult ? {
      ...quickAnalysis,
      ...googleResult,
      confidence: googleResult.confidence,
      search_source: 'Google Image Search',
      web_info: googleResult,
      database_matches: matches.map(m => m.badge)
    } : shouldSearchWeb ? {
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