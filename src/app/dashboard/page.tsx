/**
 * 团餐菜单生成工具 - 主控制面板
 * 
 * 这是系统的核心页面，提供完整的菜单生成和管理功能。
 * 主要功能包括：
 * 1. 用户身份验证和会话管理
 * 2. 菜单生成参数配置界面
 * 3. AI菜单生成调用和结果展示
 * 4. Excel导出功能
 * 5. 历史记录访问
 * 
 * 组件架构：
 * - Dashboard: 主组件，管理整体状态和业务逻辑
 * - MenuTable: 子组件，负责菜单表格展示
 * 
 * 状态管理：
 * - canteenInfo: 当前登录食堂的基础信息
 * - weekMenu: 生成的一周菜单数据
 * - loading/generating: 各种加载状态控制
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Layout, Card, Form, Button, Space, Typography, Select, InputNumber, 
  Checkbox, Radio, Table, message, Spin 
} from 'antd'
import { 
  BookFilled, LogoutOutlined, DownloadOutlined, 
  ReloadOutlined, HistoryOutlined 
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { GenerationParams, WeekMenu } from '@/types'
import * as XLSX from 'xlsx'

const { Header, Content } = Layout
const { Title, Text } = Typography
const { Option } = Select

interface CanteenInfo {
  id: string
  canteenName: string
  hotDishCount: number
  coldDishCount: number
  mealType: string
}

export default function Dashboard() {
  const [canteenInfo, setCanteenInfo] = useState<CanteenInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [weekMenu, setWeekMenu] = useState<WeekMenu | null>(null)
  const [form] = Form.useForm()
  const router = useRouter()

  /**
   * 检查用户登录状态
   * 
   * 通过调用 /api/auth/me 验证当前用户的登录状态。
   * 如果用户未登录或Token过期，会自动重定向到首页。
   * 
   * 使用useCallback优化性能，避免不必要的重复请求。
   */
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setCanteenInfo(data.canteen)
      } else {
        // 认证失败，重定向到登录页
        router.push('/')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  /**
   * 菜单生成核心函数
   * 
   * 处理用户提交的菜单生成请求，包括：
   * 1. 参数类型转换和验证
   * 2. API调用和响应处理
   * 3. 用户界面状态更新
   * 4. 错误处理和用户提示
   * 
   * @param values 来自Ant Design Form的表单数据
   */
  const generateMenu = async (values: Record<string, unknown>) => {
    if (!canteenInfo) return

    setGenerating(true)
    try {
      // 构建符合API要求的参数对象
      // 注意：Form返回的数据类型需要显式转换
      const params: GenerationParams = {
        mainMeatCount: values.mainMeatCount as number,
        halfMeatCount: values.halfMeatCount as number,
        vegetarianCount: values.vegetarianCount as number,
        staffSituation: values.staffSituation as 'abundant' | 'scarce',
        historicalRatio: values.historicalRatio as number,
        equipmentShortage: (values.equipmentShortage as string[]) || [],
        spicyLevel: values.spicyLevel as 'none' | 'mild' | 'medium',
        flavorDiversity: (values.flavorDiversity as boolean) || false,
        workRatio: values.workRatio as string,
        ingredientDiversity: values.ingredientDiversity as string,
      }

      // 调用菜单生成API
      const response = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canteenId: canteenInfo.id,
          params,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setWeekMenu(data.menu)
        message.success('菜单生成成功！')
      } else {
        message.error(data.error || '菜单生成失败')
      }
    } catch (error) {
      console.error('Menu generation failed:', error)
      message.error('网络错误，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }

  /**
   * Excel导出功能
   * 
   * 将生成的一周菜单导出为Excel文件，格式化为厨房可直接使用的表格。
   * 文件结构：横轴为周一到周五，纵轴为热菜和凉菜分区。
   * 
   * 数据处理逻辑：
   * 1. 构建二维数组格式的表格数据
   * 2. 热菜和凉菜分别成组显示
   * 3. 使用XLSX库生成Excel文件
   * 4. 自动下载到用户电脑
   */
  const exportToExcel = () => {
    if (!weekMenu || !canteenInfo) return

    const data = []

    // 创建表头 - 第一行为周一到周五
    data.push(['', '周一', '周二', '周三', '周四', '周五'])

    // 添加热菜区域
    // 每一行代表一个菜品位置，第一行标注"热菜"
    for (let i = 0; i < canteenInfo.hotDishCount; i++) {
      const rowLabel = i === 0 ? '热菜' : ''  // 只在第一行显示分类标签
      data.push([
        rowLabel,
        weekMenu.monday[i] || '',
        weekMenu.tuesday[i] || '',
        weekMenu.wednesday[i] || '',
        weekMenu.thursday[i] || '',
        weekMenu.friday[i] || '',
      ])
    }

    // 添加凉菜区域
    // 凉菜在菜单数组中位于热菜之后
    for (let i = 0; i < canteenInfo.coldDishCount; i++) {
      const rowLabel = i === 0 ? '凉菜' : ''  // 只在第一行显示分类标签
      const hotIndex = canteenInfo.hotDishCount  // 凉菜的起始索引
      data.push([
        rowLabel,
        weekMenu.monday[hotIndex + i] || '',
        weekMenu.tuesday[hotIndex + i] || '',
        weekMenu.wednesday[hotIndex + i] || '',
        weekMenu.thursday[hotIndex + i] || '',
        weekMenu.friday[hotIndex + i] || '',
      ])
    }

    // 使用XLSX库生成Excel文件
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '菜单')

    // 生成带时间戳的文件名，便于区分不同批次的菜单
    const fileName = `${canteenInfo.canteenName}_菜单_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
    message.success('菜单已导出到Excel文件')
  }

  const getDefaultValues = () => {
    if (!canteenInfo) return {}
    
    const hotCount = canteenInfo.hotDishCount
    const avgCount = Math.ceil(hotCount / 3)
    
    return {
      mainMeatCount: avgCount,
      halfMeatCount: avgCount,
      vegetarianCount: hotCount - (avgCount * 2),
      staffSituation: 'scarce',
      historicalRatio: 30,
      equipmentShortage: [],
      spicyLevel: 'mild',
      flavorDiversity: false,
      workRatio: '无要求',
      ingredientDiversity: '无要求',
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!canteenInfo) {
    return null
  }

  return (
    <Layout className="min-h-screen">
      <Header className="bg-blue-600 shadow-sm border-b">
        <div className="flex items-center justify-between">
          <Space>
            <BookFilled className="text-white text-xl" />
            <Title level={4} className="mb-0" style={{ color: 'white', margin: 0 }}>
              {canteenInfo.canteenName} - 菜单生成系统
            </Title>
          </Space>
          <Space>
            <Button 
              icon={<HistoryOutlined />} 
              type="text"
              style={{ color: 'white', border: 'none' }}
              className="hover:bg-blue-500"
              onClick={() => router.push('/history')}
            >
              历史菜单
            </Button>
            <Button 
              icon={<LogoutOutlined />} 
              type="text" 
              style={{ color: 'white', border: 'none' }}
              className="hover:bg-blue-500"
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </Space>
        </div>
      </Header>

      <Content className="p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 食堂信息 */}
          <Card>
            <Space>
              <Text strong>餐制类型：</Text>
              <Text>{canteenInfo.mealType}</Text>
              <Text strong>热菜数量：</Text>
              <Text>{canteenInfo.hotDishCount}道</Text>
              <Text strong>凉菜数量：</Text>
              <Text>{canteenInfo.coldDishCount}道</Text>
            </Space>
          </Card>

          {/* 生成参数配置 */}
          <Card title="菜单生成配置">
            <Form
              form={form}
              layout="vertical"
              onFinish={generateMenu}
              initialValues={getDefaultValues()}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Form.Item
                  name="mainMeatCount"
                  label="主荤菜数量"
                  rules={[{ required: true, message: '请设置主荤菜数量' }]}
                >
                  <InputNumber min={1} max={canteenInfo.hotDishCount} className="w-full" />
                </Form.Item>

                <Form.Item
                  name="halfMeatCount"
                  label="半荤菜数量"
                  rules={[{ required: true, message: '请设置半荤菜数量' }]}
                >
                  <InputNumber min={1} max={canteenInfo.hotDishCount} className="w-full" />
                </Form.Item>

                <Form.Item
                  name="vegetarianCount"
                  label="素菜数量"
                  rules={[{ required: true, message: '请设置素菜数量' }]}
                >
                  <InputNumber min={1} max={canteenInfo.hotDishCount} className="w-full" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="staffSituation" label="人员配置">
                  <Radio.Group>
                    <Radio value="scarce">紧缺</Radio>
                    <Radio value="abundant">宽裕</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item name="historicalRatio" label="历史菜占比(%)">
                  <Select>
                    <Option value={0}>0%</Option>
                    <Option value={30}>30%</Option>
                    <Option value={50}>50%</Option>
                    <Option value={70}>70%</Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item name="equipmentShortage" label="设备紧缺情况">
                <Checkbox.Group>
                  <Checkbox value="蒸屉">蒸屉紧缺</Checkbox>
                  <Checkbox value="烤箱">烤箱紧缺</Checkbox>
                  <Checkbox value="炒锅">炒锅紧缺</Checkbox>
                  <Checkbox value="炖锅">炖锅紧缺</Checkbox>
                  <Checkbox value="烧炉">烧炉紧缺</Checkbox>
                </Checkbox.Group>
              </Form.Item>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="spicyLevel" label="辣味要求">
                  <Radio.Group>
                    <Radio value="none">不辣</Radio>
                    <Radio value="mild">微辣</Radio>
                    <Radio value="medium">中辣</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item name="flavorDiversity" valuePropName="checked" label=" ">
                  <Checkbox>每餐风味不少于5种</Checkbox>
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="workRatio" label="菜品做工比例">
                  <Select>
                    <Option value="无要求">无要求</Option>
                    <Option value="1:1:1">现炒:一锅出:半成品 = 1:1:1</Option>
                    <Option value="1:0.5:0.5">现炒:一锅出:半成品 = 1:0.5:0.5</Option>
                    <Option value="0.5:1:0.5">现炒:一锅出:半成品 = 0.5:1:0.5</Option>
                    <Option value="0.5:0.5:1">现炒:一锅出:半成品 = 0.5:0.5:1</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="ingredientDiversity" label="原材料多样性">
                  <Select>
                    <Option value="无要求">无要求</Option>
                    <Option value="4种">不少于4种</Option>
                    <Option value="5种">不少于5种</Option>
                    <Option value="6种">不少于6种</Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={generating}
                  icon={<BookFilled />}
                  size="large"
                >
                  {generating ? '菜单生成中...' : '生成菜单'}
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 菜单展示 */}
          {weekMenu && (
            <Card 
              title="本周菜单"
              extra={
                <Space>
                  <Button 
                    icon={<DownloadOutlined />} 
                    onClick={exportToExcel}
                  >
                    导出Excel
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={() => form.submit()}
                    loading={generating}
                  >
                    重新生成
                  </Button>
                </Space>
              }
            >
              <MenuTable 
                weekMenu={weekMenu} 
                hotDishCount={canteenInfo.hotDishCount}
                coldDishCount={canteenInfo.coldDishCount}
              />
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  )
}

interface MenuTableProps {
  weekMenu: WeekMenu
  hotDishCount: number
  coldDishCount: number
}

function MenuTable({ weekMenu, hotDishCount, coldDishCount }: MenuTableProps) {
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (text: string, record: Record<string, unknown>, index: number) => {
        if (index < hotDishCount) {
          return index === 0 ? '热菜' : ''
        } else {
          return index === hotDishCount ? '凉菜' : ''
        }
      }
    },
    {
      title: '周一',
      dataIndex: 'monday',
      key: 'monday',
    },
    {
      title: '周二',
      dataIndex: 'tuesday',
      key: 'tuesday',
    },
    {
      title: '周三',
      dataIndex: 'wednesday',
      key: 'wednesday',
    },
    {
      title: '周四',
      dataIndex: 'thursday',
      key: 'thursday',
    },
    {
      title: '周五',
      dataIndex: 'friday',
      key: 'friday',
    },
  ]

  const dataSource = []
  const maxRows = hotDishCount + coldDishCount

  for (let i = 0; i < maxRows; i++) {
    dataSource.push({
      key: i,
      type: i < hotDishCount ? '热菜' : '凉菜',
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
    />
  )
}
