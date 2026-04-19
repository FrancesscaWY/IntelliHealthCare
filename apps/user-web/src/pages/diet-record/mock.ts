export type DietMealKey = "breakfast" | "lunch" | "snack" | "dinner";
export type DietFoodThumb = "bread" | "milk" | "oat" | "egg" | "fish" | "salad" | "fruit" | "porridge";

export interface DietFoodItem {
  id: string;
  name: string;
  amount: string;
  caloriesLabel: string;
  thumb: DietFoodThumb;
}

export interface DietMealRecord {
  key: DietMealKey;
  label: string;
  totalCalories: number;
  eatenAt?: string;
  foods: DietFoodItem[];
}

export interface DietMacro {
  key: string;
  label: string;
  value: string;
  color: string;
}

export interface DietRecordDay {
  id: string;
  titleDate: string;
  sheetLabel: string;
  totalCalories: number;
  macros: DietMacro[];
  meals: DietMealRecord[];
}

const mock = {
  title: "饮食记录",
  dateSheetTitle: "选择日期",
  days: [
    {
      id: "2024-03-02",
      titleDate: "2024年3月2日",
      sheetLabel: "3月2日 周六",
      totalCalories: 1450,
      macros: [
        { key: "carb", label: "碳水", value: "80.9克", color: "#f36f66" },
        { key: "protein", label: "蛋白质", value: "13.8克", color: "#f5c957" },
        { key: "fat", label: "脂肪", value: "8.4克", color: "#43c9a4" },
      ],
      meals: [
        {
          key: "breakfast",
          label: "早餐",
          totalCalories: 456,
          eatenAt: "08:45",
          foods: [
            { id: "bread", name: "全麦面包", amount: "100克", caloriesLabel: "356千卡", thumb: "bread" },
            { id: "milk", name: "纯牛奶", amount: "100克", caloriesLabel: "100千卡", thumb: "milk" },
          ],
        },
        {
          key: "lunch",
          label: "午餐",
          totalCalories: 0,
          foods: [],
        },
        {
          key: "snack",
          label: "加餐",
          totalCalories: 0,
          foods: [],
        },
        {
          key: "dinner",
          label: "晚餐",
          totalCalories: 0,
          foods: [],
        },
      ],
    },
    {
      id: "2024-03-01",
      titleDate: "2024年3月1日",
      sheetLabel: "3月1日 周五",
      totalCalories: 1360,
      macros: [
        { key: "carb", label: "碳水", value: "96.2克", color: "#f36f66" },
        { key: "protein", label: "蛋白质", value: "42.6克", color: "#f5c957" },
        { key: "fat", label: "脂肪", value: "28.4克", color: "#43c9a4" },
      ],
      meals: [
        {
          key: "breakfast",
          label: "早餐",
          totalCalories: 328,
          eatenAt: "08:12",
          foods: [
            { id: "oatmeal", name: "燕麦粥", amount: "180克", caloriesLabel: "188千卡", thumb: "oat" },
            { id: "egg", name: "水煮蛋", amount: "1个", caloriesLabel: "140千卡", thumb: "egg" },
          ],
        },
        {
          key: "lunch",
          label: "午餐",
          totalCalories: 612,
          eatenAt: "12:26",
          foods: [
            { id: "fish", name: "清蒸鱼", amount: "150克", caloriesLabel: "286千卡", thumb: "fish" },
            { id: "salad", name: "西兰花沙拉", amount: "120克", caloriesLabel: "326千卡", thumb: "salad" },
          ],
        },
        {
          key: "snack",
          label: "加餐",
          totalCalories: 120,
          eatenAt: "15:40",
          foods: [{ id: "fruit", name: "蓝莓水果杯", amount: "90克", caloriesLabel: "120千卡", thumb: "fruit" }],
        },
        {
          key: "dinner",
          label: "晚餐",
          totalCalories: 300,
          eatenAt: "18:18",
          foods: [{ id: "porridge", name: "南瓜粥", amount: "220克", caloriesLabel: "300千卡", thumb: "porridge" }],
        },
      ],
    },
    {
      id: "2024-02-29",
      titleDate: "2024年2月29日",
      sheetLabel: "2月29日 周四",
      totalCalories: 1288,
      macros: [
        { key: "carb", label: "碳水", value: "88.6克", color: "#f36f66" },
        { key: "protein", label: "蛋白质", value: "37.2克", color: "#f5c957" },
        { key: "fat", label: "脂肪", value: "24.8克", color: "#43c9a4" },
      ],
      meals: [
        {
          key: "breakfast",
          label: "早餐",
          totalCalories: 310,
          eatenAt: "08:20",
          foods: [{ id: "milk-02", name: "低脂牛奶", amount: "180毫升", caloriesLabel: "110千卡", thumb: "milk" }],
        },
        {
          key: "lunch",
          label: "午餐",
          totalCalories: 520,
          eatenAt: "12:10",
          foods: [{ id: "fish-02", name: "番茄鱼片", amount: "180克", caloriesLabel: "520千卡", thumb: "fish" }],
        },
        {
          key: "snack",
          label: "加餐",
          totalCalories: 138,
          eatenAt: "15:25",
          foods: [{ id: "fruit-02", name: "苹果切片", amount: "150克", caloriesLabel: "138千卡", thumb: "fruit" }],
        },
        {
          key: "dinner",
          label: "晚餐",
          totalCalories: 320,
          eatenAt: "18:05",
          foods: [{ id: "salad-02", name: "蔬菜沙拉", amount: "200克", caloriesLabel: "320千卡", thumb: "salad" }],
        },
      ],
    },
    {
      id: "2024-02-28",
      titleDate: "2024年2月28日",
      sheetLabel: "2月28日 周三",
      totalCalories: 1196,
      macros: [
        { key: "carb", label: "碳水", value: "78.1克", color: "#f36f66" },
        { key: "protein", label: "蛋白质", value: "35.7克", color: "#f5c957" },
        { key: "fat", label: "脂肪", value: "20.6克", color: "#43c9a4" },
      ],
      meals: [
        {
          key: "breakfast",
          label: "早餐",
          totalCalories: 280,
          eatenAt: "08:08",
          foods: [{ id: "porridge-02", name: "小米粥", amount: "200克", caloriesLabel: "280千卡", thumb: "porridge" }],
        },
        {
          key: "lunch",
          label: "午餐",
          totalCalories: 488,
          eatenAt: "12:32",
          foods: [{ id: "egg-02", name: "鸡蛋蔬菜卷", amount: "160克", caloriesLabel: "488千卡", thumb: "egg" }],
        },
        {
          key: "snack",
          label: "加餐",
          totalCalories: 0,
          foods: [],
        },
        {
          key: "dinner",
          label: "晚餐",
          totalCalories: 428,
          eatenAt: "18:22",
          foods: [{ id: "bread-02", name: "全麦吐司", amount: "120克", caloriesLabel: "428千卡", thumb: "bread" }],
        },
      ],
    },
  ] as DietRecordDay[],
};

export default mock;
