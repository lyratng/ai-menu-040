import bcrypt from 'bcryptjs'
import { prisma } from './db'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createCanteen(data: {
  canteenName: string
  password: string
  hotDishCount: number
  coldDishCount: number
  mealType: string
  historicalMenus: string[][]
}) {
  const hashedPassword = await hashPassword(data.password)
  
  return prisma.canteen.create({
    data: {
      ...data,
      password: hashedPassword,
      historicalMenus: data.historicalMenus,
    },
  })
}

export async function authenticateCanteen(canteenName: string, password: string) {
  const canteen = await prisma.canteen.findUnique({
    where: { canteenName },
  })

  if (!canteen) {
    return null
  }

  const isValid = await verifyPassword(password, canteen.password)
  if (!isValid) {
    return null
  }

  // 返回除密码外的所有数据
  const { password: _, ...canteenData } = canteen
  return canteenData
}
