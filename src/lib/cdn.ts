/**
 * CDN配置文件
 * 
 * 管理阿里云OSS资源的访问配置，包括视频、图片等静态资源。
 * 提供统一的URL生成和路径管理功能。
 */

interface CDNConfig {
  CDN_BASE_URL: string
  VIDEO_PATHS: {
    INTRO: string
  }
  getVideoUrl: (path: string, filename: string) => string
  getIntroVideoUrl: () => string
}

const cdnConfig: CDNConfig = {
  // 阿里云OSS CDN基础URL
  CDN_BASE_URL: 'https://monsoon.oss-cn-beijing.aliyuncs.com',
  
  // 视频路径配置
  VIDEO_PATHS: {
    INTRO: '/videos/intro'
  },
  
  /**
   * 获取完整的视频URL
   * @param path 视频路径
   * @param filename 文件名
   * @returns 完整的视频URL
   */
  getVideoUrl(path: string, filename: string): string {
    return `${this.CDN_BASE_URL}${path}/${filename}`
  },
  
  /**
   * 获取操作指导视频URL
   * @returns 操作指导视频的完整URL
   */
  getIntroVideoUrl(): string {
    return this.getVideoUrl(this.VIDEO_PATHS.INTRO, 'canteen-menu-guide.mp4')
  }
}

export default cdnConfig
