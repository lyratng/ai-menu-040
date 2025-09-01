/**
 * 团餐菜单生成API路由
 * 
 * 本文件实现了基于AI的智能菜单生成功能，是整个系统的核心业务逻辑。
 * 主要功能：
 * 1. 接收用户配置的菜单生成参数
 * 2. 构建符合团餐规范的AI Prompt
 * 3. 调用Deepseek API生成菜单
 * 4. 解析和验证AI返回结果
 * 5. 保存菜单到数据库
 * 
 * @author 技术开发团队
 * @version 1.0.0
 * @lastModified 2025-01-15
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'
import type { GenerationParams, WeekMenu } from '@/types'

/**
 * AI Prompt模板配置
 * 
 * 这个配置对象定义了与AI交互的核心规则和参数映射。
 * 包含了团餐行业的专业知识和约束条件，确保生成的菜单
 * 符合实际运营需求。
 */
const promptTemplate = {
  "systemPrompt": "你是一位在中国团餐行业工作多年的经验丰富的厨师长。请严格按照以下【开菜规则】和【约束条件】，为团餐食堂生成一周五天的午餐菜谱。",
  
  "parameterMappings": {
    "设备要求": {
      "蒸屉": "蒸屉紧缺，不要出现蒸菜",
      "烤箱": "烤箱紧缺，不要出现烤菜",
      "炒锅": "炒锅紧缺，出现炒菜不超过(<=)2道",
      "炖锅": "炖锅紧缺，不要出现炖菜", 
      "烧炉": "烧炉紧缺，不要出现烧菜",
      "无": "所有烹饪设备均充足，蒸屉、烤箱、砂锅、炖锅、烧炉的使用注重均衡协调"
    },
    
    "菜品做工比例": {
      "1:1:1": "现炒、一锅出、半成品的比例为1:1:1",
      "1:0.5:0.5": "现炒、一锅出、半成品的比例为1:0.5:0.5",
      "0.5:1:0.5": "现炒、一锅出、半成品的比例为0.5:1:0.5",
      "0.5:0.5:1": "现炒、一锅出、半成品的比例为0.5:0.5:1",
      "无要求": ""
    },
    
    "人员配置": {
      "scarce": "厨师人手紧缺，需要减少整体刀工复杂度，复杂刀工菜不超过20%",
      "abundant": "厨师人手宽裕，可以出20-33%复杂刀工菜品以体现技术"
    },
    
    "辣味菜要求": {
      "none": "不要出现辣菜",
      "mild": "微辣，辣菜在总数量占比10-20%",
      "medium": "中辣，辣菜在总数量占比20-30%"
    },
    
    "调味品多样性": {
      "true": "在酸、甜、苦、辣、咸、鲜、麻、香、清淡9种风味之中，每餐出现风味不少于5种",
      "false": "无要求"
    },
    
    "原材料多样性": {
      "4种": "一餐出品的原材料不少于4种",
      "5种": "一餐出品的原材料不少于5种",
      "6种": "一餐出品的原材料不少于6种", 
      "无要求": ""
    }
  }
}

const databases = {
  "原材料": "常用高频原材料：鸡蛋、茄子、南瓜、娃娃菜、土豆、冬瓜、小白菜、油菜、苦瓜、丝瓜、鲈鱼、草鱼、龙利鱼、虾仁、鸡胸肉、三黄鸡、鸡腿肉、五花肉、猪里脊肉、牛里脊、老豆腐、香菇等",
  "烹饪方式": "主要烹饪方式：炒、熘、蒸、烧、烤、炖、煎、烹；辅助烹饪方式：炸、焗、煨、浇汁、烩、汆、灼、白灼、焖、淋、煲、卤、扒、熏、煮、煸、酿、爆、烹汁、汤、浸、拌、凉拌、溜",
  "风味": "咸香、咸鲜、咸酸、蒜香、酸甜、香甜、葱香、咸辣、酸辣、辣、麻辣、甜辣、鲜辣、辣鲜、麻鲜、鲜香、醲香、香辣、孜然、复合、黑椒、酱香、酸香、甜、干香、咖喱、蜜汁、豉香、酒香、茄汁、奶香"
}

