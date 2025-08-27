'use client'

import { useState } from 'react'
import { Card, Form, Input, Button, Space, Typography, Alert, message } from 'antd'
import { ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Title } = Typography

interface LoginFormProps {
  onBack: () => void
}

interface LoginFormData {
  canteenName: string
  password: string
}

export default function LoginForm({ onBack }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [form] = Form.useForm()

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (data.success) {
        message.success('登录成功！')
        // 跳转到主页面
        router.push('/dashboard')
      } else {
        setError(data.error || '登录失败')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
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
          <Title level={3} className="mb-0">食堂登录</Title>
          <div></div>
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
        >
          <Form.Item
            name="canteenName"
            label="食堂名称"
            rules={[
              { required: true, message: '请输入食堂名称' },
              { min: 2, message: '食堂名称至少2个字符' },
            ]}
          >
            <Input placeholder="请输入您的食堂名称" />
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

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<LoginOutlined />}
              className="w-full"
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  )
}
