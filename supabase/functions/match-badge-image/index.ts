import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// API logging utilities
interface ApiLogData {
  user_id?: string | null
  session_id?: string | null
  api_provider: 'openai' | 'serpapi' | 'replicate' | 'perplexity'
  endpoint: string
  method: string
  request_data?: any
  response_status?: number
  response_time_ms?: number
  tokens_used?: number
  estimated_cost_usd?: number
  success: boolean
  error_message?: string
}

async function logApiCall(logData: ApiLogData) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase credentials not available for API logging')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Sanitize request data (remove API keys)
    const sanitizedRequestData = logData.request_data ? 
      JSON.parse(JSON.stringify(logData.request_data).replace(/"[^"]*api[_-]?key[^"]*":\s*"[^"]*"/gi, '"api_key":"[REDACTED]"')) :
      null

    const { error } = await supabase
      .from('api_call_logs')
      .insert({
        user_id: logData.user_id,
        session_id: logData.session_id,
        api_provider: logData.api_provider,
        endpoint: logData.endpoint,
        method: logData.method,
        request_data: sanitizedRequestData,
        response_status: logData.response_status,
        response_time_ms: logData.response_time_ms,
        tokens_used: logData.tokens_used,
        estimated_cost_usd: logData.estimated_cost_usd,
        success: logData.success,
        error_message: logData.error_message
      })

    if (error) {
      console.error('Failed to log API call:', error)
    }
  } catch (error) {
    console.error('Error logging API call:', error)
  }
}

function estimateOpenAICost(model: string, inputTokens: number, outputTokens: number = 0): number {
  const costs = {
    'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
    'gpt-4o': { input: 0.0025 / 1000, output: 0.01 / 1000 }
  }
  
  const modelCosts = costs[model as keyof typeof costs]
  if (!modelCosts) return 0.001 // Default small cost
  
  return (modelCosts.input * inputTokens) + (modelCosts.output * outputTokens)
}

function countTokensApprox(text: string): number {
  return Math.ceil(text.length / 4)
}

// Text similarity function for pre-filtering
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0
  
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const words1 = normalize(text1).split(/\s+/).filter(w => w.length > 2)
  const words2 = normalize(text2).split(/\s+/).filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  // Calculate Jaccard similarity
  const set1 = new Set(words1)
  const set2 = new Set(words2)
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}

