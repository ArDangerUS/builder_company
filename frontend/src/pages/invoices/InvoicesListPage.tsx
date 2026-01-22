import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  Card,
  Row,
  Col,
  Typography,
  Popconfirm,
  message,
  Breadcrumb,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EyeOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'

import { invoicesApi } from '../../api/invoices'
import type { InvoiceListItem, InvoiceStatus } from '../../types'
import { useAuthStore } from '../../store/authStore'

const { Title } = Typography
const { RangePicker } = DatePicker

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'default',
  issued: 'blue',
  partially_paid: 'orange',
  paid: 'green',
  overdue: 'red',
  cancelled: 'default',
}

const statusOptions = [
  { label: 'Všechny', value: '' },
  { label: 'Koncept', value: 'draft' },
  { label: 'Vystaveno', value: 'issued' },
  { label: 'Částečně uhrazeno', value: 'partially_paid' },
  { label: 'Uhrazeno', value: 'paid' },
  { label: 'Po splatnosti', value: 'overdue' },
  { label: 'Zrušeno', value: 'cancelled' },
]

export default function InvoicesListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'superadmin'

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // Fetch invoices
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, pageSize, search, status, overdueOnly, dateRange],
    queryFn: () =>
      invoicesApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        status: status || undefined,
        overdue: overdueOnly || undefined,
        issue_date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
        issue_date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
      }),
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => invoicesApi.getStats(),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: invoicesApi.delete,
    onSuccess: () => {
      message.success('Faktura byla smazána')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] })
    },
    onError: () => {
      message.error('Nepodařilo se smazat fakturu')
    },
  })

  const columns: ColumnsType<InvoiceListItem> = [
    {
      title: 'Číslo',
      dataIndex: 'number',
      key: 'number',
      width: 130,
      render: (text, record) => (
        <Button type="link" onClick={() => navigate(`/invoices/${record.id}`)}>
          {text}
        </Button>
      ),
    },
    // Company column - only for SuperAdmin
    ...(isSuperAdmin ? [{
      title: 'Firma',
      dataIndex: 'company_name',
      key: 'company',
      width: 150,
      ellipsis: true,
      render: (name: string) => name || '-',
    }] : []),
    {
      title: 'Klient',
      dataIndex: 'client_name',
      key: 'client_name',
      ellipsis: true,
    },
    {
      title: 'Projekt',
      dataIndex: 'project_number',
      key: 'project',
      width: 130,
      render: (text, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/projects/${record.project}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Stav',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tag color={statusColors[record.status]}>{record.status_display}</Tag>
          {record.is_overdue && <WarningOutlined style={{ color: '#ff4d4f' }} />}
        </Space>
      ),
    },
    {
      title: 'Vystaveno',
      dataIndex: 'issue_date',
      key: 'issue_date',
      width: 110,
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Splatnost',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 110,
      render: (date, record) => (
        <span style={{ color: record.is_overdue ? '#ff4d4f' : undefined }}>
          {dayjs(date).format('DD.MM.YYYY')}
        </span>
      ),
    },
    {
      title: 'Celkem',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right',
      render: (amount) =>
        new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(
          parseFloat(amount)
        ),
    },
    {
      title: 'K úhradě',
      dataIndex: 'amount_due',
      key: 'amount_due',
      width: 120,
      align: 'right',
      render: (amount) =>
        new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(
          parseFloat(amount)
        ),
    },
    {
      title: 'Akce',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/invoices/${record.id}`)}
          />
          {record.status === 'draft' && (
            <Popconfirm
              title="Smazat fakturu?"
              description="Tato akce je nevratná."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Smazat"
              cancelText="Zrušit"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current || 1)
    setPageSize(pagination.pageSize || 20)
  }

  return (
    <div>
      <Breadcrumb
        items={[{ title: 'Domů', href: '/' }, { title: 'Faktury' }]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <FileTextOutlined /> Faktury
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
          Nová faktura
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Celkem faktur" value={stats.total_count} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Po splatnosti"
                value={stats.overdue_count}
                valueStyle={{ color: stats.overdue_count > 0 ? '#ff4d4f' : undefined }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card size="small">
              <Statistic
                title="Fakturováno"
                value={parseFloat(stats.total_invoiced)}
                precision={0}
                suffix="Kč"
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card size="small">
              <Statistic
                title="Uhrazeno"
                value={parseFloat(stats.total_paid)}
                precision={0}
                suffix="Kč"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="K úhradě"
                value={parseFloat(stats.total_outstanding)}
                precision={0}
                suffix="Kč"
                valueStyle={{ color: parseFloat(stats.total_outstanding) > 0 ? '#cf1322' : undefined }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder="Hledat (číslo, klient, IČO...)"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Stav"
              value={status}
              onChange={setStatus}
              options={statusOptions}
            />
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['Datum od', 'Datum do']}
              format="DD.MM.YYYY"
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
            />
          </Col>
          <Col span={4}>
            <Button
              type={overdueOnly ? 'primary' : 'default'}
              danger={overdueOnly}
              icon={<WarningOutlined />}
              onClick={() => setOverdueOnly(!overdueOnly)}
            >
              Po splatnosti
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data?.results}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: data?.count,
          showSizeChanger: true,
          showTotal: (total) => `Celkem ${total} faktur`,
        }}
        onChange={handleTableChange}
      />
    </div>
  )
}
