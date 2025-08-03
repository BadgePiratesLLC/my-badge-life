import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { logApiCall, estimateOpenAICost, countTokensApprox } from '../_shared/api-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!openaiApiKey) {
      throw new Error('Missing OpenAI API key')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { imageBase64 } = await req.json()

    console.log('🔍 STEP 3: Starting AI analysis as fallback...')
    
    const searchStartTime = Date.now()
    const statusUpdates = []
    const analytics = {
      search_type: 'ai_analysis',
      ai_analysis_duration_ms: 0,
      found_via_ai: false,
      ai_confidence: 0,
      total_duration_ms: 0
    }
    
    statusUpdates.push({ stage: 'ai_analysis', status: 'searching', message: 'Running AI analysis as fallback...' })
    
    try {
      statusUpdates.push({ stage: 'ai_analysis', status: 'processing', message: 'Analyzing badge features with AI...' })
      const openaiRequestData = {
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
      }

      const startTime = Date.now()
      const aiAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openaiRequestData)
      })

      const responseTime = Date.now() - startTime
      const responseStatus = aiAnalysisResponse.status
      
      // Log API call
      const systemPrompt = openaiRequestData.messages[0].content
      const userPrompt = openaiRequestData.messages[1].content[0].text
      const inputTokens = countTokensApprox(systemPrompt + userPrompt)
      const outputTokens = Math.ceil(300 * 0.7) // Estimate based on max_tokens
      const estimatedCost = estimateOpenAICost('gpt-4o', inputTokens, outputTokens)
      
      logApiCall({
        api_provider: 'openai',
        endpoint: '/v1/chat/completions',
        method: 'POST',
        request_data: openaiRequestData,
        response_status: responseStatus,
        response_time_ms: responseTime,
        tokens_used: inputTokens + outputTokens,
        estimated_cost_usd: estimatedCost,
        success: aiAnalysisResponse.ok
      })

      analytics.ai_analysis_duration_ms = Date.now() - searchStartTime

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

      analytics.found_via_ai = true
      analytics.ai_confidence = aiResult.confidence
      analytics.total_duration_ms = Date.now() - searchStartTime
      
      statusUpdates.push({ 
        stage: 'ai_analysis', 
        status: 'success', 
        message: `AI identified: ${aiResult.name} (${aiResult.confidence}% confidence)` 
      })

      console.log(`✅ AI ANALYSIS COMPLETE: "${aiResult.name}" (${aiResult.confidence}% confidence)`)
      
      // Save analytics
      try {
        await supabase.from('analytics_searches').insert({
          search_type: analytics.search_type,
          ai_analysis_duration_ms: analytics.ai_analysis_duration_ms,
          total_duration_ms: analytics.total_duration_ms,
          results_found: 1,
          best_confidence_score: aiResult.confidence,
          found_in_database: false,
          found_via_web_search: false,
          found_via_image_matching: false,
          search_source_used: 'AI Analysis'
        })
      } catch (error) {
        console.error('Analytics tracking error:', error)
      }

      return new Response(
        JSON.stringify({ 
          analysis: aiResult,
          statusUpdates,
          analytics
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      analytics.ai_analysis_duration_ms = Date.now() - searchStartTime
      analytics.total_duration_ms = Date.now() - searchStartTime
      
      statusUpdates.push({ 
        stage: 'ai_analysis', 
        status: 'failed', 
        message: `AI analysis failed: ${error.message}` 
      })
      
      console.error('❌ AI analysis error:', error)
      
      // Save analytics even for failures
      try {
        await supabase.from('analytics_searches').insert({
          search_type: analytics.search_type,
          ai_analysis_duration_ms: analytics.ai_analysis_duration_ms,
          total_duration_ms: analytics.total_duration_ms,
          results_found: 0,
          best_confidence_score: 0,
          found_in_database: false,
          found_via_web_search: false,
          found_via_image_matching: false,
          search_source_used: 'AI Analysis Failed'
        })
      } catch (error) {
        console.error('Analytics tracking error:', error)
      }
      
      return new Response(
        JSON.stringify({ 
          analysis: {
            name: 'Unknown Badge',
            description: 'Could not identify this badge',
            confidence: 0,
            search_source: 'AI Analysis',
            error: 'AI analysis failed'
          },
          statusUpdates,
          analytics
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in ai-badge-analysis function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})