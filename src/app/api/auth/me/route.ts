import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // 验证JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { canteenId: string }
    
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
