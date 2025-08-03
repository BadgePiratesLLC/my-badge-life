import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// Cost estimations (approximate)
const COST_ESTIMATES = {
  openai: {
    'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 }, // per token
    'gpt-4o': { input: 0.0025 / 1000, output: 0.01 / 1000 },
    'text-embedding-3-small': 0.00002 / 1000,
    'text-embedding-ada-002': 0.0001 / 1000
  },
  serpapi: 0.001, // per search
  replicate: 0.01, // average per prediction
  perplexity: 0.0005 // per request
}

export async function logApiCall(logData: ApiLogData) {
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

export function estimateOpenAICost(model: string, inputTokens: number, outputTokens: number = 0): number {
  const costs = COST_ESTIMATES.openai[model as keyof typeof COST_ESTIMATES.openai]
  if (!costs) return 0

  if (typeof costs === 'number') {
    return costs * (inputTokens + outputTokens)
  }

  return (costs.input * inputTokens) + (costs.output * outputTokens)
}

export function estimateApiCost(provider: string, request_data?: any): number {
  switch (provider) {
    case 'serpapi':
      return COST_ESTIMATES.serpapi
    case 'replicate':
      return COST_ESTIMATES.replicate
    case 'perplexity':
      return COST_ESTIMATES.perplexity
    default:
      return 0
  }
}

export function countTokensApprox(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}