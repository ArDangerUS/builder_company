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
  Select,
  InputNumber,
  Switch,
  Spin,
  message,
  Typography,
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'

import { warehouseApi } from '../../api/warehouse'
import { settingsApi } from '../../api/settings'
import { MaterialCreateData, MaterialUnit } from '../../types'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

const UNIT_OPTIONS: { value: MaterialUnit; label: string }[] = [
  { value: 'ks', label: 'ks' },
  { value: 'm', label: 'm' },
  { value: 'm2', label: 'm2' },
  { value: 'm3', label: 'm3' },
  { value: 'kg', label: 'kg' },
  { value: 't', label: 't' },
  { value: 'l', label: 'l' },
  { value: 'bal', label: 'bal' },
  { value: 'rol', label: 'rol' },
  { value: 'sada', label: 'sada' },
]

const MaterialFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const isEdit = !!id

  const { data: material, isLoading: isLoadingMaterial } = useQuery({
    queryKey: ['material', id],
    queryFn: () => warehouseApi.getMaterial(Number(id)),
    enabled: isEdit,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => warehouseApi.getCategories({ is_active: true }),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => settingsApi.listSuppliers({ is_active: true }),
  })

  const createMutation = useMutation({
    mutationFn: warehouseApi.createMaterial,
    onSuccess: () => {
      message.success('Material byl vytvoren')
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      navigate('/warehouse/materials')
    },
    onError: () => {
      message.error('Chyba pri vytvareni materialu')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MaterialCreateData> }) =>
      warehouseApi.updateMaterial(id, data),
    onSuccess: () => {
      message.success('Material byl aktualizovan')
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      queryClient.invalidateQueries({ queryKey: ['material', id] })
      navigate('/warehouse/materials')
    },
    onError: () => {
      message.error('Chyba pri aktualizaci materialu')
    },
  })

  useEffect(() => {
    if (material) {
      form.setFieldsValue({
        ...material,
        purchase_price: parseFloat(material.purchase_price),
        min_stock: parseFloat(material.min_stock),
      })
    }
  }, [material, form])

  const handleSubmit = (values: MaterialCreateData) => {
    const data = {
      ...values,
      purchase_price: values.purchase_price?.toString(),
      min_stock: values.min_stock?.toString(),
    }

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data })
    } else {
      createMutation.mutate(data as MaterialCreateData)
    }
  }

  if (isEdit && isLoadingMaterial) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/warehouse/materials')}
          >
            Zpet
          </Button>
        </Col>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            {isEdit ? 'Upravit material' : 'Novy material'}
          </Title>
        </Col>
        <Col />
      </Row>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            unit: 'ks',
            is_active: true,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Nazev"
                rules={[{ required: true, message: 'Vyplnte nazev' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="sku"
                label="SKU / Kod"
                rules={[{ required: true, message: 'Vyplnte SKU' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="unit"
                label="Jednotka"
                rules={[{ required: true, message: 'Vyberte jednotku' }]}
              >
                <Select>
                  {UNIT_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="category"
                label="Kategorie"
                rules={[{ required: true, message: 'Vyberte kategorii' }]}
              >
                <Select placeholder="Vyberte kategorii">
                  {categories?.map((cat) => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="supplier" label="Dodavatel">
                <Select placeholder="Vyberte dodavatele" allowClear>
                  {suppliers?.map((sup: { id: number; name: string }) => (
                    <Option key={sup.id} value={sup.id}>
                      {sup.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="purchase_price"
                label="Nakupni cena"
                rules={[{ required: true, message: 'Vyplnte cenu' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  addonAfter="Kc"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="min_stock" label="Min. zasoba">
                <InputNumber style={{ width: '100%' }} min={0} precision={3} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="notes" label="Poznamky">
                <TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="is_active" label="Aktivni" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {isEdit ? 'Ulozit zmeny' : 'Vytvorit material'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default MaterialFormPage
