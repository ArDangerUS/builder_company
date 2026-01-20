import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Divider,
  Spin,
  message,
  Breadcrumb,
  Table,
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { invoicesApi } from '../../api/invoices'
import type { InvoiceCreateData, InvoiceItemUnit, ProjectForInvoice } from '../../types'

const { Title } = Typography
const { TextArea } = Input

const invoiceTypeOptions = [
  { label: 'Faktura vydaná', value: 'vydana' },
  { label: 'Faktura přijatá', value: 'prijata' },
  { label: 'Zálohová faktura', value: 'zalohova' },
  { label: 'Dobropis', value: 'dobropis' },
]

const unitOptions = [
  { label: 'ks', value: 'ks' },
  { label: 'hod', value: 'hod' },
  { label: 'm', value: 'm' },
  { label: 'm²', value: 'm2' },
  { label: 'm³', value: 'm3' },
  { label: 'kg', value: 'kg' },
  { label: 't', value: 't' },
  { label: 'km', value: 'km' },
  { label: 'den', value: 'den' },
  { label: 'komplet', value: 'komplet' },
]

interface FormItem {
  key: string
  id?: number
  name: string
  description: string
  quantity: number
  unit: InvoiceItemUnit
  unit_price: number
  total_price: number
}

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const isEditing = !!id

  const [items, setItems] = useState<FormItem[]>([])
  const [projects, setProjects] = useState<ProjectForInvoice[]>([])

  // Fetch invoice for editing
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(parseInt(id!)),
    enabled: isEditing,
  })

  // Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects-for-invoice'],
    queryFn: () => invoicesApi.getProjects(),
  })

  // Update projects when data is fetched
  useEffect(() => {
    if (projectsData) {
      setProjects(projectsData)
    }
  }, [projectsData])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: (data) => {
      message.success('Faktura byla vytvořena')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate(`/invoices/${data.id}`)
    },
    onError: () => {
      message.error('Nepodařilo se vytvořit fakturu')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InvoiceCreateData> }) =>
      invoicesApi.update(id, data),
    onSuccess: (data) => {
      message.success('Faktura byla aktualizována')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      navigate(`/invoices/${data.id}`)
    },
    onError: () => {
      message.error('Nepodařilo se aktualizovat fakturu')
    },
  })

  // Initialize form with existing data
  useEffect(() => {
    if (invoice) {
      form.setFieldsValue({
        project: invoice.project,
        invoice_type: invoice.invoice_type,
        issue_date: dayjs(invoice.issue_date),
        due_date: dayjs(invoice.due_date),
        taxable_date: invoice.taxable_date ? dayjs(invoice.taxable_date) : null,
        client_name: invoice.client_name,
        client_ico: invoice.client_ico,
        client_dic: invoice.client_dic,
        client_address: invoice.client_address,
        notes: invoice.notes,
        internal_notes: invoice.internal_notes,
        bank_account: invoice.bank_account,
        variable_symbol: invoice.variable_symbol,
      })

      // Set items
      setItems(
        invoice.items.map((item, idx) => ({
          key: `item-${item.id || idx}`,
          id: item.id,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price || item.quantity * item.unit_price,
        }))
      )
    }
  }, [invoice, form])

  const handleProjectChange = (projectId: number) => {
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      form.setFieldsValue({
        client_name: project.client_name,
        client_ico: project.client_ico,
        client_dic: project.client_dic,
        client_address: project.client_address,
      })
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        key: `item-${Date.now()}`,
        name: '',
        description: '',
        quantity: 1,
        unit: 'ks',
        unit_price: 0,
        total_price: 0,
      },
    ])
  }

  const removeItem = (key: string) => {
    setItems(items.filter((item) => item.key !== key))
  }

  const updateItem = (key: string, field: keyof FormItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.key === key) {
          const updated = { ...item, [field]: value }
          if (field === 'quantity' || field === 'unit_price') {
            updated.total_price = updated.quantity * updated.unit_price
          }
          return updated
        }
        return item
      })
    )
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0)

  const handleSubmit = async (values: Record<string, unknown>) => {
    const data: InvoiceCreateData = {
      project: values.project as number,
      invoice_type: values.invoice_type as InvoiceCreateData['invoice_type'],
      issue_date: (values.issue_date as dayjs.Dayjs)?.format('YYYY-MM-DD'),
      due_date: (values.due_date as dayjs.Dayjs).format('YYYY-MM-DD'),
      taxable_date: (values.taxable_date as dayjs.Dayjs)?.format('YYYY-MM-DD') || undefined,
      client_name: values.client_name as string,
      client_ico: values.client_ico as string,
      client_dic: values.client_dic as string,
      client_address: values.client_address as string,
      notes: values.notes as string,
      internal_notes: values.internal_notes as string,
      bank_account: values.bank_account as string,
      variable_symbol: values.variable_symbol as string,
      items: items.map((item, idx) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        order: idx,
      })),
    }

    if (isEditing) {
      updateMutation.mutate({ id: parseInt(id!), data })
    } else {
      createMutation.mutate(data)
    }
  }

  const itemColumns: ColumnsType<FormItem> = [
    {
      title: 'Název',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      render: (_, record) => (
        <Input
          value={record.name}
          onChange={(e) => updateItem(record.key, 'name', e.target.value)}
          placeholder="Název položky"
        />
      ),
    },
    {
      title: 'Popis',
      dataIndex: 'description',
      key: 'description',
      width: '20%',
      render: (_, record) => (
        <Input
          value={record.description}
          onChange={(e) => updateItem(record.key, 'description', e.target.value)}
          placeholder="Popis"
        />
      ),
    },
    {
      title: 'Množství',
      dataIndex: 'quantity',
      key: 'quantity',
      width: '12%',
      render: (_, record) => (
        <InputNumber
          value={record.quantity}
          onChange={(v) => updateItem(record.key, 'quantity', v || 0)}
          min={0.001}
          step={1}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Jednotka',
      dataIndex: 'unit',
      key: 'unit',
      width: '10%',
      render: (_, record) => (
        <Select
          value={record.unit}
          onChange={(v) => updateItem(record.key, 'unit', v)}
          options={unitOptions}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Cena/jedn.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: '13%',
      render: (_, record) => (
        <InputNumber
          value={record.unit_price}
          onChange={(v) => updateItem(record.key, 'unit_price', v || 0)}
          min={0}
          style={{ width: '100%' }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
          parser={(value) => Number(value?.replace(/\s/g, '') || 0)}
        />
      ),
    },
    {
      title: 'Celkem',
      dataIndex: 'total_price',
      key: 'total_price',
      width: '12%',
      align: 'right',
      render: (_, record) =>
        new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(
          record.total_price
        ),
    },
    {
      title: '',
      key: 'actions',
      width: '8%',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ]

  if (isEditing && invoiceLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Domů', href: '/' },
          { title: 'Faktury', href: '/invoices' },
          { title: isEditing ? `Upravit ${invoice?.number}` : 'Nová faktura' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          {isEditing ? `Upravit fakturu ${invoice?.number}` : 'Nová faktura'}
        </Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>
          Zpět
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          invoice_type: 'vydana',
          issue_date: dayjs(),
          due_date: dayjs().add(14, 'day'),
        }}
      >
        <Row gutter={24}>
          <Col span={16}>
            <Card title="Základní údaje" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="project"
                    label="Projekt"
                    rules={[{ required: true, message: 'Vyberte projekt' }]}
                  >
                    <Select
                      placeholder="Vyberte projekt"
                      onChange={handleProjectChange}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={projects.map((p) => ({
                        label: `${p.number} - ${p.name}`,
                        value: p.id,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="invoice_type"
                    label="Typ faktury"
                    rules={[{ required: true, message: 'Vyberte typ faktury' }]}
                  >
                    <Select
                      options={invoiceTypeOptions}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>Klient</Divider>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="client_name"
                    label="Název klienta"
                    rules={[{ required: true, message: 'Zadejte název klienta' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="client_ico" label="IČO">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="client_dic" label="DIČ">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="client_address" label="Adresa">
                    <TextArea rows={2} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Položky faktury" style={{ marginBottom: 24 }}>
              <Table
                columns={itemColumns}
                dataSource={items}
                rowKey="key"
                pagination={false}
                size="small"
                footer={() => (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>
                      Přidat položku
                    </Button>
                    <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                      Celkem:{' '}
                      {new Intl.NumberFormat('cs-CZ', {
                        style: 'currency',
                        currency: 'CZK',
                      }).format(totalAmount)}
                    </div>
                  </div>
                )}
              />
            </Card>

            <Card title="Poznámky">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="notes" label="Poznámky (zobrazí se na faktuře)">
                    <TextArea rows={3} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="internal_notes" label="Interní poznámky">
                    <TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col span={8}>
            <Card title="Data a platba" style={{ marginBottom: 24 }}>
              <Form.Item name="issue_date" label="Datum vystavení">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>

              <Form.Item
                name="due_date"
                label="Datum splatnosti"
                rules={[{ required: true, message: 'Zadejte datum splatnosti' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>

              <Form.Item name="taxable_date" label="Datum zdanitelného plnění">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>

              <Divider />

              <Form.Item name="bank_account" label="Číslo účtu">
                <Input placeholder="123456789/0800" />
              </Form.Item>

              <Form.Item name="variable_symbol" label="Variabilní symbol">
                <Input placeholder="Automaticky z čísla faktury" />
              </Form.Item>
            </Card>

            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={isSubmitting}
                  block
                  size="large"
                >
                  {isEditing ? 'Uložit změny' : 'Vytvořit fakturu'}
                </Button>
                <Button block onClick={() => navigate('/invoices')}>
                  Zrušit
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  )
}
