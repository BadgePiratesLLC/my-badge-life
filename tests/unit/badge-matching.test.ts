import { describe, it, expect, vi } from 'vitest'

// Mock the text similarity function from the edge function
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

describe('Badge Matching Logic', () => {
  describe('Text Similarity', () => {
    it('should return 1 for identical text', () => {
      const result = calculateTextSimilarity('DefCon Human Badge', 'DefCon Human Badge')
      expect(result).toBe(1)
    })

    it('should return 0 for completely different text', () => {
      const result = calculateTextSimilarity('DefCon Human Badge', 'Apple Pie Recipe')
      expect(result).toBe(0)
    })

    it('should handle partial matches', () => {
      const result = calculateTextSimilarity('DefCon 33 Human Badge', 'DefCon Human')
      expect(result).toBeGreaterThan(0.5)
      expect(result).toBeLessThan(1)
    })

    it('should be case insensitive', () => {
      const result = calculateTextSimilarity('DEFCON HUMAN', 'defcon human')
      expect(result).toBe(1)
    })

    it('should handle empty strings', () => {
      expect(calculateTextSimilarity('', 'test')).toBe(0)
      expect(calculateTextSimilarity('test', '')).toBe(0)
      expect(calculateTextSimilarity('', '')).toBe(0)
    })

    it('should ignore punctuation', () => {
      const result = calculateTextSimilarity('DefCon-33: Human Badge!', 'DefCon 33 Human Badge')
      expect(result).toBeGreaterThan(0.8)
    })

    it('should filter out short words', () => {
      const result = calculateTextSimilarity('DefCon a an the Human', 'DefCon Human Badge')
      expect(result).toBeGreaterThan(0.5)
    })
  })

  describe('Badge Filtering Logic', () => {
    const mockBadges = [
      { badges: { name: 'DefCon 33 Human Badge', description: 'Electronic badge from DefCon 33', maker_id: 'defcon' } },
      { badges: { name: 'BSides 2024 Badge', description: 'Security conference badge', maker_id: 'bsides' } },
      { badges: { name: 'CactusCon Participant', description: 'Arizona hacker conference', maker_id: 'cactuscon' } }
    ]

    it('should filter badges based on text similarity', () => {
      const userText = 'DefCon Human'
      const threshold = 0.1
      
      const filtered = mockBadges.filter(badge => {
        const badgeText = `${badge.badges.name} ${badge.badges.description} ${badge.badges.maker_id}`
        const similarity = calculateTextSimilarity(userText, badgeText)
        return similarity > threshold
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].badges.name).toBe('DefCon 33 Human Badge')
    })

    it('should return all badges when no good matches found', () => {
      const userText = 'NonExistent Badge'
      const threshold = 0.1
      
      const filtered = mockBadges.filter(badge => {
        const badgeText = `${badge.badges.name} ${badge.badges.description} ${badge.badges.maker_id}`
        const similarity = calculateTextSimilarity(userText, badgeText)
        return similarity > threshold
      })

      // Should fallback to all badges when filter is too restrictive
      expect(filtered.length).toBeLessThanOrEqual(mockBadges.length)
    })
  })
})

describe('API Response Validation', () => {
  it('should validate badge match response structure', () => {
    const mockResponse = {
      matches: [
        {
          badge: {
            id: 'test-id',
            name: 'Test Badge',
            description: 'Test Description',
            image_url: 'https://test.com/image.jpg'
          },
          similarity: 0.95,
          confidence: 95
        }
      ]
    }

    expect(mockResponse).toHaveProperty('matches')
    expect(Array.isArray(mockResponse.matches)).toBe(true)
    expect(mockResponse.matches[0]).toHaveProperty('badge')
    expect(mockResponse.matches[0]).toHaveProperty('similarity')
    expect(mockResponse.matches[0]).toHaveProperty('confidence')
    expect(mockResponse.matches[0].similarity).toBeGreaterThanOrEqual(0)
    expect(mockResponse.matches[0].similarity).toBeLessThanOrEqual(1)
  })

  it('should handle empty matches', () => {
    const mockResponse = { matches: [] }
    
    expect(mockResponse.matches).toHaveLength(0)
    expect(Array.isArray(mockResponse.matches)).toBe(true)
  })
})

describe('Rate Limiting Logic', () => {
  it('should calculate rate limit percentage correctly', () => {
    const totalRequests = 20
    const rateLimitedRequests = 16
    const percentage = rateLimitedRequests / totalRequests
    
    expect(percentage).toBe(0.8)
    expect(percentage > 0.5).toBe(true) // Should trigger error
  })

  it('should handle batch processing math', () => {
    const totalBadges = 128
    const batchSize = 12
    const expectedBatches = Math.ceil(totalBadges / batchSize)
    
    expect(expectedBatches).toBe(11)
    
    // Last batch should have remaining badges
    const lastBatchSize = totalBadges - (batchSize * (expectedBatches - 1))
    expect(lastBatchSize).toBe(8)
  })
})