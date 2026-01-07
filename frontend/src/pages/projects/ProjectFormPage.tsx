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
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

import { projectsApi } from '../../api/projects'
import { ProjectCreateData, ProjectStatus, ProjectWorkType } from '../../types'

const { Title } = Typography
const { TextArea } = Input

const statusOptions = [
  { label: 'Plánování', value: 'planning' },
  { label: 'Aktivní', value: 'active' },
  { label: 'Pozastaveno', value: 'suspended' },
  { label: 'Dokončeno', value: 'completed' },
  { label: 'Zrušeno', value: 'cancelled' },
]

const workTypeOptions = [
  { label: 'Stavba', value: 'construction' },
  { label: 'Rekonstrukce', value: 'reconstruction' },
  { label: 'Oprava', value: 'repair' },
  { label: 'Instalace', value: 'installation' },
  { label: 'Demolice', value: 'demolition' },
  { label: 'Projektování', value: 'design' },
  { label: 'Jiné', value: 'other' },
]

const ProjectFormPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [isVerifyingIco, setIsVerifyingIco] = useState(false)

  const isEditing = !!id

  // Fetch existing project for editing
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(Number(id)),
    enabled: isEditing,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (data) => {
      message.success('Projekt byl vytvořen')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/projects/${data.id}`)
    },
    onError: () => {
      message.error('Nepodařilo se vytvořit projekt')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProjectCreateData>) =>
      projectsApi.update(Number(id), data),
    onSuccess: () => {
      message.success('Projekt byl aktualizován')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      navigate(`/projects/${id}`)
    },
    onError: () => {
      message.error('Nepodařilo se aktualizovat projekt')
    },
  })

  // Set form values when project is loaded
  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        ...project,
        start_date: project.start_date ? dayjs(project.start_date) : null,
        planned_end_date: project.planned_end_date ? dayjs(project.planned_end_date) : null,
        actual_end_date: project.actual_end_date ? dayjs(project.actual_end_date) : null,
        planned_budget: parseFloat(project.planned_budget),
      })
    }
  }, [project, form])

  // Verify IČO via ARES
  const handleVerifyIco = async () => {
    const ico = form.getFieldValue('client_ico')
    if (!ico || ico.length !== 8) {
      message.warning('Zadejte platné IČO (8 číslic)')
      return
    }

    setIsVerifyingIco(true)
    try {
      const data = await projectsApi.verifyIco(ico)
      form.setFieldsValue({
        client_name: data.name,
        client_dic: data.dic,
        client_address: data.address,
      })
      message.success('Údaje byly načteny z ARES')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      message.error(err.response?.data?.detail || 'Nepodařilo se ověřit IČO')
    } finally {
      setIsVerifyingIco(false)
    }
  }

  const handleSubmit = (values: Record<string, unknown>) => {
    const data: ProjectCreateData = {
      name: values.name as string,
      description: values.description as string,
      client_name: values.client_name as string,
      client_ico: values.client_ico as string,
      client_dic: values.client_dic as string,
      client_address: values.client_address as string,
      client_contact_person: values.client_contact_person as string,
      client_phone: values.client_phone as string,
      client_email: values.client_email as string,
      site_address: values.site_address as string,
      work_type: values.work_type as ProjectWorkType,
      manager: values.manager as number | null,
      status: values.status as ProjectStatus,
      planned_budget: values.planned_budget?.toString(),
      start_date: values.start_date ? (values.start_date as dayjs.Dayjs).format('YYYY-MM-DD') : null,
      planned_end_date: values.planned_end_date
        ? (values.planned_end_date as dayjs.Dayjs).format('YYYY-MM-DD')
        : null,
      notes: values.notes as string,
    }

    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  if (isEditing && isLoadingProject) {
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
          { title: <a onClick={() => navigate('/projects')}>Projekty</a> },
          { title: isEditing ? project?.number : 'Nový projekt' },
        ]}
      />

      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {isEditing ? `Upravit projekt ${project?.number}` : 'Nový projekt'}
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
          status: 'planning',
          work_type: 'construction',
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            {/* Basic Info */}
            <Card title="Základní informace" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    name="name"
                    label="Název projektu"
                    rules={[{ required: true, message: 'Zadejte název projektu' }]}
                  >
                    <Input placeholder="Název projektu" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="description" label="Popis">
                    <TextArea rows={3} placeholder="Popis projektu" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="site_address"
                    label="Adresa stavby"
                    rules={[{ required: true, message: 'Zadejte adresu stavby' }]}
                  >
                    <TextArea rows={2} placeholder="Adresa stavby" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Client Info */}
            <Card title="Údaje o klientovi" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="client_ico"
                    label="IČO"
                    rules={[
                      { pattern: /^\d{8}$/, message: 'IČO musí obsahovat 8 číslic' },
                    ]}
                  >
                    <Input
                      placeholder="12345678"
                      maxLength={8}
                      suffix={
                        <Button
                          type="link"
                          size="small"
                          icon={isVerifyingIco ? <LoadingOutlined /> : <SearchOutlined />}
                          onClick={handleVerifyIco}
                          disabled={isVerifyingIco}
                          style={{ marginRight: -8 }}
                        >
                          Ověřit v ARES
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="client_dic" label="DIČ">
                    <Input placeholder="CZ12345678" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="client_name"
                    label="Název klienta"
                    rules={[{ required: true, message: 'Zadejte název klienta' }]}
                  >
                    <Input placeholder="Název společnosti nebo jméno" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="client_address" label="Adresa klienta">
                    <TextArea rows={2} placeholder="Adresa klienta" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="client_contact_person" label="Kontaktní osoba">
                    <Input placeholder="Jméno kontaktní osoby" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="client_phone" label="Telefon">
                    <Input placeholder="+420 xxx xxx xxx" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="client_email"
                    label="E-mail"
                    rules={[{ type: 'email', message: 'Neplatný e-mail' }]}
                  >
                    <Input placeholder="email@example.com" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Notes */}
            <Card title="Poznámky" style={{ marginBottom: 24 }}>
              <Form.Item name="notes" noStyle>
                <TextArea rows={4} placeholder="Interní poznámky k projektu" />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            {/* Project Details */}
            <Card title="Detaily projektu" style={{ marginBottom: 24 }}>
              <Form.Item
                name="status"
                label="Stav"
                rules={[{ required: true }]}
              >
                <Select options={statusOptions} />
              </Form.Item>

              <Form.Item
                name="work_type"
                label="Typ prací"
                rules={[{ required: true }]}
              >
                <Select options={workTypeOptions} />
              </Form.Item>

              <Form.Item name="manager" label="Manažer projektu">
                <Select
                  placeholder="Vyberte manažera"
                  allowClear
                  // TODO: Load users from API
                  options={[]}
                />
              </Form.Item>

              <Divider />

              <Form.Item name="planned_budget" label="Plánovaný rozpočet (Kč)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                  }
                  parser={(value) => (value?.replace(/\s/g, '') || '0') as unknown as 0}
                />
              </Form.Item>

              <Divider />

              <Form.Item name="start_date" label="Datum zahájení">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>

              <Form.Item name="planned_end_date" label="Plánované dokončení">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>

              {isEditing && (
                <Form.Item name="actual_end_date" label="Skutečné dokončení">
                  <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
                </Form.Item>
              )}
            </Card>

            {/* Actions */}
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={createMutation.isPending || updateMutation.isPending}
                  block
                >
                  {isEditing ? 'Uložit změny' : 'Vytvořit projekt'}
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

export default ProjectFormPage
