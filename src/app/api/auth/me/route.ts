/**
 * 用户身份验证API路由
 * 
 * 验证当前用户的登录状态并返回用户信息。
 * 通过JWT Token验证用户身份，确保API访问的安全性。
 * 
 * 核心功能：
 * - JWT Token验证
 * - 用户身份确认
 * - 食堂信息查询
 * - 会话状态检查
 * 
 * 安全特性：
 * - Token过期自动失效
 * - 用户不存在时返回404
 * - 不返回敏感信息（密码、历史菜单等）
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

/**
 * 获取当前登录用户信息
 * 
 * @returns 成功返回用户基本信息，失败返回认证错误
 * 
 * 验证流程：
 * 1. 从Cookie中提取JWT Token
 * 2. 验证Token有效性和过期时间
 * 3. 解析Token获取用户ID
 * 4. 查询数据库确认用户存在
 * 5. 返回用户基本信息（排除敏感数据）
 * 
 * 使用场景：
 * - 页面加载时检查登录状态
 * - API请求前的权限验证
 * - 自动登录状态维护
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    console.log('Auth check - Token found:', !!token)
    
    if (!token) {
      console.log('Auth check failed - No token found')
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // 验证JWT token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as { canteenId: string }
    
    // 获取食堂信息
    const canteen = await prisma.canteen.findUnique({
      where: { id: decoded.canteenId },
      select: {
        id: true,
        canteenName: true,
        hotDishCount: true,
        coldDishCount: true,
        mealType: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!canteen) {
      return NextResponse.json(
        { error: '食堂不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      canteen,
    })

  } catch (error) {
    console.error('Auth verification failed:', error)
    return NextResponse.json(
      { error: '认证失败' },
      { status: 401 }
    )
  }
}
