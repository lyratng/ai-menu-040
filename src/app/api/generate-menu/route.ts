import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'
import type { GenerationParams, WeekMenu } from '@/types'

// 导入配置数据
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

function buildPrompt(
  canteen: { hotDishCount: number; coldDishCount: number },
  params: GenerationParams,
  historicalMenus: string[][]
): string {
  const mappings = promptTemplate.parameterMappings
  
  // 构建设备要求
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
  const totalDishesPerWeek = (canteen.hotDishCount + canteen.coldDishCount) * 5
  const historicalDishCount = Math.round(totalDishesPerWeek * params.historicalRatio / 100)
  const originalDishCount = totalDishesPerWeek - historicalDishCount
  
  // 构建历史菜单数据 - 限制为合理数量
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

export async function POST(request: NextRequest) {
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

    // 构建prompt
    const prompt = buildPrompt(canteen, params, canteen.historicalMenus as string[][])
    
    // 调用AI API
    let weekMenu: WeekMenu | null = null
    let attempts = 0
    const maxAttempts = 3

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

    // 保持最多4份菜单记录
    const allMenus = await prisma.menu.findMany({
      where: { canteenId },
      orderBy: { createdAt: 'desc' },
    })

    if (allMenus.length > 4) {
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
