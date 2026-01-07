import { Row, Col, Card, Statistic, Typography, List, Tag } from 'antd'
import {
  ProjectOutlined,
  FileTextOutlined,
  DollarOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
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
} from 'recharts'

const { Title, Text } = Typography

// Mock data - will be replaced with API calls
const invoiceData = [
  { month: 'Led', amount: 150000 },
  { month: 'Úno', amount: 180000 },
  { month: 'Bře', amount: 220000 },
  { month: 'Dub', amount: 195000 },
  { month: 'Kvě', amount: 280000 },
  { month: 'Čer', amount: 320000 },
]

const projectStatusData = [
  { name: 'Aktivní', value: 8, color: '#52c41a' },
  { name: 'Plánované', value: 4, color: '#1890ff' },
  { name: 'Pozastavené', value: 2, color: '#faad14' },
  { name: 'Dokončené', value: 12, color: '#8c8c8c' },
]

const recentProjects = [
  { id: 1, name: 'Rekonstrukce bytového domu', status: 'Aktivní', client: 'ABC s.r.o.' },
  { id: 2, name: 'Výstavba skladové haly', status: 'Aktivní', client: 'XYZ a.s.' },
  { id: 3, name: 'Oprava střechy', status: 'Plánované', client: 'Město Praha' },
  { id: 4, name: 'Instalace solárních panelů', status: 'Aktivní', client: 'DEF s.r.o.' },
  { id: 5, name: 'Zateplení fasády', status: 'Pozastavené', client: 'GHI a.s.' },
]

const recentInvoices = [
  { id: 'INV-2025-042', client: 'ABC s.r.o.', amount: 125000, status: 'Zaplaceno' },
  { id: 'INV-2025-041', client: 'XYZ a.s.', amount: 85000, status: 'Čeká na platbu' },
  { id: 'INV-2025-040', client: 'DEF s.r.o.', amount: 45000, status: 'Prošlá lhůta' },
  { id: 'INV-2025-039', client: 'GHI a.s.', amount: 220000, status: 'Zaplaceno' },
  { id: 'INV-2025-038', client: 'JKL s.r.o.', amount: 78000, status: 'Čeká na platbu' },
]

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'Aktivní': 'green',
    'Plánované': 'blue',
    'Pozastavené': 'orange',
    'Dokončené': 'default',
    'Zaplaceno': 'green',
    'Čeká na platbu': 'blue',
    'Prošlá lhůta': 'red',
  }
  return colors[status] || 'default'
}

const DashboardPage = () => {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Dashboard</Title>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Aktivní projekty"
              value={8}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Faktury (tento měsíc)"
              value={320000}
              prefix={<FileTextOutlined />}
              suffix="Kč"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Nezaplacené faktury"
              value={185000}
              prefix={<DollarOutlined />}
              suffix="Kč"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hodnota skladu"
              value={1250000}
              prefix={<InboxOutlined />}
              suffix="Kč"
            />
          </Card>
        </Col>
      </Row>

      {/* Alert Cards */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title="Prošlé faktury"
              value={3}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title="Docházející materiály"
              value={5}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Faktury po měsících">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={invoiceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} Kč`, 'Částka']}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#1890ff"
                  strokeWidth={2}
                  dot={{ fill: '#1890ff' }}
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
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Recent Lists */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Poslední projekty" extra={<a href="/projects">Zobrazit vše</a>}>
            <List
              dataSource={recentProjects}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={item.client}
                  />
                  <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Poslední faktury" extra={<a href="/invoices">Zobrazit vše</a>}>
            <List
              dataSource={recentInvoices}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.id}
                    description={item.client}
                  />
                  <div style={{ textAlign: 'right' }}>
                    <Text strong>{item.amount.toLocaleString()} Kč</Text>
                    <br />
                    <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
