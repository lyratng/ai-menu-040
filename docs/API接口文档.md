# 团餐菜单生成工具 - API接口文档

## 📖 概述

本文档详细描述了团餐菜单生成工具的所有API接口，包括请求参数、响应格式、错误处理等。所有API基于RESTful设计，使用JSON格式进行数据交换。

### 基础信息

- **基础URL**：`https://ai-menu.tech/api`
- **认证方式**：基于JWT的Token认证
- **内容类型**：`application/json`
- **字符编码**：`UTF-8`

---

## 🔐 认证机制

### JWT Token说明

系统使用JWT（JSON Web Token）进行用户认证，Token存储在HTTP-Only Cookie中，确保安全性。

**Token结构：**
```typescript
interface JWTPayload {
  canteenId: string    // 食堂唯一标识
  iat: number          // 签发时间
  exp: number          // 过期时间
}
```

**Token有效期：** 24小时

---

## 🏪 用户认证API

### 1. 用户注册

**接口：** `POST /api/auth/register`

**描述：** 新食堂注册账号

**请求参数：**
```typescript
interface RegisterRequest {
  canteenName: string       // 食堂名称，2-50字符，必须唯一
  password: string          // 密码，6-20字符
  hotDishCount: number      // 热菜数量，1-20
  coldDishCount: number     // 凉菜数量，1-10
  mealType: string          // 餐制类型："定价餐" | "自助餐"
  historicalMenus: File[]   // 历史菜单文件，4个Excel文件
}
```

**请求示例：**
```bash
curl -X POST https://ai-menu.tech/api/auth/register \
  -H "Content-Type: multipart/form-data" \
  -F "canteenName=测试食堂" \
  -F "password=123456" \
  -F "hotDishCount=8" \
  -F "coldDishCount=3" \
  -F "mealType=定价餐" \
  -F "file1=@menu1.xlsx" \
  -F "file2=@menu2.xlsx" \
  -F "file3=@menu3.xlsx" \
  -F "file4=@menu4.xlsx"
```

**响应格式：**
```typescript
// 成功响应 (200)
{
  "success": true,
  "canteen": {
    "id": "clxxxxx",
    "canteenName": "测试食堂",
    "hotDishCount": 8,
    "coldDishCount": 3,
    "mealType": "定价餐",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}

// 错误响应 (400)
{
  "success": false,
  "error": "食堂名称已存在"
}
```

**错误码：**
- `400`：参数错误、食堂名称已存在
- `413`：文件过大
- `415`：文件格式不支持
- `500`：服务器内部错误

### 2. 用户登录

**接口：** `POST /api/auth/login`

**描述：** 用户登录获取访问权限

**请求参数：**
```typescript
interface LoginRequest {
  canteenName: string    // 食堂名称
  password: string       // 密码
}
```

**请求示例：**
```bash
curl -X POST https://ai-menu.tech/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "canteenName": "测试食堂",
    "password": "123456"
  }'
```

**响应格式：**
```typescript
// 成功响应 (200)
{
  "success": true,
  "canteen": {
    "id": "clxxxxx",
    "canteenName": "测试食堂",
    "hotDishCount": 8,
    "coldDishCount": 3,
    "mealType": "定价餐"
  }
}

// 错误响应 (401)
{
  "success": false,
  "error": "食堂名称或密码错误"
}
```

### 3. 获取当前用户信息

**接口：** `GET /api/auth/me`

**描述：** 获取当前登录用户的食堂信息

**请求示例：**
```bash
curl -X GET https://ai-menu.tech/api/auth/me \
  -H "Cookie: auth-token=your-jwt-token"
```

**响应格式：**
```typescript
// 成功响应 (200)
{
  "success": true,
  "canteen": {
    "id": "clxxxxx",
    "canteenName": "测试食堂",
    "hotDishCount": 8,
    "coldDishCount": 3,
    "mealType": "定价餐",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}

// 未登录 (401)
{
  "success": false,
  "error": "未登录"
}
```

### 4. 用户登出

**接口：** `POST /api/auth/logout`

**描述：** 用户登出，清除认证状态

**请求示例：**
```bash
curl -X POST https://ai-menu.tech/api/auth/logout \
  -H "Cookie: auth-token=your-jwt-token"
```

**响应格式：**
```typescript
// 成功响应 (200)
{
  "success": true,
  "message": "登出成功"
}
```

---

## 🍽 菜单管理API

### 5. 生成菜单

**接口：** `POST /api/generate-menu`

**描述：** 基于参数配置生成一周菜单

