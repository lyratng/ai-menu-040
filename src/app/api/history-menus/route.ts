import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

export async function GET() {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { canteenId: string }
    
    // 获取食堂信息和历史菜单
    const canteen = await prisma.canteen.findUnique({
      where: { id: decoded.canteenId },
      select: {
        id: true,
        canteenName: true,
        historicalMenus: true,
      },
    })

    if (!canteen) {
      return NextResponse.json(
        { error: '食堂不存在' },
        { status: 404 }
      )
    }

    // 获取生成的历史菜单记录
    const generatedMenus = await prisma.menu.findMany({
      where: { canteenId: decoded.canteenId },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    return NextResponse.json({
      success: true,
      data: {
        canteenName: canteen.canteenName,
        uploadedMenus: canteen.historicalMenus as string[][], // 上传的4个Excel菜单
        generatedMenus: generatedMenus, // 生成的菜单记录
      },
    })

  } catch (error) {
    console.error('Get history menus error:', error)
    return NextResponse.json(
      { error: '获取历史菜单失败' },
      { status: 500 }
    )
  }
}
