import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  Card,
  Row,
  Col,
  Select,
  Statistic,
  Typography,
  DatePicker,
  Space,
  Tag,
  Tabs,
} from 'antd'
import { WarningOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { warehouseApi } from '../../api/warehouse'
import { MaterialListItem, StockMovement, CategoryListItem } from '../../types'
import { formatCurrency, formatNumber } from '../../utils/formatters'

const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const StockReportPage = () => {
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>()
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => warehouseApi.getCategories({ is_active: true }),
  })

  const { data: stockReport, isLoading: isLoadingStock } = useQuery({
    queryKey: ['stockReport', { category: categoryFilter, low_stock: lowStockOnly }],
    queryFn: () => warehouseApi.getStockReport({
      category: categoryFilter,
      low_stock: lowStockOnly || undefined,
    }),
  })

  const { data: movementsReport, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['movementsReport', { dateRange }],
    queryFn: () => warehouseApi.getMovementsReport({
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
  })

  const stockColumns: ColumnsType<MaterialListItem> = [
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
      title: 'Aktualni zasoba',
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
  ]

  const movementsColumns: ColumnsType<StockMovement> = [
    {
      title: 'Datum',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Typ',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (_type: string, record) => (
        <Tag color={record.direction === '+' ? 'green' : 'red'}>
          {record.direction === '+' ? (
            <><ArrowUpOutlined /> Prijem</>
          ) : (
            <><ArrowDownOutlined /> Vydej</>
          )}
        </Tag>
      ),
    },
    {
      title: 'Doklad',
      dataIndex: 'document_number',
      key: 'document_number',
    },
    {
      title: 'Material',
      key: 'material',
      render: (_, record) => `${record.material_sku} - ${record.material_name}`,
    },
    {
      title: 'Mnozstvi',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      render: (qty: string) => formatNumber(parseFloat(qty)),
    },
    {
      title: 'Cena/j.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right',
      render: (price: string) => formatCurrency(parseFloat(price)),
    },
    {
      title: 'Celkem',
      dataIndex: 'total_price',
      key: 'total_price',
      align: 'right',
      render: (total: string) => formatCurrency(parseFloat(total)),
    },
    {
      title: 'Dodavatel/Projekt',
      key: 'target',
      render: (_, record) => record.supplier || record.project || '-',
    },
  ]

  const tabItems = [
    {
      key: 'stock',
      label: 'Stav zasob',
      children: (
        <>
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

          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Select
                  placeholder="Kategorie"
                  style={{ width: '100%' }}
                  allowClear
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                >
                  {categories?.map((cat: CategoryListItem) => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={8}>
                <Select
                  placeholder="Filtr"
                  style={{ width: '100%' }}
                  value={lowStockOnly ? 'low' : 'all'}
                  onChange={(value) => setLowStockOnly(value === 'low')}
                >
                  <Option value="all">Vsechny materialy</Option>
                  <Option value="low">Pouze nizke zasoby</Option>
                </Select>
              </Col>
            </Row>
          </Card>

          <Card>
            <Table
              columns={stockColumns}
              dataSource={stockReport?.materials}
              rowKey="id"
              loading={isLoadingStock}
              pagination={false}
            />
          </Card>
        </>
      ),
    },
    {
      key: 'movements',
      label: 'Pohyby',
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Celkem pohybu"
                  value={movementsReport?.summary.total_movements || 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Prijmy"
                  value={movementsReport?.summary.total_receipts || 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Hodnota prijmu"
                  value={movementsReport?.summary.total_value_in || 0}
                  precision={2}
                  suffix="Kc"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic
                  title="Hodnota vydeje"
                  value={movementsReport?.summary.total_value_out || 0}
                  precision={2}
                  suffix="Kc"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <RangePicker
                  style={{ width: '100%' }}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                  format="DD.MM.YYYY"
                />
              </Col>
            </Row>
          </Card>

          <Card>
            <Table
              columns={movementsColumns}
              dataSource={movementsReport?.movements}
              rowKey={(record) => `${record.document_number}-${record.material_sku}`}
              loading={isLoadingMovements}
              pagination={false}
            />
          </Card>
        </>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Skladove reporty</Title>
        </Col>
      </Row>

      <Tabs items={tabItems} />
    </div>
  )
}

export default StockReportPage
