import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
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
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { settingsApi } from '../../api/settings'
import { WorkType, WorkTypeCreateData } from '../../types'

const { TextArea } = Input

const WorkTypesTab = () => {
  const queryClient = useQueryClient()
  const [showActive, setShowActive] = useState<boolean | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWorkType, setEditingWorkType] = useState<WorkType | null>(null)
  const [form] = Form.useForm()

  const { data: workTypes, isLoading } = useQuery({
    queryKey: ['workTypes', { is_active: showActive }],
    queryFn: () => settingsApi.listWorkTypes({ is_active: showActive }),
  })

  const createMutation = useMutation({
    mutationFn: settingsApi.createWorkType,
    onSuccess: () => {
      message.success('Typ prací byl vytvořen')
      queryClient.invalidateQueries({ queryKey: ['workTypes'] })
      handleCloseModal()
    },
    onError: () => {
      message.error('Nepodařilo se vytvořit typ prací')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WorkTypeCreateData> }) =>
      settingsApi.updateWorkType(id, data),
    onSuccess: () => {
      message.success('Typ prací byl aktualizován')
      queryClient.invalidateQueries({ queryKey: ['workTypes'] })
      handleCloseModal()
    },
    onError: () => {
      message.error('Nepodařilo se aktualizovat typ prací')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteWorkType,
    onSuccess: () => {
      message.success('Typ prací byl smazán')
      queryClient.invalidateQueries({ queryKey: ['workTypes'] })
    },
    onError: () => {
      message.error('Nepodařilo se smazat typ prací')
    },
  })

  const handleOpenModal = async (workType?: WorkType) => {
    if (workType) {
      const fullWorkType = await settingsApi.getWorkType(workType.id)
      setEditingWorkType(fullWorkType)
      form.setFieldsValue(fullWorkType)
    } else {
      setEditingWorkType(null)
      form.resetFields()
      form.setFieldsValue({ is_active: true })
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingWorkType(null)
    form.resetFields()
  }

  const handleSubmit = (values: WorkTypeCreateData) => {
    if (editingWorkType) {
      updateMutation.mutate({ id: editingWorkType.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const columns: ColumnsType<WorkType> = [
    {
      title: 'Název',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Kód',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code) => code || '-',
    },
    {
      title: 'Popis',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc) => desc || '-',
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
            title="Opravdu smazat typ prací?"
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
          <Switch
            checked={showActive === true}
            onChange={(checked) => setShowActive(checked ? true : undefined)}
            checkedChildren="Aktivní"
            unCheckedChildren="Vše"
          />
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Nový typ prací
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={workTypes}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={editingWorkType ? 'Upravit typ prací' : 'Nový typ prací'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Název"
            rules={[{ required: true, message: 'Vyplňte název' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="code"
            label="Kód"
            extra="Krátký identifikátor (např. STB, REK)"
          >
            <Input maxLength={10} style={{ width: 150 }} />
          </Form.Item>

          <Form.Item name="description" label="Popis">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Aktivní"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Zrušit</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingWorkType ? 'Uložit' : 'Vytvořit'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WorkTypesTab
