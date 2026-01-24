import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Select, Space, Typography, Tag, message } from 'antd'
import { BankOutlined, GlobalOutlined } from '@ant-design/icons'

import { companiesApi } from '../../api/companies'
import { useAuthStore } from '../../store/authStore'

const { Text } = Typography

const CompanySelector = () => {
  const { selectedCompanyId, selectedCompany, setSelectedCompany, user } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch company choices
  const { data: companies, isLoading } = useQuery({
    queryKey: ['company-choices'],
    queryFn: companiesApi.getCompanyChoices,
    enabled: user?.role === 'superadmin',
  })

  // Clear selected company if it no longer exists in the list
  useEffect(() => {
    if (companies && selectedCompanyId) {
      const companyExists = companies.some(c => c.id === selectedCompanyId)
      if (!companyExists) {
        setSelectedCompany(null)
      }
    }
  }, [companies, selectedCompanyId, setSelectedCompany])

  const handleChange = (value: number | undefined) => {
    if (value === undefined || value === null) {
      setSelectedCompany(null)
      message.info('Zobrazují se data všech firem')
    } else {
      const company = companies?.find(c => c.id === value)
      if (company) {
        setSelectedCompany(company)
        message.success(`Přepnuto na firmu: ${company.name}`)
      }
    }
    // Invalidate all queries to refetch with new company filter
    queryClient.invalidateQueries()
  }

  if (user?.role !== 'superadmin') {
    return null
  }

  return (
    <Space>
      <BankOutlined style={{ fontSize: 16, color: '#8c8c8c' }} />
      <Select
        placeholder="Všechny firmy"
        allowClear
        loading={isLoading}
        value={selectedCompanyId || undefined}
        onChange={handleChange}
        style={{ minWidth: 200 }}
        optionLabelProp="label"
        options={companies?.map(company => ({
          value: company.id,
          label: company.name,
          company,
        }))}
        optionRender={(option) => (
          <Space>
            <Text>{option.data.company.name}</Text>
            {option.data.company.ico && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({option.data.company.ico})
              </Text>
            )}
          </Space>
        )}
      />
      {selectedCompany ? (
        <Tag color="blue" icon={<BankOutlined />}>
          {selectedCompany.name}
        </Tag>
      ) : (
        <Tag icon={<GlobalOutlined />}>Všechny firmy</Tag>
      )}
    </Space>
  )
}

export default CompanySelector
