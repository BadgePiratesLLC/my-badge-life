import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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

// Cosine similarity calculation
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
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

    console.log('🚀 Processing image for badge matching with smart pre-filtering...')
    const startTime = Date.now()

    // Convert base64 to proper data URL if needed
    let uploadedImageData = imageBase64;
    if (!uploadedImageData.startsWith('data:')) {
      uploadedImageData = `data:image/jpeg;base64,${imageBase64}`;
    }

    // STEP 1: Create embedding for uploaded image using smart pre-filtering
    console.log('🧠 STEP 1: Creating embedding for uploaded image...')
    let uploadedImageEmbedding: number[] | null = null
    let candidateBadges: any[] = []
    
    try {
      // First, generate a text description of the uploaded image
      const descriptionRequest = {
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this electronic badge image in detail for embedding purposes. Include any visible text, colors, shapes, symbols, and design elements. Focus on factual visual elements that would help match it to similar badges.'
              },
              {
                type: 'image_url',
                image_url: { url: uploadedImageData }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      }

      const descriptionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(descriptionRequest)
      })

      if (descriptionResponse.ok) {
        const descriptionData = await descriptionResponse.json()
        const imageDescription = descriptionData.choices[0]?.message?.content || ''
        console.log('📝 Image description for embedding:', imageDescription.substring(0, 100) + '...')

        // Create embedding from the description
        const embeddingRequest = {
          model: 'text-embedding-3-small',
          input: imageDescription,
          encoding_format: 'float'
        }

        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(embeddingRequest)
        })

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json()
          uploadedImageEmbedding = embeddingData.data[0].embedding
          console.log('✅ Created embedding with', uploadedImageEmbedding.length, 'dimensions')
        }
      }
    } catch (error) {
      console.warn('⚠️ Embedding creation failed, falling back to full search:', error)
    }

    // STEP 2: Find similar badges using embeddings if available
    if (uploadedImageEmbedding) {
      console.log('🔍 STEP 2: Finding similar badges using embeddings...')
      
      const { data: embeddingRows, error: embeddingError } = await supabase
        .from('badge_embeddings')
        .select(`
          badge_id,
          embedding,
          badges (
            id,
            name,
            maker_id,
            description,
            year,
            category
          )
        `)

      if (!embeddingError && embeddingRows) {
        // Calculate similarities and sort
        const similarities = embeddingRows.map(row => ({
          badge: row.badges,
          badge_id: row.badge_id,
          similarity: cosineSimilarity(uploadedImageEmbedding!, row.embedding)
        })).sort((a, b) => b.similarity - a.similarity)

        // Take top 20 candidates for visual comparison, but fall back to more if embedding similarities are low
        const topCandidates = similarities.slice(0, similarities[0]?.similarity > 0.7 ? 12 : 25)
        console.log(`📊 Top embedding similarities:`)
        topCandidates.forEach((candidate, i) => {
          console.log(`  ${i + 1}. ${candidate.badge.name}: ${(candidate.similarity * 100).toFixed(1)}%`)
        })

        // Get badge images for top candidates
        const candidateBadgeIds = topCandidates.map(c => c.badge_id)
        const { data: imageRows, error: imageError } = await supabase
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
          .in('badge_id', candidateBadgeIds)
          .not('image_url', 'is', null)
          .order('is_primary', { ascending: false })

        if (!imageError && imageRows) {
          candidateBadges = imageRows.map(row => ({
            ...row,
            badges: { ...row.badges, image_url: row.image_url }
          }))
          console.log(`🎯 Pre-filtered to ${candidateBadges.length} badge images for visual comparison`)
        }
      }
    }

    // STEP 3: Fallback to all badges if embedding pre-filtering failed
    if (candidateBadges.length === 0) {
      console.log('📋 STEP 3: Embedding pre-filtering failed, using all badges...')
      
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
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })

      if (searchError) {
        throw new Error(`Database search error: ${searchError.message}`)
      }

      const primaryImages = imageRows?.filter(row => row.is_primary) || []
      const alternateImages = imageRows?.filter(row => !row.is_primary) || []
      candidateBadges = [...primaryImages, ...alternateImages]
      
      console.log(`📋 Fallback: Found ${primaryImages.length} primary and ${alternateImages.length} alternate badge images`)
    }
    
    // Apply additional text filtering if user provided context
    if (userText && userText.trim().length > 2 && candidateBadges.length > 20) {
      const textFilteredBadges = candidateBadges.filter(row => {
        const badge = row.badges
        const badgeText = `${badge.name || ''} ${badge.description || ''} ${badge.maker_id || ''}`
        const similarity = calculateTextSimilarity(userText, badgeText)
        return similarity > 0.1
      })
      
      if (textFilteredBadges.length > 0 && textFilteredBadges.length < candidateBadges.length * 0.8) {
        candidateBadges = textFilteredBadges
        console.log(`📝 Text filtering: Narrowed to ${candidateBadges.length} candidates based on: "${userText}"`)
      }
    }
    
    console.log(`🎯 STEP 4: Visual comparison with ${candidateBadges.length} candidates using optimized single-stage matching...`)
    
    // Optimized Single-Stage Visual Matching
    const visualResults = []
    const BATCH_SIZE = 10 // Larger batches for efficiency
    const DELAY_MS = 1000 // Reduced delay: 1 second between batches
    
    for (let i = 0; i < candidateBadges.length; i += BATCH_SIZE) {
      const batch = candidateBadges.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(candidateBadges.length / BATCH_SIZE)
      
      console.log(`🔍 Processing batch ${batchNumber}/${totalBatches} (${batch.length} badges)...`)
      
      const batchPromises = batch.map(async (row) => {
        const badge = { ...row.badges, image_url: row.image_url }
        try {
          // Single-stage detailed comparison
          const requestBody = {
            model: 'gpt-4.1-2025-04-14',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Compare these badge images for visual similarity (0-100%). Look at shape, colors, text content, artwork, design elements, and overall appearance. Consider if these could be the same badge. Respond with only a number.`
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
            max_tokens: 5,
            temperature: 0
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
            
            console.log(`✅ "${badge.name}": ${similarity}%`)
            
            return {
              badge,
              similarity: similarity / 100,
              confidence: similarity
            }
          } else {
            console.log(`❌ Failed "${badge.name}": Status ${comparison.status}`)
            return {
              badge,
              similarity: 0,
              confidence: 0
            }
          }
        } catch (error) {
          console.error(`❌ Error with ${badge.name}:`, error)
          return { badge, similarity: 0, confidence: 0 }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      visualResults.push(...batchResults)
      
      console.log(`📊 Batch ${batchNumber} complete`)
      
      // Short delay between batches
      if (i + BATCH_SIZE < candidateBadges.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
    }

    // Filter and sort results
    const SIMILARITY_THRESHOLD = 0.25 // 25% threshold for matches
    
    const finalMatches = visualResults
      .filter(result => result.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5) // Top 5 matches
    
    const processingTime = Date.now() - startTime
    console.log(`🎉 Analysis complete in ${processingTime}ms: ${finalMatches.length} matches found`)
    
    if (finalMatches.length === 0) {
      console.log('❌ No matches found above threshold')
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Log performance metrics
    finalMatches.forEach((match, index) => {
      console.log(`🏆 Match ${index + 1}: ${match.badge.name} (${match.confidence}% confidence)`)
    })
    
    return new Response(
      JSON.stringify({ 
        matches: finalMatches,
        processingTime,
        candidatesProcessed: candidateBadges.length,
        embeddingPreFilter: uploadedImageEmbedding ? true : false,
        message: `Found ${finalMatches.length} matches in ${(processingTime / 1000).toFixed(1)}s using smart pre-filtering`
      }),
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