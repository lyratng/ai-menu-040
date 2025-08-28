import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // 创建响应并清除cookie
    const response = NextResponse.json({
      success: true,
      message: '已成功退出登录',
    })

    // 清除认证cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: '退出登录失败' },
      { status: 500 }
    )
  }
}
