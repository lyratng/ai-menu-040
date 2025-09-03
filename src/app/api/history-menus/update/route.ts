/**
 * 更新历史菜单API路由
 * 
 * 允许用户动态更新已上传的历史菜单中的某一份
 * 支持单独更新4份历史菜单中的任意一份
 * 
 * 核心功能：
 * - 验证用户权限
 * - 验证菜单索引范围
 * - 更新指定位置的历史菜单
 * - 记录更新时间
 * - 立即生效，下次生成菜单时使用新数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

/**
 * 更新指定历史菜单
 * 
 * @param request HTTP请求对象
 * @returns 更新结果
 * 
 * 请求体参数：
 * - menuIndex: number (0-3) - 要更新的历史菜单索引
 * - dishes: string[] - 新的菜品列表
 * 
 * 安全措施：
 * - JWT身份验证
 * - 权限检查（只能更新自己食堂的菜单）
 * - 参数验证
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证身份
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as { canteenId: string }
    
    // 获取请求数据
    const body = await request.json()
    const { menuIndex, dishes } = body

    // 验证参数
    if (typeof menuIndex !== 'number' || menuIndex < 0 || menuIndex > 3) {
      return NextResponse.json(
        { error: '菜单索引必须在0-3之间' },
        { status: 400 }
      )
    }

    if (!Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json(
        { error: '菜品列表不能为空' },
        { status: 400 }
      )
    }

    // 验证菜品格式
    for (const dish of dishes) {
      if (typeof dish !== 'string' || dish.trim() === '') {
        return NextResponse.json(
          { error: '菜品名称必须为非空字符串' },
          { status: 400 }
        )
      }
    }

    // 获取当前食堂信息
    const canteen = await prisma.canteen.findUnique({
      where: { id: decoded.canteenId },
    })

    if (!canteen) {
      return NextResponse.json(
        { error: '食堂不存在' },
        { status: 404 }
      )
    }

    // 获取当前历史菜单数据
    const currentHistoricalMenus = canteen.historicalMenus as string[][]
    
    // 验证当前数据格式
    if (!Array.isArray(currentHistoricalMenus) || currentHistoricalMenus.length !== 4) {
      return NextResponse.json(
        { error: '历史菜单数据格式错误' },
        { status: 500 }
      )
    }

    // 创建新的历史菜单数组
    const newHistoricalMenus = [...currentHistoricalMenus]
    
    // 清理菜品名称（去除多余空格）
    const cleanedDishes = dishes.map(dish => dish.trim()).filter(dish => dish.length > 0)
    
    // 更新指定索引的菜单
    newHistoricalMenus[menuIndex] = cleanedDishes

    // 更新数据库
    const updatedCanteen = await prisma.canteen.update({
      where: { id: decoded.canteenId },
      data: {
        historicalMenus: newHistoricalMenus,
        updatedAt: new Date(), // 更新时间戳
      },
    })

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: `历史菜单 ${menuIndex + 1} 更新成功`,
      data: {
        menuIndex,
        newDishes: cleanedDishes,
        dishCount: cleanedDishes.length,
        updatedAt: updatedCanteen.updatedAt,
      },
    })

  } catch (error) {
    console.error('Update historical menu error:', error)
    
    // 处理JWT验证错误
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: '登录状态无效，请重新登录' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: '更新失败，请稍后重试' },
      { status: 500 }
    )
  }
}
