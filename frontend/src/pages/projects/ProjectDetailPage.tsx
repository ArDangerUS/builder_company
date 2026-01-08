import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Timeline,
  Upload,
  message,
  Popconfirm,
  Breadcrumb,
  Empty,
} from 'antd'
import {
  EditOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'

import { projectsApi } from '../../api/projects'
import { invoicesApi } from '../../api/invoices'
import { ProjectStatus, ProjectFile, ProjectHistory, InvoiceListItem, InvoiceStatus } from '../../types'
import { formatCurrency, formatDate, formatDateTime } from '../../utils'

const { Title, Text } = Typography

const statusColors: Record<ProjectStatus, string> = {
  planning: 'default',
  active: 'processing',
  suspended: 'warning',
  completed: 'success',
  cancelled: 'error',
}

const invoiceStatusColors: Record<InvoiceStatus, string> = {
  draft: 'default',
  sent: 'processing',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'error',
  cancelled: 'default',
}

const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: 'Koncept',
  sent: 'Odesláno',
  paid: 'Zaplaceno',
  partially_paid: 'Částečně zaplaceno',
  overdue: 'Po splatnosti',
  cancelled: 'Zrušeno',
}

const getFileIcon = (extension: string) => {
  switch (extension) {
    case '.pdf':
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />
    case '.jpg':
    case '.jpeg':
    case '.png':
      return <FileImageOutlined style={{ color: '#52c41a' }} />
    case '.xlsx':
    case '.xls':
      return <FileExcelOutlined style={{ color: '#52c41a' }} />
    case '.docx':
    case '.doc':
      return <FileWordOutlined style={{ color: '#1890ff' }} />
    default:
      return <FileOutlined />
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ProjectDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('details')

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(Number(id)),
  })

  const { data: finances } = useQuery({
    queryKey: ['project-finances', id],
    queryFn: () => projectsApi.getFinances(Number(id)),
    enabled: activeTab === 'finances',
  })

  const { data: files, refetch: refetchFiles } = useQuery({
    queryKey: ['project-files', id],
    queryFn: () => projectsApi.getFiles(Number(id)),
    enabled: activeTab === 'files',
  })

  const { data: history } = useQuery({
    queryKey: ['project-history', id],
    queryFn: () => projectsApi.getHistory(Number(id)),
    enabled: activeTab === 'history',
  })

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['project-invoices', id],
    queryFn: () => invoicesApi.list({ project: Number(id) }),
    enabled: activeTab === 'invoices',
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => projectsApi.deleteFile(Number(id), fileId),
    onSuccess: () => {
      message.success('Soubor byl smazán')
      refetchFiles()
      queryClient.invalidateQueries({ queryKey: ['project', id] })
    },
    onError: () => {
      message.error('Nepodařilo se smazat soubor')
    },
  })

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    directory: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        await projectsApi.uploadFile(Number(id), file as File, {})
        message.success(`Soubor "${(file as File).name}" byl nahrán`)
        refetchFiles()
        queryClient.invalidateQueries({ queryKey: ['project', id] })
        onSuccess?.({})
      } catch {
        message.error(`Nepodařilo se nahrát soubor "${(file as File).name}"`)
        onError?.(new Error('Upload failed'))
      }
    },
  }

  const uploadFolderProps: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    directory: true,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        await projectsApi.uploadFile(Number(id), file as File, {})
        refetchFiles()
        queryClient.invalidateQueries({ queryKey: ['project', id] })
        onSuccess?.({})
      } catch {
        onError?.(new Error('Upload failed'))
      }
    },
    onChange: (info) => {
      const { status } = info.file
      if (status === 'done') {
        const allDone = info.fileList.every(f => f.status === 'done')
        if (allDone) {
          message.success(`Nahráno ${info.fileList.length} souborů`)
        }
      }
    },
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!project) {
    return <Empty description="Projekt nenalezen" />
  }

  const fileColumns = [
    {
      title: 'Soubor',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ProjectFile) => (
        <Space>
          {getFileIcon(record.file_extension)}
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Typ',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 120,
    },
    {
      title: 'Velikost',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Nahráno',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Akce',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: ProjectFile) => (
        <Space>
          <Button
            type="text"
            icon={<DownloadOutlined />}
            href={record.file_url}
            target="_blank"
          />
          <Popconfirm
            title="Smazat soubor?"
            onConfirm={() => deleteFileMutation.mutate(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'details',
      label: 'Detaily',
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Základní informace" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Číslo projektu">{project.number}</Descriptions.Item>
                <Descriptions.Item label="Název">{project.name}</Descriptions.Item>
                <Descriptions.Item label="Popis">
                  {project.description || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Adresa stavby">
                  {project.site_address}
                </Descriptions.Item>
                <Descriptions.Item label="Typ prací">
                  {project.work_type_display}
                </Descriptions.Item>
                <Descriptions.Item label="Manažer">
                  {project.manager_name || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Klient" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Název">{project.client_name}</Descriptions.Item>
                <Descriptions.Item label="IČO">{project.client_ico || '-'}</Descriptions.Item>
                <Descriptions.Item label="DIČ">{project.client_dic || '-'}</Descriptions.Item>
                <Descriptions.Item label="Adresa">
                  {project.client_address || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Kontakt">
                  {project.client_contact_person || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Telefon">
                  {project.client_phone || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="E-mail">
                  {project.client_email || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Termíny" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Datum zahájení">
                  {project.start_date ? formatDate(project.start_date) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Plánované dokončení">
                  {project.planned_end_date ? formatDate(project.planned_end_date) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Skutečné dokončení">
                  {project.actual_end_date ? formatDate(project.actual_end_date) : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Poznámky" size="small">
              <Text>{project.notes || 'Žádné poznámky'}</Text>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'finances',
      label: 'Finance',
      children: finances ? (
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Plánovaný rozpočet"
                value={parseFloat(finances.planned_budget)}
                precision={0}
                suffix="Kč"
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Skutečné náklady"
                value={parseFloat(finances.actual_costs)}
                precision={0}
                suffix="Kč"
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Fakturováno"
                value={parseFloat(finances.invoiced_amount)}
                precision={0}
                suffix="Kč"
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Zaplaceno"
                value={parseFloat(finances.paid_amount)}
                precision={0}
                suffix="Kč"
                valueStyle={{ color: '#52c41a' }}
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="Využití rozpočtu">
              <Progress
                percent={finances.budget_usage_percent}
                status={finances.budget_usage_percent > 100 ? 'exception' : 'active'}
                format={(percent) => `${percent?.toFixed(1)}%`}
              />
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Text type="secondary">Zbývá z rozpočtu:</Text>
                  <br />
                  <Text strong>
                    {formatCurrency(parseFloat(finances.budget_remaining))}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Nezaplaceno:</Text>
                  <br />
                  <Text strong type={parseFloat(finances.outstanding_amount) > 0 ? 'warning' : undefined}>
                    {formatCurrency(parseFloat(finances.outstanding_amount))}
                  </Text>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      ) : (
        <Spin />
      ),
    },
    {
      key: 'invoices',
      label: `Faktury (${invoicesData?.count || 0})`,
      children: isLoadingInvoices ? (
        <Spin />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            onClick={() => navigate(`/invoices/new?project=${id}`)}
          >
            Vytvořit fakturu
          </Button>
          <Table
            columns={[
              {
                title: 'Číslo',
                dataIndex: 'number',
                key: 'number',
                render: (number: string, record: InvoiceListItem) => (
                  <a onClick={() => navigate(`/invoices/${record.id}`)}>{number}</a>
                ),
              },
              {
                title: 'Stav',
                dataIndex: 'status',
                key: 'status',
                render: (status: InvoiceStatus) => (
                  <Tag color={invoiceStatusColors[status]}>
                    {invoiceStatusLabels[status]}
                  </Tag>
                ),
              },
              {
                title: 'Datum vystavení',
                dataIndex: 'issue_date',
                key: 'issue_date',
                render: (date: string) => formatDate(date),
              },
              {
                title: 'Splatnost',
                dataIndex: 'due_date',
                key: 'due_date',
                render: (date: string) => formatDate(date),
              },
              {
                title: 'Celkem',
                dataIndex: 'total_amount',
                key: 'total_amount',
                align: 'right' as const,
                render: (amount: string) => formatCurrency(parseFloat(amount)),
              },
              {
                title: 'Zaplaceno',
                dataIndex: 'paid_amount',
                key: 'paid_amount',
                align: 'right' as const,
                render: (amount: string) => formatCurrency(parseFloat(amount)),
              },
            ]}
            dataSource={invoicesData?.results || []}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'Žádné faktury' }}
          />
        </Space>
      ),
    },
    {
      key: 'files',
      label: `Soubory (${project.files_count})`,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Nahrát soubory</Button>
            </Upload>
            <Upload {...uploadFolderProps}>
              <Button icon={<FolderOpenOutlined />}>Nahrát složku</Button>
            </Upload>
          </Space>
          <Table
            columns={fileColumns}
            dataSource={files}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'Žádné soubory' }}
          />
        </Space>
      ),
    },
    {
      key: 'history',
      label: 'Historie',
      children: history ? (
        <Timeline
          items={history.map((item: ProjectHistory) => ({
            children: (
              <div>
                <Text strong>{item.action_display}</Text>
                <br />
                <Text>{item.description}</Text>
                <br />
                <Text type="secondary">
                  {item.user_name || 'Systém'} • {formatDateTime(item.created_at)}
                </Text>
              </div>
            ),
          }))}
        />
      ) : (
        <Spin />
      ),
    },
  ]

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <a onClick={() => navigate('/projects')}>Projekty</a> },
          { title: project.number },
        ]}
      />

      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Space direction="vertical" size={0}>
              <Space>
                <Title level={4} style={{ margin: 0 }}>
                  {project.number} - {project.name}
                </Title>
                <Tag color={statusColors[project.status]}>{project.status_display}</Tag>
              </Space>
              <Text type="secondary">{project.client_name}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
                Zpět
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/projects/${id}/edit`)}
              >
                Upravit
              </Button>
            </Space>
          </Col>
        </Row>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  )
}

export default ProjectDetailPage
