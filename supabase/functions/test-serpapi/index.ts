import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const serpApiKey = Deno.env.get('SERPAPI_KEY')
    console.log('Testing SERPAPI_KEY:', serpApiKey ? `Found (${serpApiKey.length} chars)` : 'Not found')
    
    if (!serpApiKey) {
      return new Response(
        JSON.stringify({ error: 'SERPAPI_KEY not found in environment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test with a simple Google search first
    console.log('Testing SerpAPI with simple search...')
    const testResponse = await fetch(`https://serpapi.com/search?engine=google&q=test&api_key=${serpApiKey}`)
    
    console.log('SerpAPI response status:', testResponse.status)
    console.log('SerpAPI response headers:', Object.fromEntries(testResponse.headers.entries()))
    
    const testData = await testResponse.json()
    console.log('SerpAPI response:', JSON.stringify(testData, null, 2))
    
    return new Response(
      JSON.stringify({ 
        status: testResponse.status,
        keyFound: true,
        keyLength: serpApiKey.length,
        response: testData,
        success: testResponse.ok
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('SerpAPI test error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})