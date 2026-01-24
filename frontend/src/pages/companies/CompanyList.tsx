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
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'

import { companiesApi, CompanyFilters } from '../../api/companies'
import { CompanyListItem } from '../../types'
import { formatDate } from '../../utils'

const { Title } = Typography

const statusOptions = [
  { label: 'Vše', value: '' },
  { label: 'Aktivní', value: 'true' },
  { label: 'Neaktivní', value: 'false' },
]

const CompanyList = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<CompanyFilters>({
    page: 1,
    page_size: 50,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['companies', filters],
    queryFn: () => companiesApi.getCompanies(filters),
  })

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 })
  }

  const handleFilterChange = (key: keyof CompanyFilters, value: string | boolean | undefined) => {
    if (key === 'is_active') {
      setFilters({
        ...filters,
        is_active: value === '' ? undefined : value === 'true',
        page: 1,
      })
    } else {
      setFilters({ ...filters, [key]: value, page: 1 })
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
      await companiesApi.deleteCompany(id)
      message.success('Firma byla smazána')
      refetch()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Nepodařilo se smazat firmu')
    }
  }

  const columns: ColumnsType<CompanyListItem> = [
    {
      title: 'Název',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: true,
      render: (text, record) => (
        <a onClick={() => navigate(`/companies/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'IČO',
      dataIndex: 'ico',
      key: 'ico',
      width: 120,
    },
    {
      title: 'Město',
      dataIndex: 'city',
      key: 'city',
      width: 150,
      render: (city) => city || '-',
    },
    {
      title: 'Uživatelé',
      dataIndex: 'users_count',
      key: 'users_count',
      width: 100,
      align: 'center',
    },
    {
      title: 'Stav',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Aktivní' : 'Neaktivní'}
        </Tag>
      ),
    },
    {
      title: 'Vytvořeno',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: 'Akce',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/companies/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/companies/${record.id}/edit`)}
          />
          <Popconfirm
            title="Opravdu smazat firmu?"
            description="Firma musí být prázdná (bez uživatelů, projektů, faktur)."
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
          <Title level={4} style={{ margin: 0 }}>Správa firem</Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/companies/new')}
          >
            Nová firma
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={16} md={12}>
            <Input.Search
              placeholder="Hledat podle názvu, IČO..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="Stav"
              style={{ width: '100%' }}
              options={statusOptions}
              value={filters.is_active === undefined ? '' : String(filters.is_active)}
              onChange={(value) => handleFilterChange('is_active', value)}
            />
          </Col>
        </Row>
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
            showTotal: (total) => `Celkem ${total} firem`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  )
}

export default CompanyList
