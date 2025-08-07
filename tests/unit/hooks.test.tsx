import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { useBadges } from '@/hooks/useBadges'

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', name: 'Test Badge 1', description: 'Test Description 1' },
            { id: '2', name: 'Test Badge 2', description: 'Test Description 2' }
          ],
          error: null
        })
      })
    })
  }
}))

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
  })

  it('should handle auth state changes', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' }
    
    // Mock successful auth
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    const { result } = renderHook(() => useAuth())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })
})

describe('useBadges Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch badges successfully', async () => {
    const { result } = renderHook(() => useBadges())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.badges).toHaveLength(2)
    expect(result.current.badges[0].name).toBe('Test Badge 1')
  })

  it('should handle loading state', () => {
    const { result } = renderHook(() => useBadges())
    
    expect(result.current.loading).toBe(true)
    expect(result.current.badges).toEqual([])
  })

  it('should refetch badges when requested', async () => {
    const { result } = renderHook(() => useBadges())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    // Call refetch
    result.current.refetch()
    
    // Should call the Supabase query again
    expect(supabase.from).toHaveBeenCalledWith('badges')
  })
})