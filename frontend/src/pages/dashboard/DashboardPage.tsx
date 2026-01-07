import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Statistic, Typography, List, Tag, Spin, Alert, Table } from 'antd'
import {
  ProjectOutlined,
  FileTextOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

import { reportsApi } from '../../api/reports'
import type { RecentProject, RecentInvoice } from '../../types'

const { Title, Text } = Typography

const statusColors: Record<string, string> = {
  planning: '#1890ff',
  in_progress: '#52c41a',
  completed: '#8c8c8c',
  on_hold: '#faad14',
  cancelled: '#ff4d4f',
}

const invoiceStatusColors: Record<string, string> = {
  draft: 'default',
  issued: 'blue',
  partially_paid: 'orange',
  paid: 'green',
  overdue: 'red',
  cancelled: 'default',
}

const DashboardPage = () => {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportsApi.getDashboard,
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert
        type="error"
        message="Chyba"
        description="Nepodařilo se načíst data dashboardu"
      />
    )
  }

  // Prepare chart data
  const pieData = data.charts.projects_by_status.map((item) => ({
    name: item.status_display,
    value: item.count,
    color: statusColors[item.status] || '#8c8c8c',
  }))

  const barData = data.charts.top_projects.map((item) => ({
    name: item.number,
    fullName: item.name,
    budget: item.planned_budget,
    spent: item.actual_costs,
  }))

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Dashboard</Title>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/projects')}>
            <Statistic
              title="Aktivní projekty"
              value={data.stats.active_projects}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/invoices')}>
            <Statistic
              title="Fakturováno (tento měsíc)"
              value={data.stats.invoiced_this_month}
              prefix={<FileTextOutlined />}
              suffix="Kč"
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => Number(value).toLocaleString('cs-CZ')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/invoices')}>
            <Statistic
              title="Zaplaceno (tento měsíc)"
              value={data.stats.paid_this_month}
              prefix={<DollarOutlined />}
              suffix="Kč"
              valueStyle={{ color: '#722ed1' }}
              formatter={(value) => Number(value).toLocaleString('cs-CZ')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/reports')}>
            <Statistic
              title="Celková pohledávka"
              value={data.stats.total_outstanding}
              prefix={<WarningOutlined />}
              suffix="Kč"
              valueStyle={{ color: data.stats.total_outstanding > 0 ? '#faad14' : '#52c41a' }}
              formatter={(value) => Number(value).toLocaleString('cs-CZ')}
            />
          </Card>
        </Col>
      </Row>

      {/* Alert Card */}
      {data.stats.overdue_count > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              style={{ borderColor: '#ff4d4f', backgroundColor: '#fff2f0' }}
              hoverable
              onClick={() => navigate('/invoices?overdue=true')}
            >
              <Statistic
                title="Prošlé faktury"
                value={data.stats.overdue_count}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Faktury po měsících (posledních 12 měsíců)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.charts.invoices_by_month}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_name" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString('cs-CZ')} Kč`,
                    name === 'issued' ? 'Fakturováno' : 'Zaplaceno',
                  ]}
                />
                <Legend
                  formatter={(value) => (value === 'issued' ? 'Fakturováno' : 'Zaplaceno')}
                />
                <Line
                  type="monotone"
                  dataKey="issued"
                  stroke="#1890ff"
                  strokeWidth={2}
                  dot={{ fill: '#1890ff' }}
                />
                <Line
                  type="monotone"
                  dataKey="paid"
                  stroke="#52c41a"
                  strokeWidth={2}
                  dot={{ fill: '#52c41a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Projekty podle stavu">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top Projects Chart */}
      {barData.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="Top 5 projektů podle rozpočtu">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString('cs-CZ')} Kč`,
                      name === 'budget' ? 'Rozpočet' : 'Náklady',
                    ]}
                    labelFormatter={(label) => barData.find((d) => d.name === label)?.fullName}
                  />
                  <Legend formatter={(value) => (value === 'budget' ? 'Rozpočet' : 'Náklady')} />
                  <Bar dataKey="budget" fill="#1890ff" name="budget" />
                  <Bar dataKey="spent" fill="#52c41a" name="spent" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}

      {/* Recent Lists */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title="Poslední projekty"
            extra={<a onClick={() => navigate('/projects')}>Zobrazit vše</a>}
          >
            <List
              dataSource={data.recent.projects}
              renderItem={(item: RecentProject) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/projects/${item.id}`)}
                >
                  <List.Item.Meta
                    title={<Text strong>{item.number}</Text>}
                    description={`${item.name} - ${item.client_name}`}
                  />
                  <Tag color={statusColors[item.status] ? undefined : 'default'}
                    style={{ backgroundColor: statusColors[item.status], color: '#fff', borderColor: statusColors[item.status] }}>
                    {item.status_display}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Poslední faktury"
            extra={<a onClick={() => navigate('/invoices')}>Zobrazit vše</a>}
          >
            <List
              dataSource={data.recent.invoices}
              renderItem={(item: RecentInvoice) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/invoices/${item.id}`)}
                >
                  <List.Item.Meta
                    title={<Text strong>{item.number}</Text>}
                    description={item.client_name}
                  />
                  <div style={{ textAlign: 'right' }}>
                    <Text strong>{item.total_amount.toLocaleString('cs-CZ')} Kč</Text>
                    <br />
                    <Tag color={invoiceStatusColors[item.status]}>{item.status_display}</Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Overdue Invoices */}
      {data.recent.overdue_invoices.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title={
                <span style={{ color: '#ff4d4f' }}>
                  <ExclamationCircleOutlined /> Prošlé faktury
                </span>
              }
              extra={<a onClick={() => navigate('/invoices?overdue=true')}>Zobrazit vše</a>}
            >
              <Table
                dataSource={data.recent.overdue_invoices}
                rowKey="id"
                pagination={false}
                size="small"
                onRow={(record) => ({
                  onClick: () => navigate(`/invoices/${record.id}`),
                  style: { cursor: 'pointer' },
                })}
                columns={[
                  {
                    title: 'Číslo',
                    dataIndex: 'number',
                    key: 'number',
                  },
                  {
                    title: 'Klient',
                    dataIndex: 'client_name',
                    key: 'client_name',
                  },
                  {
                    title: 'K úhradě',
                    dataIndex: 'amount_due',
                    key: 'amount_due',
                    render: (value: number) => (
                      <Text strong style={{ color: '#ff4d4f' }}>
                        {value.toLocaleString('cs-CZ')} Kč
                      </Text>
                    ),
                  },
                  {
                    title: 'Splatnost',
                    dataIndex: 'due_date',
                    key: 'due_date',
                  },
                  {
                    title: 'Dnů po splatnosti',
                    dataIndex: 'days_overdue',
                    key: 'days_overdue',
                    render: (value: number) => (
                      <Tag color="red">{value} dnů</Tag>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}

export default DashboardPage
