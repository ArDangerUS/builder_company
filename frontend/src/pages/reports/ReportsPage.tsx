import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Table,
  Tabs,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Tag,
  message,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  FileExcelOutlined,
  ProjectOutlined,
  FileTextOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { reportsApi } from '../../api/reports'
import type {
  ProjectReportItem,
  InvoiceReportItem,
  DebtReportItem,
} from '../../types'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

// Status options
const projectStatusOptions = [
  { label: 'Všechny', value: '' },
  { label: 'Plánování', value: 'planning' },
  { label: 'V realizaci', value: 'in_progress' },
  { label: 'Dokončeno', value: 'completed' },
  { label: 'Pozastaveno', value: 'on_hold' },
  { label: 'Zrušeno', value: 'cancelled' },
]

const invoiceStatusOptions = [
  { label: 'Všechny', value: '' },
  { label: 'Vystaveno', value: 'issued' },
  { label: 'Částečně uhrazeno', value: 'partially_paid' },
  { label: 'Uhrazeno', value: 'paid' },
  { label: 'Zrušeno', value: 'cancelled' },
]

// Helper to download blob
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Projects Report Tab
const ProjectsReport = () => {
  const [filters, setFilters] = useState<{
    status?: string
    date_from?: string
    date_to?: string
  }>({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects-report', filters],
    queryFn: () => reportsApi.getProjectsReport(filters),
  })

  const handleExport = async () => {
    try {
      const blob = await reportsApi.exportProjectsExcel(filters)
      downloadBlob(blob, `projekty_${dayjs().format('YYYY-MM-DD')}.xlsx`)
      message.success('Report exportován')
    } catch {
      message.error('Export selhal')
    }
  }

  const columns: ColumnsType<ProjectReportItem> = [
    { title: 'Číslo', dataIndex: 'number', key: 'number', width: 120 },
    { title: 'Název', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Klient', dataIndex: 'client_name', key: 'client_name', ellipsis: true },
    { title: 'Manažer', dataIndex: 'manager_name', key: 'manager_name' },
    {
      title: 'Stav',
      dataIndex: 'status_display',
      key: 'status',
      render: (text: string, record) => {
        const colors: Record<string, string> = {
          planning: 'blue',
          in_progress: 'green',
          completed: 'default',
          on_hold: 'orange',
          cancelled: 'red',
        }
        return <Tag color={colors[record.status]}>{text}</Tag>
      },
    },
    {
      title: 'Rozpočet',
      dataIndex: 'planned_budget',
      key: 'planned_budget',
      align: 'right',
      render: (value: number) => `${value.toLocaleString('cs-CZ')} Kč`,
    },
    {
      title: 'Náklady',
      dataIndex: 'actual_costs',
      key: 'actual_costs',
      align: 'right',
      render: (value: number) => `${value.toLocaleString('cs-CZ')} Kč`,
    },
    {
      title: 'Fakturováno',
      dataIndex: 'invoiced_amount',
      key: 'invoiced_amount',
      align: 'right',
      render: (value: number) => `${value.toLocaleString('cs-CZ')} Kč`,
    },
    {
      title: 'Zaplaceno',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      align: 'right',
      render: (value: number) => `${value.toLocaleString('cs-CZ')} Kč`,
    },
    {
      title: 'Pohledávka',
      dataIndex: 'outstanding',
      key: 'outstanding',
      align: 'right',
      render: (value: number) => (
        <Text type={value > 0 ? 'danger' : undefined}>
          {value.toLocaleString('cs-CZ')} Kč
        </Text>
      ),
    },
  ]

  return (
    <div>
      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="Stav">
            <Select
              style={{ width: 150 }}
              options={projectStatusOptions}
              value={filters.status || ''}
              onChange={(value) => setFilters({ ...filters, status: value || undefined })}
            />
          </Form.Item>
          <Form.Item label="Datum vytvoření">
            <RangePicker
              onChange={(dates) => {
                if (dates) {
                  setFilters({
                    ...filters,
                    date_from: dates[0]?.format('YYYY-MM-DD'),
                    date_to: dates[1]?.format('YYYY-MM-DD'),
                  })
                } else {
                  setFilters({ ...filters, date_from: undefined, date_to: undefined })
                }
              }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={() => refetch()}>
                Filtrovat
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExport}
              >
                Export Excel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Totals */}
      {data && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Rozpočet" value={data.totals.planned_budget} suffix="Kč" />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Náklady" value={data.totals.actual_costs} suffix="Kč" />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Fakturováno" value={data.totals.invoiced_amount} suffix="Kč" />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Zaplaceno" value={data.totals.paid_amount} suffix="Kč" />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Pohledávka"
                value={data.totals.outstanding}
                suffix="Kč"
                valueStyle={{ color: data.totals.outstanding > 0 ? '#ff4d4f' : undefined }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Počet projektů" value={data.count} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data?.data}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
        size="small"
      />
    </div>
  )
}

// Invoices Report Tab
const InvoicesReport = () => {
  const [filters, setFilters] = useState<{
    status?: string
    date_from?: string
    date_to?: string
  }>({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoices-report', filters],
    queryFn: () => reportsApi.getInvoicesReport(filters),
  })

  const handleExport = async () => {
    try {
      const blob = await reportsApi.exportInvoicesExcel(filters)
      downloadBlob(blob, `faktury_${dayjs().format('YYYY-MM-DD')}.xlsx`)
      message.success('Report exportován')
    } catch {
      message.error('Export selhal')
    }
  }

  const columns: ColumnsType<InvoiceReportItem> = [
    { title: 'Číslo', dataIndex: 'number', key: 'number', width: 130 },
    { title: 'Datum', dataIndex: 'issue_date', key: 'issue_date', width: 100 },
    { title: 'Projekt', dataIndex: 'project_number', key: 'project_number', width: 130 },
    { title: 'Klient', dataIndex: 'client_name', key: 'client_name', ellipsis: true },
    {
      title: 'Částka',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (value: number) => `${value.toLocaleString('cs-CZ')} Kč`,
    },
    {
      title: 'Zaplaceno',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      align: 'right',
      render: (value: number) => `${value.toLocaleString('cs-CZ')} Kč`,
    },
    {
      title: 'K úhradě',
      dataIndex: 'amount_due',
      key: 'amount_due',
      align: 'right',
      render: (value: number, record) => (
        <Text type={record.is_overdue ? 'danger' : undefined}>
          {value.toLocaleString('cs-CZ')} Kč
        </Text>
      ),
    },
    { title: 'Splatnost', dataIndex: 'due_date', key: 'due_date', width: 100 },
    {
      title: 'Stav',
      dataIndex: 'status_display',
      key: 'status',
      render: (text: string, record) => {
        const colors: Record<string, string> = {
          issued: 'blue',
          partially_paid: 'orange',
          paid: 'green',
          cancelled: 'default',
        }
        return <Tag color={record.is_overdue ? 'red' : colors[record.status]}>{text}</Tag>
      },
    },
    {
      title: 'Dnů po splatnosti',
      dataIndex: 'days_overdue',
      key: 'days_overdue',
      align: 'right',
      render: (value: number) =>
        value > 0 ? <Tag color="red">{value}</Tag> : '-',
    },
  ]

  return (
    <div>
      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="Stav">
            <Select
              style={{ width: 180 }}
              options={invoiceStatusOptions}
              value={filters.status || ''}
              onChange={(value) => setFilters({ ...filters, status: value || undefined })}
            />
          </Form.Item>
          <Form.Item label="Datum vystavení">
            <RangePicker
              onChange={(dates) => {
                if (dates) {
                  setFilters({
                    ...filters,
                    date_from: dates[0]?.format('YYYY-MM-DD'),
                    date_to: dates[1]?.format('YYYY-MM-DD'),
                  })
                } else {
                  setFilters({ ...filters, date_from: undefined, date_to: undefined })
                }
              }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={() => refetch()}>
                Filtrovat
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExport}
              >
                Export Excel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Totals */}
      {data && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Celková částka" value={data.totals.total_amount} suffix="Kč" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Zaplaceno" value={data.totals.paid_amount} suffix="Kč" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="K úhradě"
                value={data.totals.amount_due}
                suffix="Kč"
                valueStyle={{ color: data.totals.amount_due > 0 ? '#ff4d4f' : undefined }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Počet faktur" value={data.count} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data?.data}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1100 }}
        size="small"
        rowClassName={(record) => (record.is_overdue ? 'row-overdue' : '')}
      />
      <style>{`
        .row-overdue {
          background-color: #fff2f0;
        }
      `}</style>
    </div>
  )
}

// Debt Report Tab
const DebtReport = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['debt-report'],
    queryFn: reportsApi.getDebtReport,
  })

  const handleExport = async () => {
    try {
      const blob = await reportsApi.exportDebtExcel()
      downloadBlob(blob, `pohledavky_${dayjs().format('YYYY-MM-DD')}.xlsx`)
      message.success('Report exportován')
    } catch {
      message.error('Export selhal')
    }
  }

  const columns: ColumnsType<DebtReportItem> = [
    { title: 'Klient', dataIndex: 'client_name', key: 'client_name' },
    { title: 'IČO', dataIndex: 'client_ico', key: 'client_ico', width: 100 },
    {
      title: 'Počet faktur',
      dataIndex: 'unpaid_count',
      key: 'unpaid_count',
      align: 'center',
      width: 120,
    },
    {
      title: 'Celkový dluh',
      dataIndex: 'total_debt',
      key: 'total_debt',
      align: 'right',
      render: (value: number) => (
        <Text strong type="danger">
          {value.toLocaleString('cs-CZ')} Kč
        </Text>
      ),
    },
    {
      title: 'Nejstarší faktura',
      dataIndex: 'oldest_invoice_number',
      key: 'oldest_invoice_number',
    },
    {
      title: 'Max. dnů po splatnosti',
      dataIndex: 'max_days_overdue',
      key: 'max_days_overdue',
      align: 'center',
      render: (value: number) =>
        value > 0 ? <Tag color="red">{value} dnů</Tag> : '-',
    },
  ]

  const expandedRowRender = (record: DebtReportItem) => {
    const invoiceColumns = [
      { title: 'Číslo faktury', dataIndex: 'number', key: 'number' },
      {
        title: 'K úhradě',
        dataIndex: 'amount_due',
        key: 'amount_due',
        render: (value: number) => `${value.toLocaleString('cs-CZ')} Kč`,
      },
      { title: 'Splatnost', dataIndex: 'due_date', key: 'due_date' },
    ]
    return (
      <Table
        columns={invoiceColumns}
        dataSource={record.invoices}
        rowKey="id"
        pagination={false}
        size="small"
      />
    )
  }

  return (
    <div>
      {/* Export button */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExport}
          >
            Export Excel
          </Button>
        </Space>
      </Card>

      {/* Totals */}
      {data && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic title="Počet klientů s dluhem" value={data.count} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="Počet nezaplacených faktur" value={data.totals.unpaid_count} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="Celkový dluh"
                value={data.totals.total_debt}
                suffix="Kč"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data?.data}
        rowKey="client_name"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        expandable={{ expandedRowRender }}
        size="small"
      />
    </div>
  )
}

// Main Reports Page
export default function ReportsPage() {
  const items = [
    {
      key: 'projects',
      label: (
        <span>
          <ProjectOutlined /> Projekty
        </span>
      ),
      children: <ProjectsReport />,
    },
    {
      key: 'invoices',
      label: (
        <span>
          <FileTextOutlined /> Faktury
        </span>
      ),
      children: <InvoicesReport />,
    },
    {
      key: 'debt',
      label: (
        <span>
          <DollarOutlined /> Pohledávky
        </span>
      ),
      children: <DebtReport />,
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Reporty</Title>
      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  )
}
