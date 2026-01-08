import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Switch,
  message,
  Popconfirm,
  Row,
  Col,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { settingsApi } from '../../api/settings'
import { SupplierListItem, Supplier, SupplierCreateData } from '../../types'

const { TextArea } = Input

const SuppliersTab = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showActive, setShowActive] = useState<boolean | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [form] = Form.useForm()

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', { search, is_active: showActive }],
    queryFn: () => settingsApi.listSuppliers({ search, is_active: showActive }),
  })

  const createMutation = useMutation({
    mutationFn: settingsApi.createSupplier,
    onSuccess: () => {
      message.success('Dodavatel byl vytvořen')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      handleCloseModal()
    },
    onError: () => {
      message.error('Nepodařilo se vytvořit dodavatele')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SupplierCreateData> }) =>
      settingsApi.updateSupplier(id, data),
    onSuccess: () => {
      message.success('Dodavatel byl aktualizován')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      handleCloseModal()
    },
    onError: () => {
      message.error('Nepodařilo se aktualizovat dodavatele')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteSupplier,
    onSuccess: () => {
      message.success('Dodavatel byl smazán')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: () => {
      message.error('Nepodařilo se smazat dodavatele')
    },
  })

  const handleOpenModal = async (supplier?: SupplierListItem) => {
    if (supplier) {
      const fullSupplier = await settingsApi.getSupplier(supplier.id)
      setEditingSupplier(fullSupplier)
      form.setFieldsValue(fullSupplier)
    } else {
      setEditingSupplier(null)
      form.resetFields()
      form.setFieldsValue({ is_active: true })
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingSupplier(null)
    form.resetFields()
  }

  const handleSubmit = (values: SupplierCreateData) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const columns: ColumnsType<SupplierListItem> = [
    {
      title: 'Název',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'IČO',
      dataIndex: 'ico',
      key: 'ico',
      width: 100,
      render: (ico) => ico || '-',
    },
    {
      title: 'Kontaktní osoba',
      dataIndex: 'contact_person',
      key: 'contact_person',
      render: (name) => name || '-',
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone) => phone || '-',
    },
    {
      title: 'E-mail',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-',
    },
    {
      title: 'Stav',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 90,
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Aktivní' : 'Neaktivní'}
        </Tag>
      ),
    },
    {
      title: 'Akce',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Opravdu smazat dodavatele?"
            onConfirm={() => deleteMutation.mutate(record.id)}
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
          <Space>
            <Input.Search
              placeholder="Hledat dodavatele..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={setSearch}
              style={{ width: 300 }}
            />
            <Switch
              checked={showActive === true}
              onChange={(checked) => setShowActive(checked ? true : undefined)}
              checkedChildren="Aktivní"
              unCheckedChildren="Vše"
            />
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Nový dodavatel
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={suppliers}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={editingSupplier ? 'Upravit dodavatele' : 'Nový dodavatel'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                name="name"
                label="Název"
                rules={[{ required: true, message: 'Vyplňte název' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="is_active"
                label="Aktivní"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="ico"
                label="IČO"
                rules={[{ pattern: /^\d{8}$/, message: 'IČO musí mít 8 číslic' }]}
              >
                <Input maxLength={8} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="dic" label="DIČ">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="contact_person" label="Kontaktní osoba">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Telefon">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="E-mail"
                rules={[{ type: 'email', message: 'Neplatný e-mail' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label="Adresa">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="bank_account" label="Číslo účtu">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="notes" label="Poznámky">
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Zrušit</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingSupplier ? 'Uložit' : 'Vytvořit'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SuppliersTab
