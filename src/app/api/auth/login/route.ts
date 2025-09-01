/**
 * 用户登录API路由
 * 
 * 处理食堂用户的登录认证，验证凭据后生成JWT Token并设置安全Cookie。
 * 采用时间恒定的密码验证算法防止时序攻击，确保登录安全性。
 * 
 * 安全特性：
 * - bcrypt密码哈希验证
 * - JWT Token生成（7天有效期）
 * - HTTP-Only Cookie防XSS
 * - Secure Cookie（生产环境）
 * - SameSite保护
 * 
 * @author 认证安全团队
 * @version 1.0.0
 * @lastModified 2025-09-01
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateCanteen } from '@/lib/auth'
import jwt from 'jsonwebtoken'

/**
 * 处理用户登录请求
 * 
 * @param request HTTP请求对象，包含食堂名称和密码
 * @returns 登录成功返回用户信息和设置认证Cookie，失败返回错误信息
 * 
 * 处理流程：
 * 1. 验证请求参数完整性
 * 2. 调用认证服务验证用户凭据
 * 3. 生成JWT Token包含用户标识
 * 4. 设置安全Cookie存储Token
 * 5. 返回用户信息（不含敏感数据）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { canteenName, password } = body

    if (!canteenName || !password) {
      return NextResponse.json(
        { error: '请输入食堂名称和密码' },
        { status: 400 }
      )
    }

    // 验证用户凭据 - 使用时间恒定的bcrypt比较，防止时序攻击
    const canteen = await authenticateCanteen(canteenName, password)
    
    if (!canteen) {
      // 统一错误信息，不暴露用户是否存在，防止用户枚举攻击
      return NextResponse.json(
        { error: '食堂名称或密码错误' },
        { status: 401 }
      )
    }

    // 创建JWT token - 包含最小必要信息，7天有效期平衡安全性和用户体验
    const token = jwt.sign(
      { canteenId: canteen.id, canteenName: canteen.canteenName },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    console.log('Login successful, setting cookie for:', canteen.canteenName)
    
    // 创建响应并设置cookie - 返回用户信息（已排除密码等敏感数据）
    const response = NextResponse.json({
      success: true,
      canteen,
    })

    // 设置安全Cookie存储JWT Token
    // httpOnly: 防止XSS攻击，JavaScript无法访问
    // secure: 生产环境强制HTTPS传输
    // sameSite: 防止CSRF攻击
    // maxAge: 7天有效期，与JWT过期时间一致
    response.cookies.set('auth-token', token, {
      httpOnly: true,                              // 防XSS攻击
      secure: process.env.NODE_ENV === 'production', // 生产环境HTTPS
      sameSite: 'lax',                            // 防CSRF攻击
      maxAge: 60 * 60 * 24 * 7,                   // 7天有效期
      path: '/',                                  // 全站可用
    })

    console.log('Cookie set successfully')
    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
