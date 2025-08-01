import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sourceId, url, promptTemplate } = await req.json();

    if (!query || !url || !promptTemplate) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: query, url, promptTemplate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing web search for query: "${query}"`);
    console.log(`Source: ${sourceId}`);
    console.log(`URL: ${url}`);

    // Get the Perplexity API key
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Replace {query} in the prompt template
    const searchPrompt = promptTemplate.replace('{query}', query);
    console.log(`Search prompt: ${searchPrompt}`);

    // Make the API call
    const response = await fetch(url, {
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
            content: 'You are a helpful assistant that searches for badge information. Always return valid JSON responses.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        return_images: false,
        return_related_questions: false,
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    console.log(`API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `API request failed with status ${response.status}`,
          details: errorText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawResponse = await response.json();
    console.log('Raw API response received');

    // Extract the result
    let result = null;
    if (rawResponse.choices && rawResponse.choices[0] && rawResponse.choices[0].message) {
      const content = rawResponse.choices[0].message.content;
      console.log(`AI response content: ${content}`);
      
      try {
        // Try to parse as JSON
        result = JSON.parse(content);
      } catch (parseError) {
        // If not JSON, return as text
        result = { text: content, parsed: false };
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        result,
        rawResponse,
        query,
        sourceId,
        promptUsed: searchPrompt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-web-search function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});