'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Layout, Card, Space, Typography, Table, message, Spin, 
  Button, Tabs, Tag, Collapse
} from 'antd'
import { 
  ArrowLeftOutlined, BookFilled, HistoryOutlined, 
  FileTextOutlined, CalendarOutlined, UploadOutlined,
  LoadingOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import type { WeekMenu, GenerationParams } from '@/types'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { Panel } = Collapse

interface HistoryData {
  canteenName: string
  uploadedMenus: string[][] // 上传的历史菜单
  updatedAt: string // 历史菜单最后更新时间
  generatedMenus: Array<{
    id: string
    weekMenu: WeekMenu
    generationParams: GenerationParams
    createdAt: string
  }>
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HistoryData | null>(null)
  const [uploadingStates, setUploadingStates] = useState<boolean[]>([false, false, false, false]) // 4个菜单的上传状态
  const [recentlyUpdated, setRecentlyUpdated] = useState<number | null>(null) // 最近更新的菜单索引
  const router = useRouter()

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

  useEffect(() => {
    fetchHistoryMenus()
  }, [fetchHistoryMenus])

  const goBack = () => {
    router.push('/dashboard')
  }

  // 处理Excel文件上传和解析
  const handleFileUpload = async (file: File, menuIndex: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          // 提取所有菜名（A-E列，过滤空值）
          const dishes: string[] = []
          jsonData.forEach((row: unknown) => {
            if (Array.isArray(row)) {
              for (let colIndex = 0; colIndex < 5; colIndex++) {
                const dish = row[colIndex]
                if (dish && typeof dish === 'string' && dish.trim() !== '') {
                  dishes.push(dish.trim())
                }
              }
            }
          })

          if (dishes.length === 0) {
            message.error('文件中没有找到有效的菜品信息')
            resolve(false)
            return
          }

          // 调用API更新历史菜单
          const success = await updateHistoricalMenu(menuIndex, dishes)
          resolve(success)
        } catch (error) {
          console.error('File parsing error:', error)
          message.error(`文件解析失败，请检查格式`)
          resolve(false)
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // 调用API更新历史菜单
  const updateHistoricalMenu = async (menuIndex: number, dishes: string[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/history-menus/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menuIndex,
          dishes,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        // 更新本地数据
        if (data) {
          const newData = { ...data }
          newData.uploadedMenus[menuIndex] = dishes
          newData.updatedAt = result.data.updatedAt
          setData(newData)
        }
        
        // 显示成功提示和标记
        message.success(`历史菜单 ${menuIndex + 1} 更新成功！解析到 ${dishes.length} 道菜品`)
        setRecentlyUpdated(menuIndex)
        
        // 3秒后清除"刚刚更新"标记
        setTimeout(() => {
          setRecentlyUpdated(null)
        }, 3000)
        
        return true
      } else {
        message.error(result.error || '更新失败')
        return false
      }
    } catch (error) {
      console.error('Update historical menu error:', error)
      message.error('网络错误，更新失败')
      return false
    }
  }

  // 处理重新上传按钮点击
  const handleReupload = (menuIndex: number) => {
    // 检查是否有其他菜单正在上传
    if (uploadingStates.some(state => state)) {
      message.warning('请等待当前上传完成')
      return
    }

    // 创建文件选择器
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // 验证文件类型
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel'
      if (!isExcel) {
        message.error('只能上传Excel文件(.xlsx 或 .xls)')
        return
      }

      // 设置上传状态
      setUploadingStates(prev => {
        const newStates = [...prev]
        newStates[menuIndex] = true
        return newStates
      })

      // 上传文件
      await handleFileUpload(file, menuIndex)
      
      // 重置上传状态
      setUploadingStates(prev => {
        const newStates = [...prev]
        newStates[menuIndex] = false
        return newStates
      })
    }
    
    input.click()
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
                <div className="mb-4">
                  <Paragraph type="secondary">
                    这些是您的历史菜单文件，系统会参考这些菜单来生成符合您食堂风格的新菜单。
                  </Paragraph>
                  {data.updatedAt && (
                    <Text type="secondary" className="text-xs">
                      最后更新时间：{formatDate(data.updatedAt)}
                    </Text>
                  )}
                </div>
                
                {data.uploadedMenus.length > 0 ? (
                  <Collapse accordion>
                    {data.uploadedMenus.map((menu, index) => (
                      <Panel
                        header={
                          <div className="flex items-center justify-between w-full">
                            <Space>
                              <Tag color="blue">菜单 {index + 1}</Tag>
                              <Text>共 {menu.length} 道菜</Text>
                              {recentlyUpdated === index && (
                                <Tag color="green" icon={<CheckCircleOutlined />}>
                                  刚刚更新
                                </Tag>
                              )}
                            </Space>
                            <Button
                              type="primary"
                              size="small"
                              icon={uploadingStates[index] ? <LoadingOutlined /> : <UploadOutlined />}
                              loading={uploadingStates[index]}
                              disabled={uploadingStates.some(state => state)}
                              onClick={(e) => {
                                e.stopPropagation() // 阻止触发面板展开/折叠
                                handleReupload(index)
                              }}
                              className="mr-4"
                            >
                              {uploadingStates[index] ? '上传中...' : '重新上传'}
                            </Button>
                          </div>
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