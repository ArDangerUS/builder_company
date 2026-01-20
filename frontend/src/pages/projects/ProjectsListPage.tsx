import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  DatePicker,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'

import { projectsApi, ProjectFilters } from '../../api/projects'
import { ProjectListItem, ProjectStatus } from '../../types'
import { formatCurrency, formatDate } from '../../utils'

const { Title } = Typography
const { RangePicker } = DatePicker

const statusColors: Record<ProjectStatus, string> = {
  planning: 'default',
  active: 'processing',
  suspended: 'warning',
  completed: 'success',
  cancelled: 'error',
}

const statusOptions = [
  { label: 'Vše', value: '' },
  { label: 'Plánování', value: 'planning' },
  { label: 'Aktivní', value: 'active' },
  { label: 'Pozastaveno', value: 'suspended' },
  { label: 'Dokončeno', value: 'completed' },
  { label: 'Zrušeno', value: 'cancelled' },
]

const workTypeOptions = [
  { label: 'Vše', value: '' },
  { label: 'Stavba', value: 'construction' },
  { label: 'Rekonstrukce', value: 'reconstruction' },
  { label: 'Oprava', value: 'repair' },
  { label: 'Instalace', value: 'installation' },
  { label: 'Demolice', value: 'demolition' },
  { label: 'Projektování', value: 'design' },
  { label: 'Jiné', value: 'other' },
]

const ProjectsListPage = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ProjectFilters>({
    page: 1,
    page_size: 50,
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () => projectsApi.list(filters),
  })

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 })
  }

  const handleFilterChange = (key: keyof ProjectFilters, value: string | number | undefined) => {
    setFilters({ ...filters, [key]: value, page: 1 })
  }

  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (dates) {
      setFilters({
        ...filters,
        start_date_from: dates[0]?.format('YYYY-MM-DD'),
        start_date_to: dates[1]?.format('YYYY-MM-DD'),
        page: 1,
      })
    } else {
      setFilters({
        ...filters,
        start_date_from: undefined,
        start_date_to: undefined,
        page: 1,
      })
    }
  }

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setFilters({
      ...filters,
      page: pagination.current || 1,
      page_size: pagination.pageSize || 50,
    })
  }

  const handleDelete = async (id: number) => {
    try {
      await projectsApi.delete(id)
      message.success('Projekt byl smazán')
      refetch()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Nepodařilo se smazat projekt')
    }
  }

  const columns: ColumnsType<ProjectListItem> = [
    {
      title: 'Číslo',
      dataIndex: 'number',
      key: 'number',
      width: 120,
      sorter: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/projects/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Název',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: true,
    },
    {
      title: 'Klient',
      dataIndex: 'client_name',
      key: 'client_name',
      ellipsis: true,
    },
    {
      title: 'Stav',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ProjectStatus, record) => (
        <Tag color={statusColors[status]}>{record.status_display}</Tag>
      ),
    },
    {
      title: 'Typ',
      dataIndex: 'work_type_display',
      key: 'work_type',
      width: 120,
    },
    {
      title: 'Manažer',
      dataIndex: 'manager_name',
      key: 'manager',
      width: 150,
      render: (name) => name || '-',
    },
    {
      title: 'Rozpočet',
      dataIndex: 'planned_budget',
      key: 'planned_budget',
      width: 130,
      align: 'right',
      render: (value) => formatCurrency(parseFloat(value)),
    },
    {
      title: 'Zahájení',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 110,
      render: (date) => date ? formatDate(date) : '-',
    },
    {
      title: 'Akce',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/projects/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/projects/${record.id}/edit`)}
          />
          <Popconfirm
            title="Opravdu smazat projekt?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ano"
            cancelText="Ne"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Projekty</Title>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtry
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/projects/new')}
            >
              Nový projekt
            </Button>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input.Search
            placeholder="Hledat podle čísla, názvu, klienta..."
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ maxWidth: 400 }}
          />

          {showFilters && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="Stav"
                  style={{ width: '100%' }}
                  options={statusOptions}
                  value={filters.status || ''}
                  onChange={(value) => handleFilterChange('status', value || undefined)}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="Typ prací"
                  style={{ width: '100%' }}
                  options={workTypeOptions}
                  value={filters.work_type || ''}
                  onChange={(value) => handleFilterChange('work_type', value || undefined)}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <RangePicker
                  placeholder={['Zahájení od', 'Zahájení do']}
                  style={{ width: '100%' }}
                  onChange={handleDateRangeChange}
                  format="DD.MM.YYYY"
                />
              </Col>
            </Row>
          )}
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data?.results}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: filters.page,
            pageSize: filters.page_size,
            total: data?.count,
            showSizeChanger: true,
            showTotal: (total) => `Celkem ${total} projektů`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  )
}

export default ProjectsListPage
