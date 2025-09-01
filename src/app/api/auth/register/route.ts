/**
 * 用户注册API路由
 * 
 * 处理新食堂的注册请求，包括数据验证、唯一性检查和安全存储。
 * 自动处理密码加密和默认值设置，确保数据一致性和安全性。
 * 
 * 核心功能：
 * - 食堂基本信息注册
 * - 密码安全加密存储
 * - 唯一性约束检查
 * - 默认配置应用
 * - 历史菜单数据存储
 * 
 * 
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCanteen } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * 处理食堂注册请求
 * 
 * @param request HTTP请求对象，包含注册信息
 * @returns 注册成功返回食堂信息（不含密码），失败返回错误信息
 * 
 * 请求体参数：
 * - canteenName: 食堂名称（必填，唯一）
 * - password: 登录密码（必填，将被加密存储）
 * - hotDishCount: 热菜数量（可选，默认8）
 * - coldDishCount: 凉菜数量（可选，默认3）
 * - mealType: 餐制类型（可选，默认"定价餐"）
 * - historicalMenus: 历史菜单数据（可选，默认空数组）
 * 
 * 安全措施：
 * - 密码bcrypt加密（成本因子12）
 * - 用户名唯一性检查
 * - 敏感信息过滤（返回时排除密码）
 * - 输入验证和清理
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { canteenName, password, hotDishCount, coldDishCount, mealType, historicalMenus } = body

    // 验证必填字段 - 确保核心信息完整
    if (!canteenName || !password) {
      return NextResponse.json(
        { error: '食堂名称和密码为必填项' },
        { status: 400 }
      )
    }

    // 检查食堂名称唯一性 - 防止重复注册
    // 使用数据库唯一约束作为最终保障，应用层检查提供更好的用户体验
    const existingCanteen = await prisma.canteen.findUnique({
      where: { canteenName },
    })

    if (existingCanteen) {
      return NextResponse.json(
        { error: '食堂名称已存在' },
        { status: 400 }
      )
    }

    // 创建新食堂记录 - 自动应用默认值和密码加密
    const canteen = await createCanteen({
      canteenName,
      password,                                    // 将在createCanteen中自动加密
      hotDishCount: hotDishCount || 8,            // 默认8个热菜
      coldDishCount: coldDishCount || 3,          // 默认3个凉菜  
      mealType: mealType || '定价餐',             // 默认定价餐模式
      historicalMenus: historicalMenus || [],     // 默认空的历史菜单
    })

    // 返回成功响应，安全地排除密码字段
    // 使用解构赋值确保密码不会意外暴露
    const { password: _pwd, ...canteenData } = canteen
    return NextResponse.json({
      success: true,
      canteen: canteenData,
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}
