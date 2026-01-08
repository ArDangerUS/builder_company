import { useState, useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Typography,
  theme,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  InboxOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'

import { useAuthStore } from '../../store/authStore'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { token } = theme.useToken()

  // Check user permissions
  const isAdmin = user?.role === 'admin'
  const canViewReports = ['admin', 'manager', 'accountant'].includes(user?.role || '')
  const canViewInvoices = ['admin', 'manager', 'accountant'].includes(user?.role || '')

  const menuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [
      {
        key: '/',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
      {
        key: '/projects',
        icon: <ProjectOutlined />,
        label: 'Projekty',
      },
      {
        key: 'warehouse',
        icon: <InboxOutlined />,
        label: 'Sklad',
        children: [
          {
            key: '/warehouse/materials',
            icon: <AppstoreOutlined />,
            label: 'Materiály',
          },
          {
            key: '/warehouse/reports',
            icon: <UnorderedListOutlined />,
            label: 'Přehled skladu',
          },
        ],
      },
    ]

    // Invoices - visible to admin, manager, accountant
    if (canViewInvoices) {
      items.push({
        key: '/invoices',
        icon: <FileTextOutlined />,
        label: 'Faktury',
      })
    }

    // Reports - visible to admin, manager, accountant
    if (canViewReports) {
      items.push({
        key: '/reports',
        icon: <BarChartOutlined />,
        label: 'Reporty',
      })
    }

    items.push({ type: 'divider' })

    // Users - only admin
    if (isAdmin) {
      items.push({
        key: '/users',
        icon: <TeamOutlined />,
        label: 'Uživatelé',
      })
    }

    items.push({
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Nastavení',
    })

    return items
  }, [isAdmin, canViewReports, canViewInvoices])

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profil',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Odhlásit se',
      danger: true,
    },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const handleUserMenuClick: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'logout') {
      await logout()
      navigate('/login')
    } else if (key === 'profile') {
      navigate('/settings')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text strong style={{ fontSize: collapsed ? 14 : 18 }}>
            {collapsed ? 'BC' : 'Builder Company'}
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['warehouse']}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', fontSize: 18 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={['click']}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <Avatar icon={<UserOutlined />} src={user?.photo} />
              <div style={{ lineHeight: 1.2 }}>
                <Text strong>{user?.full_name}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {user?.position || user?.role}
                </Text>
              </div>
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: 24,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