/**
 * 构建AI菜单生成的Prompt
 * 
 * 这是整个系统最核心的函数之一，负责将用户的配置参数
 * 转换为AI能够理解的专业指令。Prompt的质量直接影响
 * 生成菜单的实用性和合理性。
 * 
 * @param canteen 食堂基础配置（热菜数量、凉菜数量）
 * @param params 用户选择的生成参数
 * @param historicalMenus 历史菜单数据，用于风格参考
 * @returns 完整的AI Prompt字符串
 * 
 * 核心逻辑：
 * 1. 根据参数映射规则转换用户配置
 * 2. 计算历史菜与原创菜的数量分配
 * 3. 构建包含约束条件的专业指令
 * 4. 确保生成结果符合团餐运营规范
 */
function buildPrompt(
  canteen: { hotDishCount: number; coldDishCount: number },
  params: GenerationParams,
  historicalMenus: string[][]
): string {
  const mappings = promptTemplate.parameterMappings
  
  // 构建设备要求 - 这直接影响可生成的菜品类型
  // 设备限制是硬约束，必须严格遵守，否则厨房无法执行
  let equipmentRequirement = "所有烹饪设备均充足，蒸屉、烤箱、砂锅、炖锅、烧炉的使用注重均衡协调"
  if (params.equipmentShortage && params.equipmentShortage.length > 0) {
    const requirements = params.equipmentShortage.map(item => 
      mappings["设备要求"][item as keyof typeof mappings["设备要求"]]
    ).filter(Boolean)
    equipmentRequirement = requirements.join('；')
  }
  
  // 构建其他参数
  const staffRequirement = mappings["人员配置"][params.staffSituation]
  const spicyRequirement = mappings["辣味菜要求"][params.spicyLevel]
  const flavorRequirement = mappings["调味品多样性"][params.flavorDiversity.toString() as keyof typeof mappings["调味品多样性"]]
  const ingredientRequirement = mappings["原材料多样性"][params.ingredientDiversity as keyof typeof mappings["原材料多样性"]]
  const workRatioRequirement = mappings["菜品做工比例"][params.workRatio as keyof typeof mappings["菜品做工比例"]]
  
  // 计算菜单数量和历史菜占比
  // 这个计算确保历史菜和原创菜的精确分配，避免AI生成时数量错误
  const totalDishesPerWeek = (canteen.hotDishCount + canteen.coldDishCount) * 5  // 一周5天的总菜品数
  const historicalDishCount = Math.round(totalDishesPerWeek * params.historicalRatio / 100)  // 历史菜数量
  const originalDishCount = totalDishesPerWeek - historicalDishCount  // 原创菜数量
  
  // 构建历史菜单数据 - 限制为合理数量
  // 提供给AI的历史菜单数据不宜过多，避免Prompt过长导致性能问题
  // 同时确保有足够的选择余地，提高生成质量
  const historicalDishes = historicalMenus.flat().slice(0, historicalDishCount + 10) // 只提供稍多于需要的数量
  const historicalMenuText = historicalDishes.join('、')
  
  const prompt = `${promptTemplate.systemPrompt}

请为团餐食堂生成一周五天的午餐菜谱，每天包含${canteen.hotDishCount}个热菜和${canteen.coldDishCount}个凉菜（这个条件必须严格遵守），其中热菜里面包含${params.mainMeatCount}个主荤菜、${params.halfMeatCount}个半荤菜、${params.vegetarianCount}个素菜（这个也需要严格遵守）。

【重要】严格控制历史菜单占比：整个一周菜单（共${totalDishesPerWeek}道菜）中，必须有且仅有${historicalDishCount}道菜来源于【历史菜单】，其余${originalDishCount}道菜必须是全新的原创菜品，不能出现在【历史菜单】中。

【重要】历史菜品分散原则：为了保证一周菜单的新鲜感和均衡性，请将这${historicalDishCount}道历史菜品均匀地分散在周一到周五的菜单中，每天都要有一些历史菜和一些原创菜的搭配，避免某一天全是历史菜或某一天全是原创菜。让每一天的用餐者都能既品尝到经典的招牌菜（历史菜），又能尝试新的菜品（原创菜）。

【开菜规则】
1. 设备可实现性：${equipmentRequirement}
2. 成本控制：一餐避免重复出现高成本食材/菜品，如水产品、牛羊肉
3. 菜品做工均衡：${workRatioRequirement}
4. 食材多样性：一餐内，主要食材不得重复（例如：鸡翅、鸡腿、鸡胸、鸡爪是不同食材）
5. 原材料多样性：${ingredientRequirement}
6. 辣味菜数量要求：${spicyRequirement}
7. 刀工多样性：${staffRequirement}
8. 调味品多样性：${flavorRequirement}
9. 烹饪方式多样性：每周菜单必须出现炒、熘、蒸、烧、烤、炖、煎、烹8种烹饪方法中的至少六种
10. 口感多样性：一餐不要出现超过两个勾芡菜

【参考数据】
原材料：${databases["原材料"]}
烹饪方式：${databases["烹饪方式"]}
风味：${databases["风味"]}

【历史菜单】
${historicalMenuText}

【菜品分类定义】
主荤菜：以肉类/海鲜为主要食材，体现'硬菜'感觉的菜品，即使有配菜也算主荤（如可乐鸡翅、孜然羊排、红烧鲷鱼、土豆炖牛肉等）
半荤菜：荤素搭配的菜品，荤菜和素菜比例相当（如青笋炒肉片、宫保鸡丁等）
素菜：纯素食或以蔬菜为主的菜品
凉菜：不区分荤素，一般以素食为主以控制成本

【分散策略建议】
为了最佳的用餐体验，建议每天安排大约${Math.round(historicalDishCount/5)}道左右的历史菜（可以有1-2道的浮动），让历史经典菜品和创新菜品在每一天都有合理的搭配。

【输出要求】
请严格按照JSON格式输出，包含周一到周五的菜单：
{
  "monday": ["菜品1(主荤)", "菜品2(半荤)", "菜品3(素菜)", "菜品4(凉菜)"],
  "tuesday": ["菜品1(主荤)", "菜品2(半荤)", "菜品3(素菜)", "菜品4(凉菜)"],
  "wednesday": ["菜品1(主荤)", "菜品2(半荤)", "菜品3(素菜)", "菜品4(凉菜)"],
  "thursday": ["菜品1(主荤)", "菜品2(半荤)", "菜品3(素菜)", "菜品4(凉菜)"],
  "friday": ["菜品1(主荤)", "菜品2(半荤)", "菜品3(素菜)", "菜品4(凉菜)"]
}

如果菜品来源于历史菜单，请额外标注(历史)，如：可乐鸡翅(主荤)(历史)

请确保：
1. 每天菜品数量严格等于${canteen.hotDishCount + canteen.coldDishCount}道
2. 每天热菜数量严格等于${canteen.hotDishCount}道，凉菜数量严格等于${canteen.coldDishCount}道
3. 菜品分类标注准确
4. 【最重要】整个一周菜单中，标注(历史)的菜品总数必须严格等于${historicalDishCount}道，不能多也不能少
5. 原创菜品（不标注历史的）总数必须严格等于${originalDishCount}道
6. 【用户体验】每天都要有历史菜和原创菜的合理搭配，避免历史菜过分集中在某几天`

  // 调试：输出完整prompt到控制台
  console.log('=== 生成菜单的完整Prompt ===')
  console.log(`总菜品数：${totalDishesPerWeek}，历史菜数：${historicalDishCount}，原创菜数：${originalDishCount}`)
  console.log(`历史菜单提供数量：${historicalDishes.length}`)
  console.log('Prompt内容：', prompt)
  console.log('=== Prompt结束 ===')
  
  return prompt
}

