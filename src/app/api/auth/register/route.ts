import { NextRequest, NextResponse } from 'next/server'
import { createCanteen } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { canteenName, password, hotDishCount, coldDishCount, mealType, historicalMenus } = body

    // 验证必填字段
    if (!canteenName || !password) {
      return NextResponse.json(
        { error: '食堂名称和密码为必填项' },
        { status: 400 }
      )
    }

    // 检查食堂名称是否已存在
    const existingCanteen = await prisma.canteen.findUnique({
      where: { canteenName },
    })

    if (existingCanteen) {
      return NextResponse.json(
        { error: '食堂名称已存在' },
        { status: 400 }
      )
    }

    // 创建新食堂
    const canteen = await createCanteen({
      canteenName,
      password,
      hotDishCount: hotDishCount || 8,
      coldDishCount: coldDishCount || 3,
      mealType: mealType || '定价餐',
      historicalMenus: historicalMenus || [],
    })

    // 返回成功响应（不包含密码）
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
