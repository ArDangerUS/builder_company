import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  Input,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Spin,
  message,
  Breadcrumb,
  Select,
  Switch,
} from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'

import { usersApi } from '../../api/users'
import { companiesApi } from '../../api/companies'
import { UserCreateData, UserRole } from '../../types'
import { useAuthStore } from '../../store/authStore'

const { Title } = Typography

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manažer' },
  { value: 'accountant', label: 'Účetní' },
  { value: 'warehouse', label: 'Skladník' },
  { value: 'worker', label: 'Pracovník' },
]

const UserForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const { user: currentUser } = useAuthStore()
  const isSuperAdmin = currentUser?.role === 'superadmin'

  const isEditing = !!id

  // Fetch existing user for editing
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getUser(Number(id)),
    enabled: isEditing,
  })

  // Fetch companies for dropdown (SuperAdmin only)
  const { data: companies } = useQuery({
    queryKey: ['companies-choices'],
    queryFn: () => companiesApi.getCompanyChoices(),
    enabled: isSuperAdmin,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      message.success('Uživatel byl vytvořen')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate('/users')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: Record<string, string[]> } }
      const errors = err.response?.data
      if (errors) {
        const firstError = Object.values(errors)[0]
        message.error(Array.isArray(firstError) ? firstError[0] : 'Nepodařilo se vytvořit uživatele')
      } else {
        message.error('Nepodařilo se vytvořit uživatele')
      }
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserCreateData>) =>
      usersApi.updateUser(Number(id), data),
    onSuccess: () => {
      message.success('Uživatel byl aktualizován')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      navigate('/users')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: Record<string, string[]> } }
      const errors = err.response?.data
      if (errors) {
        const firstError = Object.values(errors)[0]
        message.error(Array.isArray(firstError) ? firstError[0] : 'Nepodařilo se aktualizovat uživatele')
      } else {
        message.error('Nepodařilo se aktualizovat uživatele')
      }
    },
  })

  // Set form values when user is loaded
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: user.phone,
        position: user.position,
        company: user.company,
        is_active: user.is_active,
      })
    }
  }, [user, form])

  const handleSubmit = (values: Record<string, unknown>) => {
    if (isEditing) {
      // Don't send password fields on update unless they're filled
      const updateData: Partial<UserCreateData> = {
        email: values.email as string,
        first_name: values.first_name as string,
        last_name: values.last_name as string,
        role: values.role as UserRole,
        phone: values.phone as string,
        position: values.position as string,
        is_active: values.is_active as boolean,
      }
      if (isSuperAdmin) {
        updateData.company = values.company as number | null
      }
      if (values.password) {
        updateData.password = values.password as string
        updateData.password_confirm = values.password_confirm as string
      }
      updateMutation.mutate(updateData)
    } else {
      const createData: UserCreateData = {
        email: values.email as string,
        password: values.password as string,
        password_confirm: values.password_confirm as string,
        first_name: values.first_name as string,
        last_name: values.last_name as string,
        role: values.role as UserRole,
        phone: values.phone as string,
        position: values.position as string,
      }
      if (isSuperAdmin && values.company) {
        createData.company = values.company as number
      }
      createMutation.mutate(createData)
    }
  }

  if (isEditing && isLoadingUser) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/users')}>Uživatelé</a> },
          { title: isEditing ? user?.full_name : 'Nový uživatel' },
        ]}
      />

      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {isEditing ? `Upravit uživatele: ${user?.full_name}` : 'Nový uživatel'}
          </Title>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Zpět
          </Button>
        </Col>
      </Row>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          is_active: true,
          role: 'worker',
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card title="Základní informace">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="first_name"
                    label="Jméno"
                    rules={[{ required: true, message: 'Zadejte jméno' }]}
                  >
                    <Input placeholder="Jan" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="last_name"
                    label="Příjmení"
                    rules={[{ required: true, message: 'Zadejte příjmení' }]}
                  >
                    <Input placeholder="Novák" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="email"
                    label="E-mail"
                    rules={[
                      { required: true, message: 'Zadejte e-mail' },
                      { type: 'email', message: 'Neplatný e-mail' },
                    ]}
                  >
                    <Input placeholder="jan.novak@firma.cz" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="phone" label="Telefon">
                    <Input placeholder="+420 xxx xxx xxx" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="position" label="Pozice">
                    <Input placeholder="Stavbyvedoucí" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title={isEditing ? 'Změnit heslo' : 'Heslo'} style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="password"
                    label="Heslo"
                    rules={
                      isEditing
                        ? []
                        : [
                            { required: true, message: 'Zadejte heslo' },
                            { min: 8, message: 'Heslo musí mít alespoň 8 znaků' },
                          ]
                    }
                  >
                    <Input.Password placeholder={isEditing ? 'Ponechte prázdné pro zachování' : 'Zadejte heslo'} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="password_confirm"
                    label="Potvrzení hesla"
                    dependencies={['password']}
                    rules={
                      isEditing
                        ? [
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!getFieldValue('password') || getFieldValue('password') === value) {
                                  return Promise.resolve()
                                }
                                return Promise.reject(new Error('Hesla se neshodují'))
                              },
                            }),
                          ]
                        : [
                            { required: true, message: 'Potvrďte heslo' },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                  return Promise.resolve()
                                }
                                return Promise.reject(new Error('Hesla se neshodují'))
                              },
                            }),
                          ]
                    }
                  >
                    <Input.Password placeholder="Potvrďte heslo" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Role a přístup">
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Vyberte roli' }]}
              >
                <Select options={roleOptions} placeholder="Vyberte roli" />
              </Form.Item>

              {isSuperAdmin && (
                <Form.Item
                  name="company"
                  label="Firma"
                  rules={[{ required: true, message: 'Vyberte firmu' }]}
                >
                  <Select
                    placeholder="Vyberte firmu"
                    allowClear
                    options={companies?.map(c => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </Form.Item>
              )}

              <Form.Item name="is_active" label="Aktivní" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>

            <Card style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={createMutation.isPending || updateMutation.isPending}
                  block
                >
                  {isEditing ? 'Uložit změny' : 'Vytvořit uživatele'}
                </Button>
                <Button block onClick={() => navigate(-1)}>
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

export default UserForm
