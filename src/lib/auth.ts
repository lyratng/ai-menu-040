/**
 * 用户认证和密码管理模块
 * 
 * 本模块提供了完整的用户认证功能，包括：
 * 1. 密码加密和验证（使用bcrypt确保安全性）
 * 2. 食堂账号创建和验证
 * 3. 用户登录认证
 * 
 * 安全特性：
 * - 使用bcrypt进行密码哈希，成本因子为12
 * - 密码不以明文形式存储或传输
 * - 返回数据时自动排除敏感信息
 
 */

import bcrypt from 'bcryptjs'
import { prisma } from './db'

/**
 * 密码哈希加密
 * 
 * 使用bcrypt算法对用户密码进行不可逆加密。
 * 成本因子设为12，在安全性和性能之间取得平衡。
 * 
 * @param password 用户明文密码
 * @returns Promise<string> 加密后的密码哈希
 * 
 * 安全说明：
 * - bcrypt会自动生成随机盐值
 * - 成本因子12约需100ms计算时间，可有效防止暴力破解
 * - 同样的密码每次加密结果都不同（彩虹表攻击无效）
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * 密码验证
 * 
 * 验证用户输入的明文密码是否与存储的哈希密码匹配。
 * bcrypt.compare会自动处理盐值和哈希比较。
 * 
 * @param password 用户输入的明文密码
 * @param hashedPassword 数据库中存储的哈希密码
 * @returns Promise<boolean> 密码是否匹配
 * 
 * 使用场景：
 * - 用户登录时验证密码
 * - 密码重置时验证旧密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * 创建新食堂账号
 * 
 * 处理新食堂的注册流程，包括密码加密和数据存储。
 * 在存储前会自动对密码进行哈希加密。
 * 
 * @param data 食堂注册数据
 * @param data.canteenName 食堂名称（必须唯一）
 * @param data.password 明文密码
 * @param data.hotDishCount 热菜数量配置
 * @param data.coldDishCount 凉菜数量配置
 * @param data.mealType 餐制类型（定价餐/自助餐）
 * @param data.historicalMenus 历史菜单数据（Excel解析后的结果）
 * @returns Promise<Canteen> 创建的食堂记录
 * 
 * 数据验证：
 * - canteenName在数据库中必须唯一（通过数据库约束保证）
 * - 密码会被自动加密，不会以明文形式存储
 * - historicalMenus存储为JSON格式，便于后续AI处理
 * 
 * @throws 如果食堂名称已存在，Prisma会抛出唯一约束错误
 */
export async function createCanteen(data: {
  canteenName: string
  password: string
  hotDishCount: number
  coldDishCount: number
  mealType: string
  historicalMenus: string[][]
}) {
  // 先加密密码，确保不会明文存储
  const hashedPassword = await hashPassword(data.password)
  
  return prisma.canteen.create({
    data: {
      ...data,
      password: hashedPassword,
      historicalMenus: data.historicalMenus,
    },
  })
}

/**
 * 食堂账号认证
 * 
 * 验证食堂名称和密码，用于用户登录。
 * 采用时间恒定的比较方式，防止时序攻击。
 * 
 * @param canteenName 食堂名称
 * @param password 用户输入的密码
 * @returns Promise<Canteen | null> 认证成功返回食堂信息（不含密码），失败返回null
 * 
 * 安全特性：
 * 1. 无论是用户不存在还是密码错误，都返回null（防止用户枚举）
 * 2. 使用bcrypt进行密码比较，自带时序攻击防护
 * 3. 返回数据中不包含密码哈希，防止信息泄露
 * 
 * 认证流程：
 * 1. 根据食堂名称查找用户记录
 * 2. 如果用户不存在，直接返回null
 * 3. 验证密码哈希是否匹配
 * 4. 密码正确则返回用户信息（排除密码字段）
 * 5. 密码错误则返回null
 */
export async function authenticateCanteen(canteenName: string, password: string) {
  // 首先查找食堂记录
  const canteen = await prisma.canteen.findUnique({
    where: { canteenName },
  })

  // 用户不存在，返回null（不暴露用户是否存在的信息）
  if (!canteen) {
    return null
  }

  // 验证密码，bcrypt.compare会处理所有安全细节
  const isValid = await verifyPassword(password, canteen.password)
  if (!isValid) {
    return null
  }

  // 认证成功，返回除密码外的所有数据
  // 使用解构赋值排除password字段，确保敏感信息不会被返回
  const { password: _, ...canteenData } = canteen
  return canteenData
}
