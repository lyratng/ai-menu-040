'use client'

import { useState } from 'react'
import { Card, Form, Input, Button, Space, Typography, Alert, message, InputNumber, Radio, Upload } from 'antd'
import { ArrowLeftOutlined, UserAddOutlined, UploadOutlined, PlayCircleOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import * as XLSX from 'xlsx'
import VideoGuideModal from './VideoGuideModal'

const { Title } = Typography

interface RegisterFormProps {
  onBack: () => void
}

interface RegisterFormData {
  canteenName: string
  password: string
  confirmPassword: string
  hotDishCount: number
  coldDishCount: number
  mealType: string
}

export default function RegisterForm({ onBack }: RegisterFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videoModalVisible, setVideoModalVisible] = useState(false)
  const [historicalMenus, setHistoricalMenus] = useState<string[][]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()

  const handleFileUpload = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          // 提取所有菜名（5列，无表头，提取所有非空菜名）
          const dishes: string[] = []
          
          // 遍历所有行和列，提取所有菜名
          jsonData.forEach((row: unknown) => {
            if (Array.isArray(row)) {
              // 遍历每行的所有列（A-E列，即索引0-4）
              for (let colIndex = 0; colIndex < 5; colIndex++) {
                const dish = row[colIndex]
                // 过滤空值并清理数据
                if (dish && typeof dish === 'string' && dish.trim() !== '') {
                  dishes.push(dish.trim())
                }
              }
            }
          })

          setHistoricalMenus(prev => [...prev, dishes])
          message.success(`文件 ${file.name} 解析成功，提取到 ${dishes.length} 道菜品`)
          resolve(true)
        } catch (error) {
          console.error('File parsing error:', error)
          message.error(`文件 ${file.name} 解析失败，请检查格式`)
          resolve(false)
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  const handleSubmit = async (values: RegisterFormData) => {
    if (fileList.length !== 4) {
      message.error('请上传4个历史菜单Excel文件')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          historicalMenus,
        }),
      })

      const data = await response.json()

      if (data.success) {
        message.success('注册成功！请登录系统')
        onBack() // 返回首页，用户可以登录
      } else {
        setError(data.error || '注册失败')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const uploadProps = {
    beforeUpload: async (file: File) => {
      if (fileList.length >= 4) {
        message.error('最多只能上传4个文件')
        return false
      }

      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel'
      if (!isExcel) {
        message.error('只能上传Excel文件')
        return false
      }

      const success = await handleFileUpload(file)
      if (success) {
        setFileList(prev => [...prev, {
          uid: file.name + Date.now(),
          name: file.name,
          status: 'done',
          originFileObj: file,
        } as UploadFile])
      }
      return false // 阻止自动上传
    },
    onRemove: (file: UploadFile) => {
      const index = fileList.findIndex(item => item.uid === file.uid)
      if (index > -1) {
        setFileList(prev => prev.filter(item => item.uid !== file.uid))
        setHistoricalMenus(prev => prev.filter((_, i) => i !== index))
      }
    },
    fileList,
  }

  return (
    <>
      <Card className="shadow-lg">
        <Space direction="vertical" size="large" className="w-full">
          <div className="flex items-center justify-between">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={onBack}
            >
              返回
            </Button>
            <Title level={3} className="mb-0">食堂注册</Title>
            <Button 
              type="text" 
              icon={<PlayCircleOutlined />}
              className="text-blue-500 hover:text-blue-600"
              onClick={() => setVideoModalVisible(true)}
            >
              操作指导
            </Button>
          </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError('')}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
          initialValues={{
            hotDishCount: 8,
            coldDishCount: 3,
            mealType: '定价餐'
          }}
        >
          <Form.Item
            name="canteenName"
            label="食堂名称"
            rules={[
              { required: true, message: '请输入食堂名称' },
              { min: 2, message: '食堂名称至少2个字符' },
            ]}
          >
            <Input placeholder="请输入食堂名称" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="hotDishCount"
              label="热菜数量"
              rules={[
                { required: true, message: '请输入热菜数量' },
                { type: 'number', min: 1, max: 20, message: '热菜数量应在1-20之间' },
              ]}
            >
              <InputNumber min={1} max={20} className="w-full" />
            </Form.Item>

            <Form.Item
              name="coldDishCount"
              label="凉菜数量"
              rules={[
                { required: true, message: '请输入凉菜数量' },
                { type: 'number', min: 1, max: 10, message: '凉菜数量应在1-10之间' },
              ]}
            >
              <InputNumber min={1} max={10} className="w-full" />
            </Form.Item>
          </div>

          <Form.Item
            name="mealType"
            label="餐制类型"
            rules={[{ required: true, message: '请选择餐制类型' }]}
          >
            <Radio.Group>
              <Radio value="定价餐">定价餐</Radio>
              <Radio value="自助餐">自助餐</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="历史菜单"
            help="请上传4个Excel文件，系统将自动解析菜品信息"
            rules={[{ required: true }]}
          >
            <Upload {...uploadProps} multiple>
              <Button icon={<UploadOutlined />}>
                上传历史菜单 ({fileList.length}/4)
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<UserAddOutlined />}
              className="w-full"
              disabled={fileList.length !== 4}
            >
              {loading ? '注册中...' : '完成注册'}
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
    
    {/* 视频指导弹窗 */}
    <VideoGuideModal 
      visible={videoModalVisible}
      onClose={() => setVideoModalVisible(false)}
    />
    </>
  )
}
