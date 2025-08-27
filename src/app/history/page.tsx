'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Layout, Card, Space, Typography, Table, message, Spin, 
  Button, Tabs, Tag, Collapse
} from 'antd'
import { 
  ArrowLeftOutlined, BookFilled, HistoryOutlined, 
  FileTextOutlined, CalendarOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { WeekMenu } from '@/types'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { Panel } = Collapse

interface HistoryData {
  canteenName: string
  uploadedMenus: string[][] // 上传的历史菜单
  generatedMenus: Array<{
    id: string
    weekMenu: WeekMenu
    generationParams: object
    createdAt: string
  }>
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HistoryData | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchHistoryMenus()
  }, [fetchHistoryMenus])

  const fetchHistoryMenus = useCallback(async () => {
    try {
      const response = await fetch('/api/history-menus')
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      } else {
        message.error('获取历史菜单失败')
        router.push('/')
      }
    } catch (error) {
      console.error('Fetch history menus failed:', error)
      message.error('网络错误')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [router])

  const goBack = () => {
    router.push('/dashboard')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <Layout className="min-h-screen">
      <Header className="bg-blue-600 shadow-sm border-b">
        <div className="flex items-center justify-between">
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              style={{ color: 'white', border: 'none' }}
              className="hover:bg-blue-500"
              onClick={goBack}
            >
              返回主页
            </Button>
            <HistoryOutlined className="text-white text-xl" />
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              {data.canteenName} - 历史菜单
            </Title>
          </Space>
        </div>
      </Header>

      <Content className="p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultActiveKey="uploaded" size="large">
            {/* 上传的历史菜单 */}
            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  上传的历史菜单 ({data.uploadedMenus.length})
                </span>
              }
              key="uploaded"
            >
              <Card>
                <Paragraph type="secondary" className="mb-4">
                  这些是您在注册时上传的4个Excel菜单文件，系统会参考这些菜单来生成符合您食堂风格的新菜单。
                </Paragraph>
                
                {data.uploadedMenus.length > 0 ? (
                  <Collapse accordion>
                    {data.uploadedMenus.map((menu, index) => (
                      <Panel
                        header={
                          <Space>
                            <Tag color="blue">菜单 {index + 1}</Tag>
                            <Text>共 {menu.length} 道菜</Text>
                          </Space>
                        }
                        key={index}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {menu.map((dish, dishIndex) => (
                            <div
                              key={dishIndex}
                              className="p-2 bg-gray-50 rounded border text-sm"
                            >
                              {dish}
                            </div>
                          ))}
                        </div>
                      </Panel>
                    ))}
                  </Collapse>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无上传的历史菜单
                  </div>
                )}
              </Card>
            </TabPane>

            {/* 生成的菜单历史 */}
            <TabPane
              tab={
                <span>
                  <CalendarOutlined />
                  生成记录 ({data.generatedMenus.length})
                </span>
              }
              key="generated"
            >
              <Space direction="vertical" size="large" className="w-full">
                {data.generatedMenus.length > 0 ? (
                  data.generatedMenus.map((menu, index) => (
                    <Card
                      key={menu.id}
                      title={
                        <Space>
                          <BookFilled className="text-blue-500" />
                          <span>第 {index + 1} 次生成</span>
                          <Tag color="green">{formatDate(menu.createdAt)}</Tag>
                        </Space>
                      }
                    >
                      <GeneratedMenuTable weekMenu={menu.weekMenu} />
                    </Card>
                  ))
                ) : (
                  <Card>
                    <div className="text-center py-8 text-gray-500">
                      暂无生成的菜单记录
                    </div>
                  </Card>
                )}
              </Space>
            </TabPane>
          </Tabs>
        </div>
      </Content>
    </Layout>
  )
}

interface GeneratedMenuTableProps {
  weekMenu: WeekMenu
}

function GeneratedMenuTable({ weekMenu }: GeneratedMenuTableProps) {
  const columns = [
    {
      title: '周一',
      dataIndex: 'monday',
      key: 'monday',
      render: (dish: string) => (
        <div className="text-sm">
          {dish}
        </div>
      )
    },
    {
      title: '周二',
      dataIndex: 'tuesday',
      key: 'tuesday',
      render: (dish: string) => (
        <div className="text-sm">
          {dish}
        </div>
      )
    },
    {
      title: '周三',
      dataIndex: 'wednesday',
      key: 'wednesday',
      render: (dish: string) => (
        <div className="text-sm">
          {dish}
        </div>
      )
    },
    {
      title: '周四',
      dataIndex: 'thursday',
      key: 'thursday',
      render: (dish: string) => (
        <div className="text-sm">
          {dish}
        </div>
      )
    },
    {
      title: '周五',
      dataIndex: 'friday',
      key: 'friday',
      render: (dish: string) => (
        <div className="text-sm">
          {dish}
        </div>
      )
    },
  ]

  // 计算最大行数
  const maxRows = Math.max(
    weekMenu.monday.length,
    weekMenu.tuesday.length,
    weekMenu.wednesday.length,
    weekMenu.thursday.length,
    weekMenu.friday.length
  )

  const dataSource = []
  for (let i = 0; i < maxRows; i++) {
    dataSource.push({
      key: i,
      monday: weekMenu.monday[i] || '',
      tuesday: weekMenu.tuesday[i] || '',
      wednesday: weekMenu.wednesday[i] || '',
      thursday: weekMenu.thursday[i] || '',
      friday: weekMenu.friday[i] || '',
    })
  }

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      bordered
      size="small"
      className="mb-4"
    />
  )
}
