'use client'
import { Select } from 'antd'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/atom-elements/card'
import { fetchAppLogs } from '@/infrastructure/api//explore'
import { post } from '@/infrastructure/api//base'
// 模拟数据
const defaultChartData: ChartDataPoint[] = [
  { date: '00:00', value: 0 },
  { date: '04:00', value: 100 },
  { date: '08:00', value: 200 },
  { date: '12:00', value: 300 },
  { date: '16:00', value: 400 },
  { date: '20:00', value: 500 },
]

type StatCardProps = {
  title: string
  value: string | number
  desc?: string
}

type AccumulativeStatistics = {
  app_id: string
  token_sum: number
  user_count: number
  guest_count: number
  session_count: number
  interaction_count: number
}

type OverviewStatistics = {
  app_id: string
  call_type: string
  stat_date: string
  system_user_count: number
  web_user_count: number
  system_user_session_count: number
  web_user_session_count: number
  system_user_token_sum: number
  web_user_token_sum: number
  system_user_interaction_count: number
  web_user_interaction_count: number
  cost_time_p50: number
  cost_time_p99: number
  web_user_avg_interaction: number
}

type dataWorkflow = {
  id: string
  name: string
  description: string
  icon: string
  icon_background: string
  workflow_id: string
  status: string
  categories: string[]
  enable_site: boolean
  enable_api: boolean
  enable_backflow: boolean
  created_at: number
  updated_at: number
  workflow_updated_at: number
  created_by: string
  mode: string
  model_config: string
  tracing: string
  tags: string[]
  created_by_account: {
    id: string
    name: string
    avatar: string
  }
}

type ChartDataPoint = {
  date: string
  value: number
}

type ChartDataType = {
  tokenData: ChartDataPoint[] // Token消耗数据
  userInteractionData: ChartDataPoint[] // 互动用户数据
  interactionData: ChartDataPoint[] // 互动数据
  avgConsumptionData: ChartDataPoint[] // 人均消耗数据
}

type TrendChartProps = {
  title: string
  value: string | number
  data?: ChartDataPoint[]
  xAxisKey?: string
  yAxisKey?: string
  hideYAxis?: boolean
  customColor?: string
}

function StatCard({ title, value, desc }: StatCardProps) {
  return (
    <Card className="col-span-1 h-40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-center mt-10">{value}</div>
        {desc && <p className="text-xs text-muted-foreground text-center">{desc}</p>}
      </CardContent>
    </Card>
  )
}

