import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Popconfirm,
  message,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  WarningOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { warehouseApi } from '../../api/warehouse'
import { MaterialListItem, CategoryListItem } from '../../types'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatNumber } from '../../utils/formatters'

const { Title } = Typography
const { Option } = Select

const MaterialsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canEdit = user?.role === 'admin' || user?.role === 'warehouse'

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>()
  const [lowStockFilter, setLowStockFilter] = useState(false)
  const [page, setPage] = useState(1)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => warehouseApi.getCategories({ is_active: true }),
  })

  const { data: materialsData, isLoading, refetch } = useQuery({
    queryKey: ['materials', { search, category: categoryFilter, low_stock: lowStockFilter, page }],
    queryFn: () => warehouseApi.getMaterials({
      search: search || undefined,
      category: categoryFilter,
      low_stock: lowStockFilter || undefined,
      page,
    }),
  })

  const { data: stockReport } = useQuery({
    queryKey: ['stockReport'],
    queryFn: () => warehouseApi.getStockReport(),
  })

  const deleteMutation = useMutation({
    mutationFn: warehouseApi.deleteMaterial,
    onSuccess: () => {
      message.success('Material byl smazan')
      queryClient.invalidateQueries({ queryKey: ['materials'] })
    },
    onError: () => {
      message.error('Material nelze smazat')
    },
  })

  const columns: ColumnsType<MaterialListItem> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
    },
    {
      title: 'Nazev',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          {name}
          {record.is_low_stock && (
            <Tag color="warning" icon={<WarningOutlined />}>
              Nizke zasoby
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Kategorie',
      dataIndex: 'category_name',
      key: 'category_name',
    },
    {
      title: 'Jednotka',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Cena',
      dataIndex: 'purchase_price',
      key: 'purchase_price',
      align: 'right',
      render: (price: string) => formatCurrency(parseFloat(price)),
    },
    {
      title: 'Zasoba',
      dataIndex: 'current_stock',
      key: 'current_stock',
      align: 'right',
      render: (stock: string, record) => (
        <span style={{ color: record.is_low_stock ? '#faad14' : undefined }}>
          {formatNumber(parseFloat(stock))} {record.unit}
        </span>
      ),
    },
    {
      title: 'Min. zasoba',
      dataIndex: 'min_stock',
      key: 'min_stock',
      align: 'right',
      render: (stock: string, record) => `${formatNumber(parseFloat(stock))} ${record.unit}`,
    },
    {
      title: 'Hodnota',
      dataIndex: 'stock_value',
      key: 'stock_value',
      align: 'right',
      render: (value: string) => formatCurrency(parseFloat(value)),
    },
    {
      title: 'Akce',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/warehouse/materials/${record.id}/edit`)}
            disabled={!canEdit}
          />
          <Popconfirm
            title="Opravdu smazat material?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Ano"
            cancelText="Ne"
            disabled={!canEdit}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={!canEdit}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Materialy</Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Obnovit
            </Button>
            {canEdit && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/warehouse/materials/new')}
              >
                Novy material
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Celkem materialu"
              value={stockReport?.summary.total_materials || 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Celkova hodnota"
              value={stockReport?.summary.total_value || 0}
              precision={2}
              suffix="Kc"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Nizke zasoby"
              value={stockReport?.summary.low_stock_count || 0}
              valueStyle={{ color: stockReport?.summary.low_stock_count ? '#faad14' : undefined }}
              prefix={stockReport?.summary.low_stock_count ? <WarningOutlined /> : undefined}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Hledat podle nazvu nebo SKU..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="Kategorie"
              style={{ width: '100%' }}
              allowClear
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value)
                setPage(1)
              }}
            >
              {categories?.map((cat: CategoryListItem) => (
                <Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Space>
              <Switch
                checked={lowStockFilter}
                onChange={(checked) => {
                  setLowStockFilter(checked)
                  setPage(1)
                }}
              />
              <span>Pouze nizke zasoby</span>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={materialsData?.results}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: materialsData?.count,
            pageSize: materialsData?.page_size || 50,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `Celkem ${total} materialu`,
          }}
        />
      </Card>
    </div>
  )
}

export default MaterialsPage
