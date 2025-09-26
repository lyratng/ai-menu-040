'use client'

import { useState } from 'react'
import { Card, Button, Space, Typography, Layout } from 'antd'
import { BookFilled, LoginOutlined, UserAddOutlined, PlayCircleOutlined } from '@ant-design/icons'
import LoginForm from '../components/LoginForm'
import RegisterForm from '../components/RegisterForm'
import VideoGuideModal from '../components/VideoGuideModal'

const { Title, Paragraph } = Typography
const { Content } = Layout

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'register'>('home')
  const [videoModalVisible, setVideoModalVisible] = useState(false)

  return (
    <Layout className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Content className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {currentView === 'home' && (
            <Card className="text-center shadow-lg">
              <Space direction="vertical" size="large" className="w-full">
                <div>
                  <BookFilled className="text-6xl text-blue-500 mb-4" />
                  <Title level={2} className="mb-2">团餐菜单生成工具</Title>
                  <Paragraph className="text-gray-600">
                    AI驱动的智能菜单规划系统，为团餐公司提供专业的一周菜单生成服务
                  </Paragraph>
                </div>
                
                <Space direction="vertical" className="w-full">
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<LoginOutlined />}
                    className="w-full"
                    onClick={() => setCurrentView('login')}
                  >
                    登录系统
                  </Button>
                  <Button 
                    size="large" 
                    icon={<UserAddOutlined />}
                    className="w-full"
                    onClick={() => setCurrentView('register')}
                  >
                    新食堂注册
                  </Button>
                </Space>
                
                {/* 操作指导按钮 */}
                <Button 
                  type="link" 
                  icon={<PlayCircleOutlined />}
                  className="text-blue-500 hover:text-blue-600"
                  onClick={() => setVideoModalVisible(true)}
                >
                  操作指导
                </Button>
              </Space>
            </Card>
          )}

          {currentView === 'login' && (
            <LoginForm onBack={() => setCurrentView('home')} />
          )}

          {currentView === 'register' && (
            <RegisterForm onBack={() => setCurrentView('home')} />
          )}
        </div>
      </Content>
      
      {/* 视频指导弹窗 */}
      <VideoGuideModal 
        visible={videoModalVisible}
        onClose={() => setVideoModalVisible(false)}
      />
    </Layout>
  )
}