'use client'

import { useState, useRef } from 'react'
import { Modal, Button, message } from 'antd'
import { PlayCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import cdnConfig from '@/lib/cdn'

interface VideoGuideModalProps {
  visible: boolean
  onClose: () => void
}

export default function VideoGuideModal({ visible, onClose }: VideoGuideModalProps) {
  const [videoError, setVideoError] = useState(false)
  const [videoLoading, setVideoLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 视频加载成功
  const handleVideoLoad = () => {
    setVideoLoading(false)
    setVideoError(false)
  }

  // 视频加载失败
  const handleVideoError = () => {
    setVideoLoading(false)
    setVideoError(true)
    message.error('视频加载失败')
  }

  // 模态框关闭时重置视频状态
  const handleModalClose = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setVideoError(false)
    setVideoLoading(true)
    onClose()
  }

  // 模态框打开时自动播放视频
  const handleModalOpen = () => {
    if (visible && videoRef.current && !videoError) {
      // 延迟播放，确保模态框完全打开
      setTimeout(() => {
        videoRef.current?.play().catch(() => {
          // 自动播放失败是正常的，用户可以手动点击播放
        })
      }, 300)
    }
  }

  // 监听visible变化
  useState(() => {
    if (visible) {
      handleModalOpen()
    }
  })

  return (
    <Modal
      title="操作指导"
      open={visible}
      onCancel={handleModalClose}
      footer={[
        <Button key="close" onClick={handleModalClose}>
          关闭
        </Button>
      ]}
      width={800}
      centered
      destroyOnClose
    >
      <div className="video-container" style={{ textAlign: 'center' }}>
        {videoError ? (
          // 视频加载失败显示
          <div className="video-error" style={{ padding: '60px 20px' }}>
            <ExclamationCircleOutlined 
              style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} 
            />
            <div style={{ fontSize: '16px', color: '#666' }}>
              视频加载失败
            </div>
            <div style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
              请检查网络连接后重试
            </div>
          </div>
        ) : (
          // 视频播放区域
          <div className="video-wrapper" style={{ position: 'relative' }}>
            {videoLoading && (
              <div 
                className="video-loading" 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  fontSize: '16px',
                  color: '#666'
                }}
              >
                <PlayCircleOutlined style={{ fontSize: '48px', marginBottom: '8px' }} />
                <div>视频加载中...</div>
              </div>
            )}
            <video
              ref={videoRef}
              style={{
                width: '100%',
                maxWidth: '750px',
                height: 'auto',
                borderRadius: '8px',
                backgroundColor: '#000'
              }}
              controls
              preload="metadata"
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              src={cdnConfig.getIntroVideoUrl()}
            >
              您的浏览器不支持视频播放。
            </video>
          </div>
        )}
      </div>
    </Modal>
  )
}
