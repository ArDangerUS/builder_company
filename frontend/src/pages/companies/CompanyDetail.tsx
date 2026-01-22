import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  Row,
  Col,
  Statistic,
  Breadcrumb,
  Empty,
  Image,
  message,
  Divider,
} from 'antd'
import {
  EditOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  ProjectOutlined,
  FileTextOutlined,
  ShopOutlined,
  SwapOutlined,
  BankOutlined,
  GlobalOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons'

import { companiesApi } from '../../api/companies'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils'

const { Title, Text } = Typography

const CompanyDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { setSelectedCompany, selectedCompanyId } = useAuthStore()

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companiesApi.getCompany(Number(id)),
  })

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['company-stats', id],
    queryFn: () => companiesApi.getCompanyStats(Number(id)),
    enabled: !!company,
  })

  const handleSwitchToCompany = () => {
    if (company) {
      setSelectedCompany({
        id: company.id,
        name: company.name,
        slug: company.slug,
        ico: company.ico,
      })
      message.success(`Přepnuto na firmu: ${company.name}`)
      navigate('/')
    }
  }

  const handleClearCompany = () => {
    setSelectedCompany(null)
    message.info('Zobrazují se data všech firem')
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!company) {
    return <Empty description="Firma nenalezena" />
  }

  const isCurrentlySelected = selectedCompanyId === company.id

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/companies')}>Firmy</a> },
          { title: company.name },
        ]}
      />

      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Space direction="vertical" size={0}>
              <Space align="center">
                {company.logo_url && (
                  <Image
                    src={company.logo_url}
                    alt="Logo"
                    style={{ maxHeight: 40, objectFit: 'contain' }}
                    preview={false}
                  />
                )}
                <Title level={4} style={{ margin: 0 }}>
                  {company.name}
                </Title>
                <Tag color={company.is_active ? 'success' : 'default'}>
                  {company.is_active ? 'Aktivní' : 'Neaktivní'}
                </Tag>
                {isCurrentlySelected && (
                  <Tag color="blue">Aktuálně vybraná</Tag>
                )}
              </Space>
              <Text type="secondary">IČO: {company.ico || '-'}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/companies')}>
                Zpět
              </Button>
              {isCurrentlySelected ? (
                <Button
                  icon={<SwapOutlined />}
                  onClick={handleClearCompany}
                >
                  Zrušit výběr
                </Button>
              ) : (
                <Button
                  type="default"
                  icon={<SwapOutlined />}
                  onClick={handleSwitchToCompany}
                >
                  Přepnout na tuto firmu
                </Button>
              )}
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/companies/${id}/edit`)}
              >
                Upravit
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Uživatelé"
                value={stats?.users_count || 0}
                prefix={<UserOutlined />}
                suffix={
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    ({stats?.active_users_count || 0} aktivních)
                  </Text>
                }
                loading={isLoadingStats}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Projekty"
                value={stats?.projects_count || 0}
                prefix={<ProjectOutlined />}
                suffix={
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    ({stats?.active_projects_count || 0} aktivních)
                  </Text>
                }
                loading={isLoadingStats}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Faktury"
                value={stats?.invoices_count || 0}
                prefix={<FileTextOutlined />}
                loading={isLoadingStats}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Materiály"
                value={stats?.materials_count || 0}
                prefix={<ShopOutlined />}
                suffix={
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    ({stats?.suppliers_count || 0} dodavatelů)
                  </Text>
                }
                loading={isLoadingStats}
              />
            </Card>
          </Col>
        </Row>

        {/* Financial Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="Celkem fakturováno"
                value={parseFloat(stats?.total_invoiced || '0')}
                precision={0}
                suffix="Kč"
                formatter={(value) => formatCurrency(Number(value))}
                loading={isLoadingStats}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="Celkem zaplaceno"
                value={parseFloat(stats?.total_paid || '0')}
                precision={0}
                suffix="Kč"
                valueStyle={{ color: '#52c41a' }}
                formatter={(value) => formatCurrency(Number(value))}
                loading={isLoadingStats}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* Company Details */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Základní informace" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Název">{company.name}</Descriptions.Item>
                <Descriptions.Item label="IČO">{company.ico || '-'}</Descriptions.Item>
                <Descriptions.Item label="DIČ">{company.dic || '-'}</Descriptions.Item>
                <Descriptions.Item label="Vytvořeno">{formatDate(company.created_at)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Kontaktní údaje" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label={<><PhoneOutlined /> Telefon</>}>
                  {company.phone || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={<><MailOutlined /> E-mail</>}>
                  {company.email || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={<><GlobalOutlined /> Web</>}>
                  {company.website ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      {company.website}
                    </a>
                  ) : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Adresa" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Ulice">{company.street || '-'}</Descriptions.Item>
                <Descriptions.Item label="Město">{company.city || '-'}</Descriptions.Item>
                <Descriptions.Item label="PSČ">{company.postal_code || '-'}</Descriptions.Item>
                <Descriptions.Item label="Země">{company.country || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title={<><BankOutlined /> Bankovní údaje</>} size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Banka">{company.bank_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Číslo účtu">{company.bank_account || '-'}</Descriptions.Item>
                <Descriptions.Item label="IBAN">{company.iban || '-'}</Descriptions.Item>
                <Descriptions.Item label="SWIFT">{company.swift || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Documents */}
          {(company.logo_url || company.stamp_url) && (
            <Col xs={24}>
              <Card title="Dokumenty" size="small">
                <Row gutter={24}>
                  {company.logo_url && (
                    <Col xs={24} sm={12}>
                      <Text type="secondary">Logo firmy:</Text>
                      <div style={{ marginTop: 8 }}>
                        <Image
                          src={company.logo_url}
                          alt="Logo"
                          style={{ maxWidth: 200, maxHeight: 100, objectFit: 'contain' }}
                        />
                      </div>
                    </Col>
                  )}
                  {company.stamp_url && (
                    <Col xs={24} sm={12}>
                      <Text type="secondary">Razítko:</Text>
                      <div style={{ marginTop: 8 }}>
                        <Image
                          src={company.stamp_url}
                          alt="Razítko"
                          style={{ maxWidth: 200, maxHeight: 100, objectFit: 'contain' }}
                        />
                      </div>
                    </Col>
                  )}
                </Row>
              </Card>
            </Col>
          )}
        </Row>
      </Card>
    </div>
  )
}

export default CompanyDetail