/**
 * 调用Deepseek AI API生成菜单
 * 
 * 封装与AI服务的交互逻辑，处理API调用和错误处理。
 * 使用temperature=0.7确保既有创意又相对稳定的输出。
 * 
 * @param prompt 构建好的AI指令
 * @returns AI返回的原始文本内容
 * @throws Error 当API调用失败时抛出错误
 */
async function callDeepseekAPI(prompt: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Deepseek API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content
}

/**
 * 解析AI返回的菜单数据
 * 
 * AI可能返回包含额外文本的响应，需要提取其中的JSON部分
 * 并验证数据结构的完整性。这是确保系统稳定性的关键步骤。
 * 
 * @param content AI返回的原始文本
 * @returns 解析后的菜单对象，失败时返回null
 * 
 * 解析步骤：
 * 1. 使用正则表达式提取JSON部分
 * 2. 验证JSON格式是否正确
 * 3. 检查必需的数据结构（周一到周五）
 * 4. 确保每天的菜单都是数组格式
 */
function parseMenuResponse(content: string): WeekMenu | null {
  try {
    // 尝试提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const menuData = JSON.parse(jsonMatch[0])
    
    // 验证数据结构
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    for (const day of days) {
      if (!menuData[day] || !Array.isArray(menuData[day])) {
        throw new Error(`Invalid menu structure for ${day}`)
      }
    }

    return menuData as WeekMenu
  } catch (error) {
    console.error('Failed to parse menu response:', error)
    return null
  }
}

