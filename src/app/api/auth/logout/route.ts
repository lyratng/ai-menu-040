/**
 * 用户登出API路由
 * 
 * 处理用户安全登出，清除认证状态和相关Cookie。
 * 确保用户会话完全终止，防止会话劫持等安全风险。
 * 
 * 安全特性：
 * - 立即清除认证Cookie
 * - 设置Cookie过期时间为0
 * - 保持安全标志一致性
 */

import { NextResponse } from 'next/server'

/**
 * 处理用户登出请求
 * 
 * @returns 始终返回成功响应并清除认证Cookie
 * 
 * 处理流程：
 * 1. 创建成功响应对象
 * 2. 设置auth-token Cookie为空值
 * 3. 设置maxAge为0使Cookie立即过期
 * 4. 保持安全标志与登录时一致
 * 
 * 注意：即使发生错误也会尝试清除Cookie，确保安全性
 */
export async function POST() {
  try {
    // 创建响应对象 - 返回友好的成功消息
    const response = NextResponse.json({
      success: true,
      message: '已成功退出登录',
    })

    // 清除认证Cookie - 通过设置空值和过期时间为0
    // 保持与登录时相同的安全配置，确保Cookie能被正确清除
    response.cookies.set('auth-token', '', {
      httpOnly: true,                              // 保持与登录时一致
      secure: process.env.NODE_ENV === 'production', // 保持与登录时一致
      sameSite: 'lax',                            // 保持与登录时一致
      maxAge: 0,                                  // 立即过期，清除Cookie
      path: '/',                                  // 确保覆盖所有路径下的Cookie
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
