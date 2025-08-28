export interface Canteen {
  id: string
  canteenName: string
  hotDishCount: number
  coldDishCount: number
  mealType: string
  historicalMenus: string[][]
  createdAt: Date
  updatedAt: Date
}

export interface Menu {
  id: string
  canteenId: string
  weekMenu: WeekMenu
  generationParams: GenerationParams
  createdAt: Date
}

export interface DishItem {
  name: string
  category: 'hot' | 'cold'  // 热菜 | 凉菜
  type: 'mainMeat' | 'halfMeat' | 'vegetarian' | 'cold'  // 主荤 | 半荤 | 素菜 | 凉菜
  isHistorical: boolean
}

export interface WeekMenu {
  monday: DishItem[]
  tuesday: DishItem[]
  wednesday: DishItem[]
  thursday: DishItem[]
  friday: DishItem[]
}

export interface GenerationParams {
  mainMeatCount: number
  halfMeatCount: number
  vegetarianCount: number
  staffSituation: 'abundant' | 'scarce'
  historicalRatio: number
  equipmentShortage: string[]
  spicyLevel: 'none' | 'mild' | 'medium'
  flavorDiversity: boolean
  workRatio: string
  ingredientDiversity: string
}


