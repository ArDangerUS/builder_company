import { useState } from 'react'
import { Tabs, Typography, Card } from 'antd'
import {
  SettingOutlined,
  TeamOutlined,
  TagsOutlined,
} from '@ant-design/icons'

import CompanySettingsTab from './CompanySettingsTab'
import SuppliersTab from './SuppliersTab'
import WorkTypesTab from './WorkTypesTab'
import { useAuthStore } from '../../store/authStore'

const { Title } = Typography

const SettingsPage = () => {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('company')

  const isAdmin = user?.role === 'admin'

  const items = [
    {
      key: 'company',
      label: (
        <span>
          <SettingOutlined />
          Firma
        </span>
      ),
      children: <CompanySettingsTab isAdmin={isAdmin} />,
    },
    {
      key: 'suppliers',
      label: (
        <span>
          <TeamOutlined />
          Dodavatelé
        </span>
      ),
      children: <SuppliersTab />,
    },
    {
      key: 'workTypes',
      label: (
        <span>
          <TagsOutlined />
          Typy prací
        </span>
      ),
      children: <WorkTypesTab />,
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Nastavení</Title>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          size="large"
        />
      </Card>
    </div>
  )
}

export default SettingsPage