function countTokensApprox(text: string): number {
  return Math.ceil(text.length / 4)
}

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
    const { imageBase64, debug, userText } = await req.json()

    console.log('Processing image for badge matching with smart pre-filtering...')

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

    // Check for repeated failures and use fallback strategy
    const recentFailures = await supabase
      .from('api_call_logs')
      .select('success')
      .eq('api_provider', 'openai')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('created_at', { ascending: false })
      .limit(10)

    const failureRate = recentFailures.data?.filter(log => !log.success).length || 0
    const useFallbackMode = failureRate > 7 // If >70% recent failures, use fallback
    
    if (useFallbackMode) {
      console.log('⚠️ High API failure rate detected. Using minimal comparison mode...')
    }

    // Get both primary and alternate badge images to compare
    const { data: imageRows, error: searchError } = await supabase
      .from('badge_images')
      .select(`
        image_url,
        badge_id,
        is_primary,
        badges (
          id,
          name,
          maker_id,
          description,
          year,
          category
        )
      `)
      .not('image_url', 'is', null)
      .order('is_primary', { ascending: false }) // Primary images first
      .order('created_at', { ascending: false })

    if (searchError) {
      throw new Error(`Database search error: ${searchError.message}`)
    }

    const primaryImages = imageRows?.filter(row => row.is_primary) || []
    const alternateImages = imageRows?.filter(row => !row.is_primary) || []
    
    console.log(`Found ${primaryImages.length} primary and ${alternateImages.length} alternate badge images to compare`)

    // Smart Pre-filtering (Step 1): Filter candidates based on text similarity
    let candidateBadges = [...primaryImages, ...alternateImages]
    
    if (userText && userText.trim().length > 2) {
      const textFilteredBadges = candidateBadges.filter(row => {
        const badge = row.badges
        const badgeText = `${badge.name || ''} ${badge.description || ''} ${badge.maker_id || ''}`
        const similarity = calculateTextSimilarity(userText, badgeText)
        return similarity > 0.1 // Keep badges with >10% text similarity
      })
      
      if (textFilteredBadges.length > 0 && textFilteredBadges.length < candidateBadges.length * 0.8) {
        candidateBadges = textFilteredBadges
        console.log(`Text pre-filtering: Narrowed from ${primaryImages.length + alternateImages.length} to ${candidateBadges.length} candidates based on text: "${userText}"`)
      } else {
        console.log(`Text pre-filtering: Keeping all badges (${candidateBadges.length}) - filter too restrictive or text too generic`)
      }
    } else {
      console.log('No user text provided - skipping text pre-filtering')
    }
    
    console.log(`Will compare with ${candidateBadges.length} badge images using ${useFallbackMode ? 'minimal' : 'two-stage'} matching...`)
    
    if (useFallbackMode) {
      // Fallback: Only compare with top 5 most likely candidates
      const limitedCandidates = candidateBadges.slice(0, 5)
      console.log(`Using fallback mode: comparing with only ${limitedCandidates.length} badges`)
      
      const fallbackMatches = []
      
      for (const row of limitedCandidates) {
        const badge = { ...row.badges, image_url: row.image_url }
        try {
          const requestBody = {
            model: 'gpt-4.1-2025-04-14',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Rate similarity 0-100%. Respond with only a number.`
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
            max_tokens: 5
          }
          
          const comparison = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          })

          if (comparison.ok) {
            const result = await comparison.json()
            const similarityText = result.choices[0]?.message?.content?.trim()
            const similarity = parseInt(similarityText) || 0
            
            console.log(`Fallback - "${badge.name}": ${similarity}%`)
            
            fallbackMatches.push({
              badge,
              similarity: similarity / 100,
              confidence: similarity
            })
          } else {
            console.log(`Fallback failed for ${badge.name}: ${comparison.status}`)
          }
        } catch (error) {
          console.error(`Fallback error for ${badge.name}:`, error)
        }
        
        // Add delay between individual calls in fallback mode
        await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay
      }
      
      // Return fallback results
      const matches = fallbackMatches
        .filter(match => match.similarity >= 0.5)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
      
      console.log(`Fallback complete: ${matches.length} matches found`)
      
      return new Response(
        JSON.stringify({ 
          matches,
          fallbackMode: true,
          message: "Using minimal comparison due to API issues"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Two-Stage Matching Implementation with conservative rate limiting
    console.log('=== STAGE 1: Fast Visual Screening ===')
    
    // Stage 1: Fast comparison with simplified prompt
    const stage1Results = []
    const STAGE1_BATCH_SIZE = 8 // Smaller batches for better rate limiting
    const STAGE1_DELAY_MS = 3000 // Longer delay: 3 seconds between batches
    
    for (let i = 0; i < candidateBadges.length; i += STAGE1_BATCH_SIZE) {
      const batch = candidateBadges.slice(i, i + STAGE1_BATCH_SIZE)
      const batchNumber = Math.floor(i / STAGE1_BATCH_SIZE) + 1
      const totalBatches = Math.ceil(candidateBadges.length / STAGE1_BATCH_SIZE)
      
      console.log(`Stage 1 - Processing batch ${batchNumber}/${totalBatches} (${batch.length} badges)...`)
      
      const batchPromises = batch.map(async (row) => {
        const badge = { ...row.badges, image_url: row.image_url }
        try {
          const startTime = Date.now()
          
          // Stage 1: Simple, fast comparison
          const requestBody = {
        model: 'gpt-4.1-2025-04-14',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Quick visual similarity check: Rate these badge images 0-100% similarity. Focus on overall shape, main colors, and text. Respond with only a number.`
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
            max_tokens: 5, // Very short response
            temperature: 0.1 // More deterministic
          }
          
          const comparison = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          })

          const responseTime = Date.now() - startTime
          
          if (comparison.ok) {
            const result = await comparison.json()
            const similarityText = result.choices[0]?.message?.content?.trim()
            const similarity = parseInt(similarityText) || 0
            
            console.log(`Stage 1 - "${badge.name}": ${similarity}%`)
            
            return {
              badge,
              similarity: similarity / 100,
              confidence: similarity,
              stage: 1
            }
          } else {
            const isRateLimited = comparison.status === 429
            console.log(`Stage 1 - Failed "${badge.name}": ${isRateLimited ? 'Rate limited' : 'API error'}`)
            return {
              badge,
              similarity: 0,
              confidence: 0,
              rateLimited: isRateLimited,
              stage: 1
            }
          }
        } catch (error) {
          console.error(`Stage 1 error with ${badge.name}:`, error)
          return { badge, similarity: 0, confidence: 0, stage: 1 }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      stage1Results.push(...batchResults)
      
      console.log(`Stage 1 batch ${batchNumber} complete`)
      
      // Delay between batches
      if (i + STAGE1_BATCH_SIZE < candidateBadges.length) {
        await new Promise(resolve => setTimeout(resolve, STAGE1_DELAY_MS))
      }
    }

    // Filter top candidates for Stage 2
    const STAGE1_THRESHOLD = 0.3 // 30% threshold for stage 1
    const MAX_STAGE2_CANDIDATES = 15 // Limit stage 2 candidates
    
    const stage2Candidates = stage1Results
      .filter(result => result.similarity >= STAGE1_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, MAX_STAGE2_CANDIDATES)
    
    console.log(`Stage 1 complete: ${stage2Candidates.length} candidates passed threshold for detailed analysis`)
    
    if (stage2Candidates.length === 0) {
      console.log('No candidates passed Stage 1 screening')
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stage 2: Detailed comparison on top candidates
    console.log('=== STAGE 2: Detailed Visual Analysis ===')
    
    const stage2Results = []
    const STAGE2_BATCH_SIZE = 5 // Much smaller batches for detailed analysis  
    const STAGE2_DELAY_MS = 4000 // Longer delay: 4 seconds for stage 2
    
    for (let i = 0; i < stage2Candidates.length; i += STAGE2_BATCH_SIZE) {
      const batch = stage2Candidates.slice(i, i + STAGE2_BATCH_SIZE)
      const batchNumber = Math.floor(i / STAGE2_BATCH_SIZE) + 1
      const totalBatches = Math.ceil(stage2Candidates.length / STAGE2_BATCH_SIZE)
      
      console.log(`Stage 2 - Processing batch ${batchNumber}/${totalBatches} (${batch.length} badges)...`)
      
      const batchPromises = batch.map(async (candidate) => {
        const badge = candidate.badge
        try {
          const startTime = Date.now()
          
          // Stage 2: Detailed comparison
          const requestBody = {
      model: 'gpt-4.1-2025-04-14',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Detailed visual comparison: Rate similarity 0-100% based on shape, colors, text content, artwork details, size, and overall design. Look for exact matches of text, logos, and design elements. Respond with only a number.`
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
            max_tokens: 10,
            temperature: 0 // Most deterministic for final scoring
          }
          
          const comparison = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          })

          const responseTime = Date.now() - startTime
          
          if (comparison.ok) {
            const result = await comparison.json()
            const similarityText = result.choices[0]?.message?.content?.trim()
            const similarity = parseInt(similarityText) || 0
            
            console.log(`Stage 2 - "${badge.name}": ${similarity}% (was ${candidate.confidence}% in stage 1)`)
            
            // Log the API call
            const promptText = `Detailed visual comparison: Rate similarity 0-100% based on shape, colors, text content, artwork details, size, and overall design.`
            const inputTokens = countTokensApprox(promptText)
            const outputTokens = countTokensApprox(similarityText || '0')
            const estimatedCost = estimateOpenAICost('gpt-4o-mini', inputTokens, outputTokens)
            
            await logApiCall({
              api_provider: 'openai',
              endpoint: '/chat/completions',
              method: 'POST',
              request_data: { model: 'gpt-4o-mini', max_tokens: 10, messages: 'detailed_image_comparison' },
              response_status: comparison.status,
              response_time_ms: responseTime,
              tokens_used: inputTokens + outputTokens,
              estimated_cost_usd: estimatedCost,
              success: true
            })
            
            return {
              badge,
              similarity: similarity / 100,
              confidence: similarity,
              stage1Score: candidate.confidence,
              stage: 2
            }
          } else {
            const isRateLimited = comparison.status === 429
            console.log(`Stage 2 - Failed "${badge.name}": ${isRateLimited ? 'Rate limited' : 'API error'}`)
            return {
              badge,
              similarity: 0,
              confidence: 0,
              rateLimited: isRateLimited,
              stage: 2
            }
          }
        } catch (error) {
          console.error(`Stage 2 error with ${badge.name}:`, error)
          return { badge, similarity: 0, confidence: 0, stage: 2 }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      stage2Results.push(...batchResults)
      
      console.log(`Stage 2 batch ${batchNumber} complete`)
      
      // Delay between batches
      if (i + STAGE2_BATCH_SIZE < stage2Candidates.length) {
        await new Promise(resolve => setTimeout(resolve, STAGE2_DELAY_MS))
      }
    }

    const allMatches = stage2Results

    // Check for excessive rate limiting
    const totalRateLimited = allMatches.filter(match => match.rateLimited).length
    if (totalRateLimited > stage2Candidates.length * 0.5) {
      throw new Error(`OpenAI API rate limit exceeded. ${totalRateLimited} out of ${stage2Candidates.length} detailed comparisons failed due to rate limiting. Please try again in a few minutes.`)
    }

    // Sort by Stage 2 similarity (final detailed scores)
    allMatches.sort((a, b) => b.similarity - a.similarity)

    // Log top similarities for debugging
    console.log('Top badge similarities after 2-stage matching:', allMatches.slice(0, 10).map(m => 
      `${m.badge?.name || 'Unknown'}: ${(m.similarity * 100).toFixed(1)}% (Stage 1: ${m.stage1Score || 'N/A'}%)`
    ))

    // Apply final threshold and limit
    const FINAL_THRESHOLD = 0.5
    const TOP_N = 3
    const matches = allMatches
      .filter(match => match.similarity >= FINAL_THRESHOLD)
      .slice(0, TOP_N)

    const totalOriginalBadges = primaryImages.length + alternateImages.length
    const totalStage1Processed = candidateBadges.length
    const totalStage2Processed = stage2Candidates.length
    const successfulComparisons = allMatches.filter(match => !match.rateLimited).length
    
    console.log(`=== FINAL RESULTS ===`)
    console.log(`Original database: ${totalOriginalBadges} badges`)
    console.log(`After text filtering: ${totalStage1Processed} badges`)
    console.log(`After stage 1 screening: ${totalStage2Processed} badges`)  
    console.log(`Final matches: ${matches.length} above ${FINAL_THRESHOLD * 100}% threshold`)
    console.log(`Total API calls: ${totalStage1Processed + totalStage2Processed}`)

    const responsePayload: any = { matches }
    if (debug) {
      responsePayload.debug = {
        model: 'gpt-4o-mini',
        stages: 'two-stage matching with text pre-filtering',
        threshold: FINAL_THRESHOLD,
        topN: TOP_N,
        originalDatabaseSize: totalOriginalBadges,
        textFilteredSize: totalStage1Processed,
        stage1Candidates: totalStage1Processed,
        stage2Candidates: totalStage2Processed,
        totalApiCalls: totalStage1Processed + totalStage2Processed,
        topSimilarities: allMatches.slice(0, 10).map(m => ({
          name: m.badge?.name || 'Unknown',
          stage1Score: m.stage1Score || 'N/A',
          finalScore: Math.round((m.similarity || 0) * 100)
        }))
      }
    }

    return new Response(
      JSON.stringify(responsePayload),
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