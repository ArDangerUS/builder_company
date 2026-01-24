import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Popconfirm,
  message,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { usersApi, UserFilters } from '../../api/users'
import { companiesApi } from '../../api/companies'
import { UserListItem, UserRole } from '../../types'
import { useAuthStore } from '../../store/authStore'

const { Title } = Typography

const roleLabels: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manažer',
  accountant: 'Účetní',
  warehouse: 'Skladník',
  worker: 'Pracovník',
}

const roleColors: Record<UserRole, string> = {
  superadmin: 'purple',
  admin: 'blue',
  manager: 'green',
  accountant: 'orange',
  warehouse: 'cyan',
  worker: 'default',
}

const UsersPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const isSuperAdmin = currentUser?.role === 'superadmin'

  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    page_size: 50,
  })

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.getUsers(filters),
  })

  // Fetch companies for filter (SuperAdmin only)
  const { data: companies } = useQuery({
    queryKey: ['companies-choices'],
    queryFn: () => companiesApi.getCompanyChoices(),
    enabled: isSuperAdmin,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      message.success('Uživatel byl smazán')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Nepodařilo se smazat uživatele')
    },
  })

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }))
  }

  const handleRoleFilter = (value: UserRole | undefined) => {
    setFilters(prev => ({ ...prev, role: value, page: 1 }))
  }

  const handleCompanyFilter = (value: number | undefined) => {
    setFilters(prev => ({ ...prev, company: value, page: 1 }))
  }

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) {
      message.error('Nemůžete smazat sám sebe')
      return
    }
    deleteMutation.mutate(id)
  }

  const columns: ColumnsType<UserListItem> = [
    {
      title: 'Uživatel',
      key: 'user',
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{record.full_name || record.email}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: UserRole) => (
        <Tag color={roleColors[role]}>{roleLabels[role]}</Tag>
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            title: 'Firma',
            dataIndex: 'company_name',
            key: 'company_name',
            width: 200,
            render: (name: string | null) => name || <Tag>Bez firmy</Tag>,
          },
        ]
      : []),
    {
      title: 'Stav',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Aktivní' : 'Neaktivní'}
        </Tag>
      ),
    },
    {
      title: 'Akce',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Upravit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/users/${record.id}/edit`)}
            />
          </Tooltip>
          {record.id !== currentUser?.id && (
            <Popconfirm
              title="Smazat uživatele?"
              description="Tato akce je nevratná."
              onConfirm={() => handleDelete(record.id)}
              okText="Smazat"
              cancelText="Zrušit"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Smazat">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Uživatelé
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/users/new')}
          >
            Nový uživatel
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Hledat podle jména nebo e-mailu..."
              prefix={<SearchOutlined />}
              allowClear
              onChange={e => handleSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filtrovat podle role"
              allowClear
              style={{ width: '100%' }}
              onChange={handleRoleFilter}
              options={Object.entries(roleLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Col>
          {isSuperAdmin && (
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Filtrovat podle firmy"
                allowClear
                style={{ width: '100%' }}
                onChange={handleCompanyFilter}
                options={companies?.map(c => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            </Col>
          )}
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data?.results || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: filters.page,
            pageSize: filters.page_size,
            total: data?.count || 0,
            showSizeChanger: true,
            showTotal: total => `Celkem ${total} uživatelů`,
            onChange: (page, pageSize) =>
              setFilters(prev => ({ ...prev, page, page_size: pageSize })),
          }}
        />
      </Card>
    </div>
  )
}

export default UsersPage