function TrendChart({
  title,
  value,
  data = defaultChartData,
  xAxisKey = 'date',
  yAxisKey = 'value',
  hideYAxis = false,
  customColor = '#2563eb',
}: TrendChartProps) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-4">{value}</div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <XAxis
                dataKey={xAxisKey}
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tickMargin={8}
              />
              <YAxis
                hide={hideYAxis}
                dataKey={yAxisKey}
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tickMargin={8}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey={yAxisKey}
                stroke={customColor}
                fill="url(#gradient)"
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={customColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={customColor} stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// 格式化数字显示
const formatNumber = (num: number): string => {
  if (num >= 1000000)
    return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000)
    return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export default function StatisticsPanel() {
  const { id } = useParams()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [date, setDate] = useState('7')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<dataWorkflow>()
  const [accumulativeStats, setAccumulativeStats] = useState<AccumulativeStatistics | null>(null)
  const [overviewStats, setOverviewStats] = useState<OverviewStatistics | null>(null)
  const [chartData, setChartData] = useState<ChartDataType>({
    tokenData: [],
    userInteractionData: [],
    interactionData: [],
    avgConsumptionData: [],
  })

  const getAppStatistics = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await post('/costaudit/app_statistics', { body: { app_id: id } }) as { data: AccumulativeStatistics }
      if (response?.data)
        setAccumulativeStats(response.data)
    }
    catch (err) {
      setError('获取累计指标数据失败')
    }
    finally {
      setIsLoading(false)
    }
  }

  const getAppStatisticsByPeriod = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await post('/costaudit/get_app_statistics_by_period', {
        body: { app_id: id, start_date: startDate, end_date: endDate },
      }) as { data: OverviewStatistics }
      if (response?.data)
        setOverviewStats(response.data)
    }
    catch (err) {
      setError('获取概览数据失败')
    }
    finally {
      setIsLoading(false)
    }
  }

  // 处理图表数据的函数
  const processChartData = (data: any[]) => {
    if (!Array.isArray(data))
      return

    // 处理所有图表数据
    const processedData = {
      tokenData: data.map(item => ({
        date: item.stat_date,
        // Token消耗 = 系统用户Token消耗 + Web用户Token消耗
        value: item.system_user_token_sum + item.web_user_token_sum,
      })),
      userInteractionData: data.map(item => ({
        date: item.stat_date,
        // 互动用户 = 系统用户数 + Web用户数
        value: item.system_user_count + item.web_user_count,
      })),
      interactionData: data.map(item => ({
        date: item.stat_date,
        // 互动数 = 系统用户互动数 + Web用户互动数
        value: item.system_user_interaction_count + item.web_user_interaction_count,
      })),
      avgConsumptionData: data.map(item => ({
        date: item.stat_date,
        // 人均消耗 = 总Token消耗 / (系统用户数 + Web用户数)
        value: (item.system_user_token_sum + item.web_user_token_sum)
          / (item.system_user_count + item.web_user_count || 1), // 防止除以0
      })),
    }

    setChartData(processedData)
  }

  // 修改获取图表数据的函数
  const getQueryAppStatistics = async () => {
    try {
      const response = await post('/costaudit/query_app_statistics', {
        body: {
          app_id: id,
          start_date: startDate,
          end_date: endDate,
        },
      }) as { data: any[] }
      processChartData(response.data)
    }
    catch (error) {
      setError('获取图表数据失败')
    }
  }

  useEffect(() => {
    setStartDate(new Date(new Date().getTime() - Number(date) * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setEndDate(new Date().toISOString().split('T')[0])
    fetchAppLogs(id as string).then((res) => {
      setData(res as dataWorkflow)
    })
    getAppStatistics()
  }, [date])

  useEffect(() => {
    if (startDate && endDate)
      getAppStatisticsByPeriod()
    getQueryAppStatistics()
  }, [startDate, endDate])

  // 计算累计用户总数（系统用户 + 临时用户）
  const totalUserCount = accumulativeStats
    ? accumulativeStats.user_count + accumulativeStats.guest_count
    : 0

  // 计算概览数据的派生指标
  const totalSessionCount = overviewStats
    ? overviewStats.system_user_session_count + overviewStats.web_user_session_count
    : 0

  const totalInteractionCount = overviewStats
    ? overviewStats.system_user_interaction_count + overviewStats.web_user_interaction_count
    : 0

  const totalTokenSum = overviewStats
    ? overviewStats.system_user_token_sum + overviewStats.web_user_token_sum
    : 0

  return (
    <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Image src={data?.icon ? data.icon.replace('app', 'static') : '/code-icon.svg'} alt="code test" width={20} height={20} />
            </div>
            <span className="text-base font-medium">{data?.name}</span>
            <Select
              value={date}
              onChange={setDate}
              style={{ width: 120 }}
              options={[
                { value: '7', label: '近7天' },
                { value: '30', label: '近30天' },
              ]}
            />
          </div>
          <Link href={`/app/${id}/workflow`} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
            返回
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <span className="text-gray-500">Loading...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <span className="text-red-500">{error}</span>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div>
            <h2 className="text-base font-medium mb-4">累计指标</h2>
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                title="累计Token消耗"
                value={accumulativeStats ? formatNumber(accumulativeStats.token_sum) : '0'}
              />
              <StatCard
                title="累计用户数"
                value={totalUserCount}
              />
              <StatCard
                title="累计会话数"
                value={accumulativeStats ? accumulativeStats.session_count : '0'}
              />
              <StatCard
                title="累计互动数"
                value={accumulativeStats ? accumulativeStats.interaction_count : '0'}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">* 累计指标不变时间间隔过长</p>
          </div>

          <div>
            <h2 className="text-base font-medium mb-4">概览</h2>
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                title="平台用户数"
                value={overviewStats ? overviewStats.system_user_count : '0'}
              />
              <StatCard
                title="临时访问数"
                value={overviewStats ? overviewStats.web_user_count : '0'}
              />
              <StatCard
                title="会话总数据"
                value={totalSessionCount}
              />
              <StatCard
                title="会话互动数"
                value={totalInteractionCount}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-medium">互动指标对比</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{overviewStats?.cost_time_p50}</span>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                    p50
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>{overviewStats?.cost_time_p99}</span>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                    p99
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TrendChart
              title="Token消耗"
              value={formatNumber(totalTokenSum)}
              data={chartData.tokenData}
              xAxisKey="date"
              yAxisKey="value"
              hideYAxis={false}
            />
            <TrendChart
              title="互动用户"
              value={formatNumber(totalUserCount)}
              data={chartData.userInteractionData}
              xAxisKey="date"
              yAxisKey="value"
              hideYAxis={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TrendChart
              title="互动数"
              value={formatNumber(totalInteractionCount)}
              data={chartData.interactionData}
              xAxisKey="date"
              yAxisKey="value"
              hideYAxis={false}
            />
            <TrendChart
              title="人均消耗"
              value={chartData.avgConsumptionData.length > 0
                ? formatNumber(chartData.avgConsumptionData[chartData.avgConsumptionData.length - 1].value)
                : '0'
              }
              data={chartData.avgConsumptionData}
              xAxisKey="date"
              yAxisKey="value"
              hideYAxis={false}
            />
          </div>
        </>
      )}
    </div>
  )
}
