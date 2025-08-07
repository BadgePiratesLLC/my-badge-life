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

    // Get primary badge images to compare (use badge_images is_primary)
    const { data: imageRows, error: searchError } = await supabase
      .from('badge_images')
      .select(`
        image_url,
        badge_id,
        badges (
          id,
          name,
          maker_id,
          description,
          year,
          category
        )
      `)
      .eq('is_primary', true)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })

    if (searchError) {
      throw new Error(`Database search error: ${searchError.message}`)
    }

    console.log(`Found ${imageRows?.length || 0} primary badge images to compare`)

    // Limit comparisons to a reasonable number to control cost/latency
    const MAX_COMPARE = 60
    const badgesToCompare = (imageRows || []).slice(0, MAX_COMPARE)
    console.log(`Comparing with ${badgesToCompare.length} badges in parallel...`)
    
    const comparePromises = badgesToCompare.map(async (row) => {
      const badge = { ...row.badges, image_url: row.image_url }
      try {
        const startTime = Date.now()
        
        // Use OpenAI vision to compare the two images
        const requestBody = {
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
        const success = comparison.ok
        let similarity = 0
        let errorMessage = null

        if (success) {
          const result = await comparison.json()
          const similarityText = result.choices[0]?.message?.content?.trim()
          similarity = parseInt(similarityText) || 0
          
          console.log(`Similarity for "${badge.name}": ${similarity}%`)
          
          // Log the API call
          const promptText = `Compare these two badge images. Rate similarity 0-100% based on visual design, shape, colors, text, and overall appearance. Respond with only a number.`
          const inputTokens = countTokensApprox(promptText)
          const outputTokens = countTokensApprox(similarityText || '0')
          const estimatedCost = estimateOpenAICost('gpt-4o-mini', inputTokens, outputTokens)
          
          await logApiCall({
            api_provider: 'openai',
            endpoint: '/chat/completions',
            method: 'POST',
            request_data: { model: 'gpt-4o-mini', max_tokens: 10, messages: 'image_comparison' },
            response_status: comparison.status,
            response_time_ms: responseTime,
            tokens_used: inputTokens + outputTokens,
            estimated_cost_usd: estimatedCost,
            success: true
          })
          
          return {
            badge: badge,
            similarity: similarity / 100,
            confidence: similarity
          }
        } else {
          errorMessage = `API call failed with status ${comparison.status}`
          console.log(`Failed to compare with ${badge.name}: ${errorMessage}`)
          
          // Log the failed API call
          await logApiCall({
            api_provider: 'openai',
            endpoint: '/chat/completions',
            method: 'POST',
            request_data: { model: 'gpt-4o-mini', max_tokens: 10, messages: 'image_comparison' },
            response_status: comparison.status,
            response_time_ms: responseTime,
            success: false,
            error_message: errorMessage
          })
          
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

    console.log(`Found ${matches.length} matches above 25% threshold (out of ${imageRows?.length || 0} primary images)`)

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