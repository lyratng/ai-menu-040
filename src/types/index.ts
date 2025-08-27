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

export interface WeekMenu {
  monday: string[]
  tuesday: string[]
  wednesday: string[]
  thursday: string[]
  friday: string[]
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

export interface DishItem {
  name: string
  type: 'mainMeat' | 'halfMeat' | 'vegetarian' | 'cold'
  isHistorical: boolean
}
