import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  Divider,
  Upload,
  Image,
  Spin,
  message,
  Typography,
} from 'antd'
import { UploadOutlined, SaveOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'

import { settingsApi } from '../../api/settings'
import { CompanySettingsUpdate } from '../../types'

const { Title, Text } = Typography
const { TextArea } = Input

interface Props {
  isAdmin: boolean
}

const CompanySettingsTab = ({ isAdmin }: Props) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [logoFile, setLogoFile] = useState<UploadFile[]>([])
  const [stampFile, setStampFile] = useState<UploadFile[]>([])
  const [signatureFile, setSignatureFile] = useState<UploadFile[]>([])

  const { data: settings, isLoading } = useQuery({
    queryKey: ['companySettings'],
    queryFn: settingsApi.getCompanySettings,
  })

  const updateMutation = useMutation({
    mutationFn: settingsApi.updateCompanySettings,
    onSuccess: () => {
      message.success('Nastavení bylo uloženo')
      queryClient.invalidateQueries({ queryKey: ['companySettings'] })
      setLogoFile([])
      setStampFile([])
      setSignatureFile([])
    },
    onError: () => {
      message.error('Nepodařilo se uložit nastavení')
    },
  })

  const handleSubmit = (values: CompanySettingsUpdate) => {
    const data: CompanySettingsUpdate = { ...values }

    if (logoFile.length > 0 && logoFile[0].originFileObj) {
      data.logo = logoFile[0].originFileObj
    }
    if (stampFile.length > 0 && stampFile[0].originFileObj) {
      data.stamp = stampFile[0].originFileObj
    }
    if (signatureFile.length > 0 && signatureFile[0].originFileObj) {
      data.signature = signatureFile[0].originFileObj
    }

    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={settings}
      onFinish={handleSubmit}
      disabled={!isAdmin}
    >
      <Title level={5}>Základní údaje</Title>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="company_name_cs"
            label="Název firmy (CZ)"
            rules={[{ required: true, message: 'Vyplňte název firmy' }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="company_name_en" label="Název firmy (EN)">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="ico"
            label="IČO"
            rules={[
              { pattern: /^\d{8}$/, message: 'IČO musí mít 8 číslic' },
            ]}
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
          <Form.Item name="registration_court" label="Registrační soud">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <Title level={5}>Adresa</Title>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="street" label="Ulice a číslo">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item name="city" label="Město">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={3}>
          <Form.Item name="postal_code" label="PSČ">
            <Input maxLength={6} />
          </Form.Item>
        </Col>
        <Col xs={24} md={3}>
          <Form.Item name="country" label="Země">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <Title level={5}>Kontakt</Title>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="phone" label="Telefon">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="email"
            label="E-mail"
            rules={[{ type: 'email', message: 'Neplatný e-mail' }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="website"
            label="Web"
            rules={[{ type: 'url', message: 'Neplatná URL' }]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <Title level={5}>Bankovní údaje</Title>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="bank_name" label="Název banky">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="bank_account" label="Číslo účtu">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="iban" label="IBAN">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="swift" label="SWIFT/BIC">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <Title level={5}>Dokumenty a obrázky</Title>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="Logo">
            {settings?.logo_url && (
              <div style={{ marginBottom: 8 }}>
                <Image
                  src={settings.logo_url}
                  alt="Logo"
                  width={100}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            )}
            <Upload
              fileList={logoFile}
              beforeUpload={() => false}
              onChange={({ fileList }) => setLogoFile(fileList.slice(-1))}
              accept="image/*"
              maxCount={1}
              disabled={!isAdmin}
            >
              <Button icon={<UploadOutlined />} disabled={!isAdmin}>
                Nahrát logo
              </Button>
            </Upload>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Razítko">
            {settings?.stamp_url && (
              <div style={{ marginBottom: 8 }}>
                <Image
                  src={settings.stamp_url}
                  alt="Razítko"
                  width={100}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            )}
            <Upload
              fileList={stampFile}
              beforeUpload={() => false}
              onChange={({ fileList }) => setStampFile(fileList.slice(-1))}
              accept="image/*"
              maxCount={1}
              disabled={!isAdmin}
            >
              <Button icon={<UploadOutlined />} disabled={!isAdmin}>
                Nahrát razítko
              </Button>
            </Upload>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Podpis">
            {settings?.signature_url && (
              <div style={{ marginBottom: 8 }}>
                <Image
                  src={settings.signature_url}
                  alt="Podpis"
                  width={100}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            )}
            <Upload
              fileList={signatureFile}
              beforeUpload={() => false}
              onChange={({ fileList }) => setSignatureFile(fileList.slice(-1))}
              accept="image/*"
              maxCount={1}
              disabled={!isAdmin}
            >
              <Button icon={<UploadOutlined />} disabled={!isAdmin}>
                Nahrát podpis
              </Button>
            </Upload>
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <Title level={5}>Další nastavení</Title>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            name="invoice_notes"
            label="Poznámky na faktury"
            extra="Tento text se zobrazí na všech fakturách"
          >
            <TextArea rows={4} />
          </Form.Item>
        </Col>
      </Row>

      {isAdmin && (
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={updateMutation.isPending}
          >
            Uložit nastavení
          </Button>
        </Form.Item>
      )}

      {!isAdmin && (
        <Text type="secondary">
          Pouze administrátor může upravovat nastavení firmy.
        </Text>
      )}
    </Form>
  )
}

export default CompanySettingsTab