/**
 * 菜单生成API的主处理函数
 * 
 * 这是整个菜单生成流程的入口点，协调各个子模块完成
 * 从参数验证到菜单保存的完整流程。
 * 
 * 处理流程：
 * 1. JWT身份验证
 * 2. 参数验证和权限检查
 * 3. 获取食堂信息和历史菜单
 * 4. 构建AI Prompt
 * 5. 调用AI API（支持重试机制）
 * 6. 解析和验证结果
 * 7. 保存到数据库
 * 8. 维护历史记录数量限制
 * 
 * @param request Next.js请求对象
 * @returns JSON响应，包含生成的菜单或错误信息
 */
export async function POST(request: NextRequest) {
  try {
    // 验证身份 - 确保只有登录用户才能生成菜单
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
    const { canteenId, params } = body as {
      canteenId: string
      params: GenerationParams
    }

    // 验证权限
    if (decoded.canteenId !== canteenId) {
      return NextResponse.json(
        { error: '无权限操作此食堂' },
        { status: 403 }
      )
    }

    // 获取食堂信息
    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId },
    })

    if (!canteen) {
      return NextResponse.json(
        { error: '食堂不存在' },
        { status: 404 }
      )
    }

    // 构建prompt - 将用户参数转换为AI能理解的专业指令
    const prompt = buildPrompt(canteen, params, canteen.historicalMenus as string[][])
    
    // 调用AI API - 实现重试机制提高成功率
    // AI API可能因为网络或服务问题偶尔失败，重试可以显著提高用户体验
    let weekMenu: WeekMenu | null = null
    let attempts = 0
    const maxAttempts = 3  // 最多重试3次

    while (!weekMenu && attempts < maxAttempts) {
      attempts++
      try {
        const aiResponse = await callDeepseekAPI(prompt)
        weekMenu = parseMenuResponse(aiResponse)
        
        if (!weekMenu) {
          console.warn(`Attempt ${attempts}: Failed to parse AI response`)
        }
      } catch (error) {
        console.error(`Attempt ${attempts}: AI API call failed:`, error)
      }
    }

    if (!weekMenu) {
      return NextResponse.json(
        { error: '菜单生成失败，请稍后重试' },
        { status: 500 }
      )
    }

    // 保存菜单到数据库
    const menu = await prisma.menu.create({
      data: {
        canteenId,
        weekMenu: weekMenu as object,
        generationParams: params as object,
      },
    })

    // 保持最多4份菜单记录 - 防止数据库无限增长
    // 删除最旧的记录，为每个食堂维护合理的历史记录数量
    const allMenus = await prisma.menu.findMany({
      where: { canteenId },
      orderBy: { createdAt: 'desc' },
    })

    if (allMenus.length > 4) {
      // 删除第5个及之后的记录（保留最新的4个）
      await prisma.menu.deleteMany({
        where: {
          id: {
            in: allMenus.slice(4).map(m => m.id),
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      menu: weekMenu,
      menuId: menu.id,
    })

  } catch (error) {
    console.error('Menu generation error:', error)
    return NextResponse.json(
      { error: '系统错误，请稍后重试' },
      { status: 500 }
    )
  }
}
