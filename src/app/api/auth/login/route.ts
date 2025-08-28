import { NextRequest, NextResponse } from 'next/server'
import { authenticateCanteen } from '@/lib/auth'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

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

    // 验证用户凭据
    const canteen = await authenticateCanteen(canteenName, password)
    
    if (!canteen) {
      return NextResponse.json(
        { error: '食堂名称或密码错误' },
        { status: 401 }
      )
    }

    // 创建JWT token
    const token = jwt.sign(
      { canteenId: canteen.id, canteenName: canteen.canteenName },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    // 设置cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/', // 确保 cookie 在整个域名下可用
      domain: process.env.NODE_ENV === 'production' ? '.ai-menu.tech' : undefined, // 设置正确的域名
    })

    console.log('Login successful, cookie set for:', canteen.canteenName)
    
    return NextResponse.json({
      success: true,
      canteen,
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