**请求参数：**
```typescript
interface GenerateMenuRequest {
  canteenId: string              // 食堂ID
  params: GenerationParams       // 生成参数
}

interface GenerationParams {
  mainMeatCount: number          // 主荤菜数量
  halfMeatCount: number          // 半荤菜数量  
  vegetarianCount: number        // 素菜数量
  staffSituation: 'abundant' | 'scarce'  // 人员配置
  historicalRatio: number        // 历史菜占比：0|30|50|70
  equipmentShortage: string[]    // 设备紧缺：["蒸屉","烤箱","炒锅","炖锅","烧炉"]
  spicyLevel: 'none' | 'mild' | 'medium'  // 辣味要求
  flavorDiversity: boolean       // 每餐风味不少于5种
  workRatio: string             // 菜品做工比例
  ingredientDiversity: string   // 原材料多样性
}
```

**请求示例：**
```bash
curl -X POST https://ai-menu.tech/api/generate-menu \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=your-jwt-token" \
  -d '{
    "canteenId": "clxxxxx",
    "params": {
      "mainMeatCount": 3,
      "halfMeatCount": 3,
      "vegetarianCount": 2,
      "staffSituation": "scarce",
      "historicalRatio": 30,
      "equipmentShortage": ["蒸屉"],
      "spicyLevel": "mild",
      "flavorDiversity": false,
      "workRatio": "无要求",
      "ingredientDiversity": "无要求"
    }
  }'
```

**响应格式：**
```typescript
// 成功响应 (200)
{
  "success": true,
  "menu": {
    "monday": [
      "红烧肉(主荤)",
      "青椒肉丝(半荤)", 
      "清炒小白菜(素菜)",
      "凉拌黄瓜(凉菜)"
    ],
    "tuesday": [
      "糖醋里脊(主荤)(历史)",
      "宫保鸡丁(半荤)",
      "麻婆豆腐(素菜)", 
      "酸辣土豆丝(凉菜)"
    ],
    // ... 其他天
  },
  "menuId": "menu_clxxxxx"
}

// 错误响应 (500)
{
  "success": false,
  "error": "菜单生成失败，请稍后重试"
}
```

**错误码：**
- `401`：未登录或无权限
- `400`：参数错误
- `500`：AI API调用失败或生成超时

### 6. 获取历史菜单

**接口：** `GET /api/history-menus`

**描述：** 获取当前食堂的历史菜单记录

**请求示例：**
```bash
curl -X GET https://ai-menu.tech/api/history-menus \
  -H "Cookie: auth-token=your-jwt-token"
```

**响应格式：**
```typescript
// 成功响应 (200)
{
  "success": true,
  "data": {
    "canteenName": "测试食堂",
    "uploadedMenus": [
      ["红烧肉", "清炒白菜", "酸辣土豆丝"],  // 第1个历史菜单
      ["糖醋里脊", "宫保鸡丁", "麻婆豆腐"],  // 第2个历史菜单
      // ... 最多4个
    ],
    "generatedMenus": [
      {
        "id": "menu_clxxxxx",
        "weekMenu": {
          "monday": ["红烧肉(主荤)", "青椒肉丝(半荤)"],
          "tuesday": ["糖醋里脊(主荤)", "宫保鸡丁(半荤)"],
          // ... 完整一周菜单
        },
        "generationParams": {
          "mainMeatCount": 3,
          "halfMeatCount": 3,
          // ... 完整参数
        },
        "createdAt": "2025-01-15T14:30:00Z"
      }
      // ... 最多4条记录
    ]
  }
}
```

---

## 📊 数据类型定义

### WeekMenu 数据结构

```typescript
interface WeekMenu {
  monday: string[]      // 周一菜单
  tuesday: string[]     // 周二菜单
  wednesday: string[]   // 周三菜单
  thursday: string[]    // 周四菜单
  friday: string[]      // 周五菜单
}
```

### Canteen 数据结构

```typescript
interface Canteen {
  id: string                    // 唯一标识
  canteenName: string          // 食堂名称
  hotDishCount: number         // 热菜数量
  coldDishCount: number        // 凉菜数量
  mealType: string             // 餐制类型
  historicalMenus: string[][]  // 历史菜单数据
  createdAt: Date              // 创建时间
  updatedAt: Date              // 更新时间
}
```

### Menu 数据结构

```typescript
interface Menu {
  id: string                   // 菜单ID
  canteenId: string           // 所属食堂ID
  weekMenu: WeekMenu          // 一周菜单
  generationParams: GenerationParams  // 生成参数
  createdAt: Date             // 生成时间
}
```

---

## ⚠️ 错误处理

### 统一错误响应格式

```typescript
interface ErrorResponse {
  success: false
  error: string              // 错误描述
  code?: string             // 错误代码
  details?: any             // 详细信息（开发模式）
}
```

### 常见错误码

| HTTP状态码 | 错误类型 | 描述 |
|-----------|----------|------|
| `400` | Bad Request | 请求参数错误 |
| `401` | Unauthorized | 未登录或Token无效 |
| `403` | Forbidden | 无权限访问 |
| `404` | Not Found | 资源不存在 |
| `413` | Payload Too Large | 文件过大 |
| `415` | Unsupported Media Type | 文件格式不支持 |
| `429` | Too Many Requests | 请求频率过高 |
| `500` | Internal Server Error | 服务器内部错误 |

