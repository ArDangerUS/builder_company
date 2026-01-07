import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Button,
  Space,
  Typography,
  Descriptions,
  Tag,
  Table,
  Tabs,
  Spin,
  message,
  Breadcrumb,
  Popconfirm,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Timeline,
  Statistic,
  Row,
  Col,
  Divider,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  SendOutlined,
  StopOutlined,
  DollarOutlined,
  HistoryOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import { invoicesApi } from '../../api/invoices'
import type { InvoiceItem, Payment, InvoiceStatus, PaymentMethod } from '../../types'

const { Title, Text } = Typography

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'default',
  issued: 'blue',
  partially_paid: 'orange',
  paid: 'green',
  overdue: 'red',
  cancelled: 'default',
}

const statusIcons: Record<InvoiceStatus, React.ReactNode> = {
  draft: <EditOutlined />,
  issued: <SendOutlined />,
  partially_paid: <ClockCircleOutlined />,
  paid: <CheckCircleOutlined />,
  overdue: <ExclamationCircleOutlined />,
  cancelled: <StopOutlined />,
}

const paymentMethodOptions = [
  { label: 'Bankovní převod', value: 'bank' },
  { label: 'Hotovost', value: 'cash' },
  { label: 'Kartou', value: 'card' },
]

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentForm] = Form.useForm()

  // Fetch invoice
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(parseInt(id!)),
  })

  // Fetch history
  const { data: history } = useQuery({
    queryKey: ['invoice-history', id],
    queryFn: () => invoicesApi.getHistory(parseInt(id!)),
  })

  // Issue mutation
  const issueMutation = useMutation({
    mutationFn: () => invoicesApi.issue(parseInt(id!)),
    onSuccess: () => {
      message.success('Faktura byla vystavena')
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Nepodařilo se vystavit fakturu')
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => invoicesApi.cancel(parseInt(id!)),
    onSuccess: () => {
      message.success('Faktura byla zrušena')
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Nepodařilo se zrušit fakturu')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => invoicesApi.delete(parseInt(id!)),
    onSuccess: () => {
      message.success('Faktura byla smazána')
      navigate('/invoices')
    },
    onError: () => {
      message.error('Nepodařilo se smazat fakturu')
    },
  })

  // Add payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: (data: { payment_date: string; amount: number; payment_method: PaymentMethod; document_number?: string; notes?: string }) =>
      invoicesApi.addPayment(parseInt(id!), data),
    onSuccess: () => {
      message.success('Platba byla zaznamenána')
      setPaymentModalOpen(false)
      paymentForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      message.error(error.response?.data?.detail || 'Nepodařilo se zaznamenat platbu')
    },
  })

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => invoicesApi.deletePayment(parseInt(id!), paymentId),
    onSuccess: () => {
      message.success('Platba byla odstraněna')
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })
    },
    onError: () => {
      message.error('Nepodařilo se odstranit platbu')
    },
  })

  const handleDownloadPdf = async (lang: string) => {
    try {
      const blob = await invoicesApi.downloadPdf(parseInt(id!), lang)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice?.number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      message.error('Nepodařilo se stáhnout PDF')
    }
  }

  const handlePaymentSubmit = (values: Record<string, unknown>) => {
    addPaymentMutation.mutate({
      payment_date: (values.payment_date as dayjs.Dayjs).format('YYYY-MM-DD'),
      amount: values.amount as number,
      payment_method: values.payment_method as PaymentMethod,
      document_number: values.document_number as string,
      notes: values.notes as string,
    })
  }

  if (isLoading || !invoice) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  const itemColumns: ColumnsType<InvoiceItem> = [
    { title: '#', dataIndex: 'order', key: 'order', width: 50, render: (_, __, idx) => idx + 1 },
    { title: 'Název', dataIndex: 'name', key: 'name' },
    { title: 'Popis', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Množství', dataIndex: 'quantity', key: 'quantity', width: 100, align: 'right' },
    { title: 'Jednotka', dataIndex: 'unit_display', key: 'unit', width: 80 },
    {
      title: 'Cena/jedn.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right',
      render: (v) =>
        new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(v),
    },
    {
      title: 'Celkem',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 120,
      align: 'right',
      render: (v) =>
        new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(v),
    },
  ]

  const paymentColumns: ColumnsType<Payment> = [
    {
      title: 'Datum',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (d) => dayjs(d).format('DD.MM.YYYY'),
    },
    {
      title: 'Částka',
      dataIndex: 'amount',
      key: 'amount',
      render: (v) =>
        new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(
          parseFloat(v)
        ),
    },
    { title: 'Způsob', dataIndex: 'payment_method_display', key: 'method' },
    { title: 'Č. dokladu', dataIndex: 'document_number', key: 'doc' },
    { title: 'Poznámka', dataIndex: 'notes', key: 'notes', ellipsis: true },
    {
      title: 'Akce',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="Odstranit platbu?"
          onConfirm={() => deletePaymentMutation.mutate(record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'items',
      label: (
        <span>
          <FileTextOutlined /> Položky ({invoice.items.length})
        </span>
      ),
      children: (
        <Table
          columns={itemColumns}
          dataSource={invoice.items}
          rowKey="id"
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={6} align="right">
                <strong>Celkem:</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>
                  {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(
                    parseFloat(invoice.total_amount)
                  )}
                </strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      ),
    },
    {
      key: 'payments',
      label: (
        <span>
          <DollarOutlined /> Platby ({invoice.payments.length})
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                paymentForm.setFieldsValue({
                  payment_date: dayjs(),
                  amount: parseFloat(invoice.amount_due),
                  payment_method: 'bank',
                })
                setPaymentModalOpen(true)
              }}
              disabled={invoice.status === 'draft' || invoice.status === 'cancelled' || invoice.status === 'paid'}
            >
              Zaznamenat platbu
            </Button>
          </div>
          <Table
            columns={paymentColumns}
            dataSource={invoice.payments}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined /> Historie
        </span>
      ),
      children: (
        <Timeline
          items={history?.map((h) => ({
            color: h.action === 'created' ? 'green' : h.action === 'cancelled' ? 'red' : 'blue',
            children: (
              <div>
                <Text strong>{h.action_display}</Text>
                <br />
                <Text type="secondary">{h.description}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {h.user_name || 'Systém'} • {dayjs(h.created_at).format('DD.MM.YYYY HH:mm')}
                </Text>
              </div>
            ),
          }))}
        />
      ),
    },
  ]

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Domů', href: '/' },
          { title: 'Faktury', href: '/invoices' },
          { title: invoice.number },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>
            Zpět
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Faktura {invoice.number}
          </Title>
          <Tag color={statusColors[invoice.status]} icon={statusIcons[invoice.status]}>
            {invoice.status_display}
          </Tag>
        </Space>
        <Space>
          {invoice.is_editable && (
            <>
              <Button icon={<EditOutlined />} onClick={() => navigate(`/invoices/${id}/edit`)}>
                Upravit
              </Button>
              <Popconfirm
                title="Vystavit fakturu?"
                description="Po vystavení nebude možné fakturu upravovat."
                onConfirm={() => issueMutation.mutate()}
              >
                <Button type="primary" icon={<SendOutlined />} loading={issueMutation.isPending}>
                  Vystavit
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Smazat fakturu?"
                onConfirm={() => deleteMutation.mutate()}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Smazat
                </Button>
              </Popconfirm>
            </>
          )}
          {!invoice.is_editable && invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <Popconfirm
              title="Zrušit fakturu?"
              onConfirm={() => cancelMutation.mutate()}
            >
              <Button danger icon={<StopOutlined />} loading={cancelMutation.isPending}>
                Zrušit
              </Button>
            </Popconfirm>
          )}
          <Button.Group>
            <Button icon={<FilePdfOutlined />} onClick={() => handleDownloadPdf('cs')}>
              PDF CZ
            </Button>
            <Button onClick={() => handleDownloadPdf('en')}>
              EN
            </Button>
          </Button.Group>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={48}>
              <Col span={12}>
                <Title level={5}>Dodavatel</Title>
                <Text strong>BuilderCompany s.r.o.</Text>
                <br />
                <Text type="secondary">Stavební 123, 110 00 Praha 1</Text>
              </Col>
              <Col span={12}>
                <Title level={5}>Odběratel</Title>
                <Text strong>{invoice.client_name}</Text>
                <br />
                {invoice.client_address && <Text type="secondary">{invoice.client_address}</Text>}
                <br />
                {invoice.client_ico && <Text type="secondary">IČO: {invoice.client_ico}</Text>}
                {invoice.client_dic && <Text type="secondary"> | DIČ: {invoice.client_dic}</Text>}
              </Col>
            </Row>

            <Divider />

            <Descriptions column={3}>
              <Descriptions.Item label="Projekt">
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/projects/${invoice.project}`)}
                >
                  {invoice.project_number} - {invoice.project_name}
                </Button>
              </Descriptions.Item>
              <Descriptions.Item label="Datum vystavení">
                {dayjs(invoice.issue_date).format('DD.MM.YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Datum splatnosti">
                <Text type={invoice.is_overdue ? 'danger' : undefined}>
                  {dayjs(invoice.due_date).format('DD.MM.YYYY')}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="DUZP">
                {invoice.taxable_date ? dayjs(invoice.taxable_date).format('DD.MM.YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Variabilní symbol">
                {invoice.variable_symbol || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Číslo účtu">
                {invoice.bank_account || '-'}
              </Descriptions.Item>
            </Descriptions>

            {invoice.notes && (
              <>
                <Divider />
                <Title level={5}>Poznámky</Title>
                <Text>{invoice.notes}</Text>
              </>
            )}
          </Card>

          <Card>
            <Tabs items={tabItems} />
          </Card>
        </Col>

        <Col span={8}>
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={24}>
                <Statistic
                  title="Celková částka"
                  value={parseFloat(invoice.total_amount)}
                  precision={2}
                  suffix="Kč"
                  valueStyle={{ fontSize: 28 }}
                />
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Uhrazeno"
                  value={parseFloat(invoice.paid_amount)}
                  precision={2}
                  suffix="Kč"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="K úhradě"
                  value={parseFloat(invoice.amount_due)}
                  precision={2}
                  suffix="Kč"
                  valueStyle={{
                    color: parseFloat(invoice.amount_due) > 0 ? '#cf1322' : '#3f8600',
                  }}
                />
              </Col>
            </Row>
          </Card>

          {invoice.internal_notes && (
            <Card title="Interní poznámky" size="small">
              <Text type="secondary">{invoice.internal_notes}</Text>
            </Card>
          )}
        </Col>
      </Row>

      {/* Payment Modal */}
      <Modal
        title="Zaznamenat platbu"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        footer={null}
      >
        <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit}>
          <Form.Item
            name="payment_date"
            label="Datum platby"
            rules={[{ required: true, message: 'Zadejte datum platby' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Částka"
            rules={[{ required: true, message: 'Zadejte částku' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={(value) => Number(value?.replace(/\s/g, '') || 0) as unknown as 0.01}
              addonAfter="Kč"
            />
          </Form.Item>

          <Form.Item
            name="payment_method"
            label="Způsob platby"
            rules={[{ required: true, message: 'Vyberte způsob platby' }]}
          >
            <Select options={paymentMethodOptions} />
          </Form.Item>

          <Form.Item name="document_number" label="Číslo dokladu">
            <Input />
          </Form.Item>

          <Form.Item name="notes" label="Poznámka">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setPaymentModalOpen(false)}>Zrušit</Button>
              <Button type="primary" htmlType="submit" loading={addPaymentMutation.isPending}>
                Uložit platbu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
