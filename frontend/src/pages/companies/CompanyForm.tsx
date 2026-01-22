import { useEffect, useState } from 'react'
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
  Tabs,
  Switch,
  Upload,
  Image,
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'

import { companiesApi } from '../../api/companies'
import { CompanyCreateData } from '../../types'

const { Title } = Typography

const CompanyForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('basic')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [stampFile, setStampFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [stampPreview, setStampPreview] = useState<string | null>(null)

  const isEditing = !!id

  // Fetch existing company for editing
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companiesApi.getCompany(Number(id)),
    enabled: isEditing,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: companiesApi.createCompany,
    onSuccess: (data) => {
      message.success('Firma byla vytvořena')
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      navigate(`/companies/${data.id}`)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Nepodařilo se vytvořit firmu')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CompanyCreateData>) =>
      companiesApi.updateCompany(Number(id), data),
    onSuccess: () => {
      message.success('Firma byla aktualizována')
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company', id] })
      navigate(`/companies/${id}`)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Nepodařilo se aktualizovat firmu')
    },
  })

  // Set form values when company is loaded
  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        ...company,
      })
      if (company.logo_url) {
        setLogoPreview(company.logo_url)
      }
      if (company.stamp_url) {
        setStampPreview(company.stamp_url)
      }
    }
  }, [company, form])

  const handleSubmit = (values: Record<string, unknown>) => {
    const data: CompanyCreateData = {
      name: values.name as string,
      ico: values.ico as string,
      dic: values.dic as string,
      street: values.street as string,
      city: values.city as string,
      postal_code: values.postal_code as string,
      country: values.country as string,
      phone: values.phone as string,
      email: values.email as string,
      website: values.website as string,
      bank_name: values.bank_name as string,
      bank_account: values.bank_account as string,
      iban: values.iban as string,
      swift: values.swift as string,
      is_active: values.is_active as boolean,
    }

    // Add files if selected
    if (logoFile) {
      data.logo = logoFile
    }
    if (stampFile) {
      data.stamp = stampFile
    }

    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleLogoChange: UploadProps['onChange'] = ({ file }) => {
    if (file.originFileObj) {
      setLogoFile(file.originFileObj)
      const reader = new FileReader()
      reader.onload = (e) => setLogoPreview(e.target?.result as string)
      reader.readAsDataURL(file.originFileObj)
    }
  }

  const handleStampChange: UploadProps['onChange'] = ({ file }) => {
    if (file.originFileObj) {
      setStampFile(file.originFileObj)
      const reader = new FileReader()
      reader.onload = (e) => setStampPreview(e.target?.result as string)
      reader.readAsDataURL(file.originFileObj)
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
  }

  const removeStamp = () => {
    setStampFile(null)
    setStampPreview(null)
  }

  if (isEditing && isLoadingCompany) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  const tabItems = [
    {
      key: 'basic',
      label: 'Základní informace',
      children: (
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              name="name"
              label="Název firmy"
              rules={[{ required: true, message: 'Zadejte název firmy' }]}
            >
              <Input placeholder="Název firmy" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="ico"
              label="IČO"
              rules={[
                { pattern: /^\d{8}$/, message: 'IČO musí obsahovat 8 číslic' },
              ]}
            >
              <Input placeholder="12345678" maxLength={8} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="dic" label="DIČ">
              <Input placeholder="CZ12345678" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Telefon">
              <Input placeholder="+420 xxx xxx xxx" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="E-mail"
              rules={[{ type: 'email', message: 'Neplatný e-mail' }]}
            >
              <Input placeholder="info@firma.cz" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="website" label="Web">
              <Input placeholder="https://www.firma.cz" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="is_active" label="Aktivní" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'address',
      label: 'Adresa',
      children: (
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item name="street" label="Ulice a číslo">
              <Input placeholder="Ulice 123" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="city" label="Město">
              <Input placeholder="Praha" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="postal_code" label="PSČ">
              <Input placeholder="110 00" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="country" label="Země">
              <Input placeholder="Česká republika" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'bank',
      label: 'Bankovní údaje',
      children: (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="bank_name" label="Název banky">
              <Input placeholder="Česká spořitelna" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="bank_account" label="Číslo účtu">
              <Input placeholder="123456789/0800" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="iban" label="IBAN">
              <Input placeholder="CZ65 0800 0000 0012 3456 7899" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="swift" label="SWIFT/BIC">
              <Input placeholder="GIBACZPX" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'documents',
      label: 'Dokumenty',
      children: (
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Card title="Logo firmy" size="small">
              {logoPreview ? (
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <Image
                    src={logoPreview}
                    alt="Logo"
                    style={{ maxWidth: 200, maxHeight: 100, objectFit: 'contain' }}
                  />
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={removeLogo}
                  >
                    Odstranit
                  </Button>
                </Space>
              ) : (
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={() => false}
                  onChange={handleLogoChange}
                >
                  <Button icon={<UploadOutlined />}>Nahrát logo</Button>
                </Upload>
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Razítko" size="small">
              {stampPreview ? (
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <Image
                    src={stampPreview}
                    alt="Razítko"
                    style={{ maxWidth: 200, maxHeight: 100, objectFit: 'contain' }}
                  />
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={removeStamp}
                  >
                    Odstranit
                  </Button>
                </Space>
              ) : (
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={() => false}
                  onChange={handleStampChange}
                >
                  <Button icon={<UploadOutlined />}>Nahrát razítko</Button>
                </Upload>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
  ]

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/companies')}>Firmy</a> },
          { title: isEditing ? company?.name : 'Nová firma' },
        ]}
      />

      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {isEditing ? `Upravit firmu: ${company?.name}` : 'Nová firma'}
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
          country: 'Česká republika',
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={18}>
            <Card>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
              />
            </Card>
          </Col>

          <Col xs={24} lg={6}>
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={createMutation.isPending || updateMutation.isPending}
                  block
                >
                  {isEditing ? 'Uložit změny' : 'Vytvořit firmu'}
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

export default CompanyForm
