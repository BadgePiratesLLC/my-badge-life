import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Activity, DollarSign, Zap, AlertCircle, Clock, TrendingUp, Database } from 'lucide-react'
import { toast } from 'sonner'

interface ApiCallLog {
  id: string
  api_provider: string
  endpoint: string
  response_status: number
  response_time_ms: number
  tokens_used: number | null
  estimated_cost_usd: number | null
  success: boolean
  created_at: string
  user_id: string | null
}

interface ApiStats {
  totalCalls: number
  totalCost: number
  avgResponseTime: number
  successRate: number
  providerBreakdown: Record<string, number>
  dailyUsage: Array<{ date: string; calls: number; cost: number }>
  recentCalls: ApiCallLog[]
}

const API_COLORS = {
  openai: '#10B981',
  serpapi: '#3B82F6', 
  replicate: '#8B5CF6',
  perplexity: '#F59E0B'
}

export function ApiAnalytics() {
  const [stats, setStats] = useState<ApiStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('7d')

  useEffect(() => {
    fetchApiStats()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('api-analytics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'api_call_logs'
        },
        () => {
          // Refresh stats when new API calls are logged
          fetchApiStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [timeframe])

  const fetchApiStats = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeframe) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24)
          break
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(startDate.getDate() - 90)
          break
        default:
          startDate.setDate(startDate.getDate() - 7)
      }

      // Fetch API call logs
      const { data: logs, error } = await supabase
        .from('api_call_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate statistics
      const totalCalls = logs?.length || 0
      const totalCost = logs?.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0) || 0
      const avgResponseTime = logs?.length ? 
        logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logs.length : 0
      const successfulCalls = logs?.filter(log => log.success).length || 0
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

      // Provider breakdown
      const providerBreakdown = logs?.reduce((acc, log) => {
        acc[log.api_provider] = (acc[log.api_provider] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Daily usage
      const dailyUsage = Array.from({ length: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) }, (_, i) => {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayLogs = logs?.filter(log => 
          log.created_at.split('T')[0] === dateStr
        ) || []
        
        return {
          date: dateStr,
          calls: dayLogs.length,
          cost: dayLogs.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0)
        }
      })

      setStats({
        totalCalls,
        totalCost,
        avgResponseTime,
        successRate,
        providerBreakdown,
        dailyUsage,
        recentCalls: logs?.slice(0, 10) || []
      })
    } catch (error) {
      console.error('Error fetching API stats:', error)
      toast.error('Failed to load API analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No API call data available
        </CardContent>
      </Card>
    )
  }

  const pieData = Object.entries(stats.providerBreakdown).map(([provider, calls]) => ({
    name: provider.toUpperCase(),
    value: calls,
    fill: API_COLORS[provider as keyof typeof API_COLORS] || '#6B7280'
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono">API ANALYTICS</h2>
          <p className="text-muted-foreground">Monitor API usage and costs across all services</p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgResponseTime)}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Daily API Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()} 
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: number) => [value, 'API Calls']}
                />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* API Provider Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              API Provider Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent API Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent API Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentCalls.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent API calls</p>
            ) : (
              stats.recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={call.success ? "default" : "destructive"}
                      style={{ 
                        backgroundColor: call.success ? API_COLORS[call.api_provider as keyof typeof API_COLORS] || '#6B7280' : undefined 
                      }}
                    >
                      {call.api_provider.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{call.endpoint}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(call.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {call.response_time_ms}ms
                    </p>
                    {call.estimated_cost_usd && (
                      <p className="text-xs text-muted-foreground">
                        ${call.estimated_cost_usd.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}