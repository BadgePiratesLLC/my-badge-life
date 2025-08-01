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
    const replicateToken = Deno.env.get('REPLICATE_API_TOKEN')
    
    console.log('Testing Replicate API token...')
    console.log('Token exists:', !!replicateToken)
    console.log('Token length:', replicateToken?.length || 0)
    
    if (!replicateToken) {
      return new Response(
        JSON.stringify({ 
          error: 'REPLICATE_API_TOKEN not configured',
          hasToken: false
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Test a simple API call
    console.log('Testing Replicate API call...')
    const testResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${replicateToken}`,
      }
    })

    console.log('Test response status:', testResponse.status)
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.error('Replicate API test failed:', errorText)
      return new Response(
        JSON.stringify({ 
          error: `Replicate API test failed: ${testResponse.status} ${testResponse.statusText}`,
          details: errorText,
          hasToken: true
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const testData = await testResponse.json()
    console.log('Replicate API test successful')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Replicate API token is working correctly',
        hasToken: true,
        testResponse: testData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Test function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        hasToken: !!Deno.env.get('REPLICATE_API_TOKEN')
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})