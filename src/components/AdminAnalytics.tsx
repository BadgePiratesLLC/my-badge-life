import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  PieChart, 
  Users, 
  Search, 
  Database, 
  Globe, 
  Monitor, 
  Smartphone, 
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react'

interface AnalyticsData {
  uniqueUsers: number
  totalSearches: number
  databaseMatches: number
  webSearchMatches: number
  imageMatches: number
  averageSearchTime: number
  searchSources: { source: string; count: number }[]
  platforms: { platform: string; count: number; percentage: number }[]
  userSessions: {
    id: string
    user_id?: string | null
    ip_address?: string | null
    platform?: string | null
    browser?: string | null
    device_type?: string | null
    country?: string | null
    created_at: string
    last_activity: string
    display_name?: string | null
    email?: string | null
  }[]
  searchTrends: { date: string; count: number }[]
  successRate: number
}

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Calculate date filter based on time range
      const dateFilter = getDateFilter(timeRange)
      
      // Fetch user sessions with profiles
      const { data: sessionsData } = await supabase
        .from('analytics_sessions')
        .select('*')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })

      // Fetch profiles separately to avoid join issues
      const userIds = [...new Set((sessionsData || []).filter(s => s.user_id).map(s => s.user_id))]
      let profilesData: any[] = []
      
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds)
        profilesData = data || []
      }

      // Fetch search data
      const { data: searchesData } = await supabase
        .from('analytics_searches')
        .select('*')
        .gte('created_at', dateFilter)

      // Calculate analytics
      const uniqueUsers = new Set(
        (sessionsData || [])
          .filter(s => s.user_id)
          .map(s => s.user_id)
      ).size

      const totalSearches = searchesData?.length || 0
      
      const databaseMatches = searchesData?.filter(s => s.found_in_database).length || 0
      const webSearchMatches = searchesData?.filter(s => s.found_via_web_search).length || 0
      const imageMatches = searchesData?.filter(s => s.found_via_image_matching).length || 0
      
      const averageSearchTime = searchesData?.length > 0 
        ? Math.round((searchesData.reduce((acc, s) => acc + (s.total_duration_ms || 0), 0) / searchesData.length) / 1000)
        : 0

      // Calculate success rate
      const successfulSearches = searchesData?.filter(s => 
        s.found_in_database || s.found_via_web_search || s.found_via_image_matching
      ).length || 0
      const successRate = totalSearches > 0 ? Math.round((successfulSearches / totalSearches) * 100) : 0

      // Group search sources
      const searchSources = searchesData?.reduce((acc: { [key: string]: number }, search) => {
        const source = search.search_source_used || 'unknown'
        acc[source] = (acc[source] || 0) + 1
        return acc
      }, {}) || {}

      const searchSourcesArray = Object.entries(searchSources).map(([source, count]) => ({
        source,
        count: count as number
      }))

      // Group platforms
      const platforms = (sessionsData || []).reduce((acc: { [key: string]: number }, session) => {
        const platform = session.device_type || session.platform || 'Unknown'
        acc[platform] = (acc[platform] || 0) + 1
        return acc
      }, {})

      const totalSessions = (sessionsData || []).length
      const platformsArray = Object.entries(platforms).map(([platform, count]) => ({
        platform,
        count: count as number,
        percentage: totalSessions > 0 ? Math.round((count as number / totalSessions) * 100) : 0
      }))

      // Calculate search trends (last 7 days)
      const searchTrends = calculateSearchTrends(searchesData || [])

      // Merge session data with profile data
      const userSessionsWithProfiles = (sessionsData || []).map(session => {
        const profile = profilesData.find(p => p.id === session.user_id)
        return {
          id: session.id,
          user_id: session.user_id,
          ip_address: session.ip_address as string | null,
          platform: session.platform,
          browser: session.browser,
          device_type: session.device_type,
          country: session.country,
          created_at: session.created_at,
          last_activity: session.last_activity,
          display_name: profile?.display_name || null,
          email: profile?.email || null
        }
      })

      setAnalytics({
        uniqueUsers,
        totalSearches,
        databaseMatches,
        webSearchMatches,
        imageMatches,
        averageSearchTime,
        successRate,
        searchSources: searchSourcesArray,
        platforms: platformsArray,
        userSessions: userSessionsWithProfiles,
        searchTrends
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateFilter = (range: string): string => {
    const now = new Date()
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      default:
        return new Date(0).toISOString() // All time
    }
  }

  const calculateSearchTrends = (searches: any[]): { date: string; count: number }[] => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => ({
      date,
      count: searches.filter(s => s.created_at.startsWith(date)).length
    }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Failed to load analytics data. Please try again.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-mono">ANALYTICS DASHBOARD</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm ${
                timeRange === range 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-muted'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Connected users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSearches}</div>
            <p className="text-xs text-muted-foreground">Badge searches performed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.successRate}%</div>
            <p className="text-xs text-muted-foreground">Searches with results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Search Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageSearchTime}s</div>
            <p className="text-xs text-muted-foreground">Average duration</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Search Sources</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="sessions">User Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Search Results Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Search Results Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database Matches</span>
                    <Badge variant="default">{analytics.databaseMatches}</Badge>
                  </div>
                  <Progress 
                    value={analytics.totalSearches > 0 ? (analytics.databaseMatches / analytics.totalSearches) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Web Search Matches</span>
                    <Badge variant="secondary">{analytics.webSearchMatches}</Badge>
                  </div>
                  <Progress 
                    value={analytics.totalSearches > 0 ? (analytics.webSearchMatches / analytics.totalSearches) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Image Matches</span>
                    <Badge variant="outline">{analytics.imageMatches}</Badge>
                  </div>
                  <Progress 
                    value={analytics.totalSearches > 0 ? (analytics.imageMatches / analytics.totalSearches) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Search Activity (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.searchTrends.map((trend, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{new Date(trend.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.max(...analytics.searchTrends.map(t => t.count)) > 0 ? (trend.count / Math.max(...analytics.searchTrends.map(t => t.count))) * 100 : 0}
                        className="w-20 h-2"
                      />
                      <span className="text-sm font-medium w-8">{trend.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Search Source Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.searchSources.map((source, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {source.source === 'local_database' && <Database className="h-4 w-4" />}
                      {source.source === 'web_search' && <Globe className="h-4 w-4" />}
                      {source.source === 'image_matching' && <Search className="h-4 w-4" />}
                      <span className="font-medium capitalize">{source.source.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={analytics.totalSearches > 0 ? (source.count / analytics.totalSearches) * 100 : 0}
                        className="w-24 h-2"
                      />
                      <Badge variant="outline">{source.count}</Badge>
                    </div>
                  </div>
                ))}
                {analytics.searchSources.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No search data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Platform Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.platforms.map((platform, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {platform.platform.toLowerCase().includes('mobile') ? 
                        <Smartphone className="h-4 w-4" /> : 
                        <Monitor className="h-4 w-4" />
                      }
                      <span className="font-medium">{platform.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={platform.percentage} className="w-24 h-2" />
                      <Badge variant="outline">{platform.count} ({platform.percentage}%)</Badge>
                    </div>
                  </div>
                ))}
                {analytics.platforms.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No platform data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent User Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.userSessions.slice(0, 20).map((session, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {session.display_name || session.email || 'Anonymous User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.platform && `${session.platform} • `}
                        {session.browser && `${session.browser} • `}
                        {session.device_type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.ip_address && `IP: ${session.ip_address} • `}
                        {session.country && `${session.country} • `}
                        Last active: {new Date(session.last_activity).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant={session.user_id ? "default" : "secondary"}>
                      {session.user_id ? "Registered" : "Anonymous"}
                    </Badge>
                  </div>
                ))}
                {analytics.userSessions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No session data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}