### 错误处理最佳实践

#### 客户端错误处理

```typescript
async function callAPI(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options)
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    console.error('API调用失败:', error)
    // 根据错误类型进行相应处理
    if (error.message.includes('401')) {
      // 重定向到登录页
      window.location.href = '/login'
    }
    throw error
  }
}
```

#### 重试机制

```typescript
async function generateMenuWithRetry(params: GenerationParams, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callAPI('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}
```

---

## 🔄 API版本控制

### 版本策略

- **当前版本**：v1
- **版本格式**：URL路径版本控制
- **兼容性**：向后兼容，废弃功能会提前通知

### 版本演进计划

```
v1.0 (当前) - 基础功能
v1.1 (计划) - 增加菜品编辑功能
v2.0 (远期) - 支持多餐制、营养分析
```

---

## 📈 API限制和配额

### 请求频率限制

| 接口类型 | 限制 | 窗口期 |
|---------|------|--------|
| 认证接口 | 10次/分钟 | 滑动窗口 |
| 菜单生成 | 5次/分钟 | 滑动窗口 |
| 查询接口 | 100次/分钟 | 滑动窗口 |

### 文件上传限制

- **单文件大小**：最大 10MB
- **支持格式**：.xlsx, .xls
- **文件数量**：注册时需要4个文件

### 响应时间

- **一般接口**：< 2秒
- **菜单生成**：< 60秒
- **文件上传**：< 30秒

---

## 🧪 API测试

### 测试环境

- **测试地址**：https://test-ai-menu.vercel.app
- **测试账号**：test_canteen / 123456

### Postman集合

```json
{
  "info": {
    "name": "团餐菜单生成工具 API",
    "version": "1.0.0"
  },
  "item": [
    {
      "name": "用户登录",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"canteenName\": \"test_canteen\",\n  \"password\": \"123456\"\n}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://ai-menu.tech"
    }
  ]
}
```

### 集成测试示例

```typescript
describe('API集成测试', () => {
  let authToken: string
  
  beforeAll(async () => {
    // 登录获取Token
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canteenName: 'test_canteen',
        password: '123456'
      })
    })
    
    const cookies = response.headers.get('set-cookie')
    authToken = cookies?.match(/auth-token=([^;]+)/)?.[1] || ''
  })
  
  test('生成菜单', async () => {
    const response = await fetch('/api/generate-menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify({
        canteenId: 'test_id',
        params: {
          mainMeatCount: 3,
          halfMeatCount: 3,
          vegetarianCount: 2,
          staffSituation: 'scarce',
          historicalRatio: 30,
          equipmentShortage: [],
          spicyLevel: 'mild',
          flavorDiversity: false,
          workRatio: '无要求',
          ingredientDiversity: '无要求'
        }
      })
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.menu).toBeDefined()
  })
})
```

---

## 📚 SDK和代码示例

### JavaScript/TypeScript SDK

```typescript
class AIMenuAPI {
  private baseUrl: string
  private token?: string
  
  constructor(baseUrl = 'https://ai-menu.tech') {
    this.baseUrl = baseUrl
  }
  
  async login(canteenName: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canteenName, password }),
      credentials: 'include'
    })
    
    const data = await response.json()
    if (!data.success) throw new Error(data.error)
    
    return data.canteen
  }
  
  async generateMenu(params: GenerationParams) {
    const response = await fetch(`${this.baseUrl}/api/generate-menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params }),
      credentials: 'include'
    })
    
    const data = await response.json()
    if (!data.success) throw new Error(data.error)
    
    return data.menu
  }
}

// 使用示例
const api = new AIMenuAPI()

async function example() {
  try {
    await api.login('测试食堂', '123456')
    
    const menu = await api.generateMenu({
      mainMeatCount: 3,
      halfMeatCount: 3,
      vegetarianCount: 2,
      staffSituation: 'scarce',
      historicalRatio: 30,
      equipmentShortage: [],
      spicyLevel: 'mild',
      flavorDiversity: false,
      workRatio: '无要求',
      ingredientDiversity: '无要求'
    })
    
    console.log('生成的菜单:', menu)
  } catch (error) {
    console.error('操作失败:', error.message)
  }
}
```

---

## 🔗 相关资源

### 开发工具

- **API调试**：Postman、Insomnia
- **JSON格式化**：JSONFormatter.org
- **Base64编码**：Base64Encode.org

### 相关文档

- [用户使用手册](./用户使用手册.md)
- [部署运维指南](./部署运维指南.md)
- [数据库设计文档](./数据库设计文档.md)

### 技术支持

- **API问题**：tech-support@ai-menu.tech
- **文档更新**：定期更新，关注版本号
- **社区讨论**：[GitHub Issues](https://github.com/your-repo/issues)

---

*最后更新时间：2025年9月*
*API版本：v1.0*
