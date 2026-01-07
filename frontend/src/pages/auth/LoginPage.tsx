import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  Checkbox,
  Card,
  Typography,
  Alert,
  Space,
} from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'

import { useAuthStore } from '../../store/authStore'
import { LoginCredentials } from '../../types'

const { Title, Text } = Typography

const LoginPage = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleSubmit = async (values: LoginCredentials) => {
    setLoginError(null)
    clearError()

    try {
      await login(values)
      navigate('/')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { detail?: string } } }).response
        setLoginError(response?.data?.detail || 'Přihlášení selhalo')
      } else {
        setLoginError('Přihlášení selhalo')
      }
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              Builder Company
            </Title>
            <Text type="secondary">Přihlaste se do systému</Text>
          </div>

          {(error || loginError) && (
            <Alert
              message={error || loginError}
              type="error"
              showIcon
              closable
              onClose={() => {
                clearError()
                setLoginError(null)
              }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            initialValues={{ remember_me: true }}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Zadejte e-mail' },
                { type: 'email', message: 'Neplatný formát e-mailu' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="E-mail"
                size="large"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Zadejte heslo' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Heslo"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Form.Item name="remember_me" valuePropName="checked" noStyle>
                  <Checkbox>Zapamatovat si mě</Checkbox>
                </Form.Item>
                <a href="#">Zapomněli jste heslo?</a>
              </div>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={isLoading}
              >
                Přihlásit se
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}

export default LoginPage
