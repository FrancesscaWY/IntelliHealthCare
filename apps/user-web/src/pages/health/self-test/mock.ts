export interface SelfTestOption {
  label: string
  score: number
}

export interface SelfTestQuestion {
  id: number
  text: string
  helper: string
  options: SelfTestOption[]
}

export interface SelfTestProject {
  id: string
  title: string
  category: string
  intro: string
  measuredCount: number
  accent: string
  questions: SelfTestQuestion[]
  resultAdvice: {
    low: string
    medium: string
    high: string
  }
}

const yesNoMild = [
  { label: '几乎没有', score: 0 },
  { label: '偶尔出现', score: 1 },
  { label: '经常出现', score: 2 },
  { label: '最近明显加重', score: 3 },
]

const mock = {
  tabs: [
    { key: 'tests', label: '健康自测' },
    { key: 'records', label: '我的测评' },
  ],
  projects: [
    {
      id: 'diabetes',
      title: '2型糖尿病风险筛查',
      category: '代谢健康',
      intro: '从口渴、体重变化、家族史和生活方式四个方向，快速了解糖代谢异常风险。',
      measuredCount: 400,
      accent: '#63d7b4',
      questions: [
        { id: 1, text: '近一个月是否比以前更容易口渴或饮水量增多？', helper: '不包含天气炎热、运动后的短暂口渴。', options: yesNoMild },
        { id: 2, text: '夜间起夜排尿次数是否明显增加？', helper: '重点观察持续一周以上的变化。', options: yesNoMild },
        { id: 3, text: '近期是否出现原因不明的体重下降？', helper: '没有刻意节食或增加运动的情况下。', options: yesNoMild },
        { id: 4, text: '父母或兄弟姐妹中是否有人确诊糖尿病？', helper: '直系亲属风险权重更高。', options: [{ label: '没有', score: 0 }, { label: '不确定', score: 1 }, { label: '有一位', score: 2 }, { label: '两位及以上', score: 3 }] },
        { id: 5, text: '每周含糖饮料或甜点摄入频率如何？', helper: '包括奶茶、果汁、甜饮、蛋糕等。', options: [{ label: '很少', score: 0 }, { label: '每周1-2次', score: 1 }, { label: '每周3-5次', score: 2 }, { label: '几乎每天', score: 3 }] },
        { id: 6, text: '日常久坐时间是否较长？', helper: '连续坐着看电视、打牌、办公都算。', options: [{ label: '少于3小时', score: 0 }, { label: '3-5小时', score: 1 }, { label: '5-8小时', score: 2 }, { label: '超过8小时', score: 3 }] },
      ],
      resultAdvice: {
        low: '目前糖代谢风险较低，建议保持规律饮食和每周运动。',
        medium: '存在一定糖代谢风险，建议关注空腹血糖，并减少高糖饮食。',
        high: '风险较高，建议尽快进行空腹血糖或糖化血红蛋白检测，并咨询医生。',
      },
    },
    {
      id: 'hypertension',
      title: '高血压风险自测',
      category: '心血管',
      intro: '结合头晕、睡眠、盐摄入和既往血压情况，评估血压管理压力。',
      measuredCount: 286,
      accent: '#6d74f2',
      questions: [
        { id: 1, text: '最近是否经常头胀、头晕或后颈发紧？', helper: '尤其关注清晨或情绪紧张后。', options: yesNoMild },
        { id: 2, text: '家中测量血压是否曾超过140/90mmHg？', helper: '以安静休息后测量结果为准。', options: [{ label: '没有', score: 0 }, { label: '偶尔一次', score: 1 }, { label: '多次出现', score: 2 }, { label: '已确诊高血压', score: 3 }] },
        { id: 3, text: '日常饮食口味是否偏咸？', helper: '咸菜、腌制品、重口味外卖也算。', options: yesNoMild },
        { id: 4, text: '近两周睡眠质量如何？', helper: '入睡困难、早醒、睡醒疲惫都算睡眠问题。', options: [{ label: '较好', score: 0 }, { label: '偶尔不好', score: 1 }, { label: '经常不好', score: 2 }, { label: '严重影响白天状态', score: 3 }] },
        { id: 5, text: '是否有吸烟或长期二手烟暴露？', helper: '包括家庭成员长期在室内吸烟。', options: [{ label: '没有', score: 0 }, { label: '偶尔接触', score: 1 }, { label: '经常接触', score: 2 }, { label: '本人吸烟', score: 3 }] },
      ],
      resultAdvice: {
        low: '血压风险较低，建议每月固定测量血压并保持低盐饮食。',
        medium: '存在血压升高倾向，建议连续记录7天家庭血压。',
        high: '高血压风险较高，建议及时就医评估，避免自行停药或加药。',
      },
    },
    {
      id: 'stroke',
      title: '脑卒中预警筛查',
      category: '神经健康',
      intro: '关注肢体无力、言语变化、短暂视物异常等信号，帮助识别卒中预警风险。',
      measuredCount: 198,
      accent: '#ff7d91',
      questions: [
        { id: 1, text: '是否出现过一侧手脚突然无力或麻木？', helper: '即使几分钟后缓解，也需要重视。', options: yesNoMild },
        { id: 2, text: '近期是否出现说话含糊、理解困难或口角歪斜？', helper: '家人观察到的变化也算。', options: yesNoMild },
        { id: 3, text: '是否曾短暂视物模糊、黑蒙或重影？', helper: '尤其是突然发生、随后恢复的情况。', options: yesNoMild },
        { id: 4, text: '是否合并高血压、糖尿病、房颤或高血脂？', helper: '这些都是卒中重要危险因素。', options: [{ label: '没有', score: 0 }, { label: '有1项', score: 1 }, { label: '有2项', score: 2 }, { label: '有3项及以上', score: 3 }] },
        { id: 5, text: '是否经常忘记按时服用心脑血管相关药物？', helper: '包括降压、降糖、抗凝、调脂药。', options: yesNoMild },
        { id: 6, text: '是否曾有突然剧烈头痛并伴随恶心或站立不稳？', helper: '不同于平时头痛的突发症状更需警惕。', options: yesNoMild },
        { id: 7, text: '日常是否缺少规律运动？', helper: '每周少于3次、每次少于20分钟可视为不足。', options: yesNoMild },
      ],
      resultAdvice: {
        low: '卒中预警风险较低，但仍建议控制血压、血糖和血脂。',
        medium: '存在部分预警因素，建议完善心脑血管风险评估。',
        high: '风险较高，如出现口角歪斜、肢体无力或言语不清，请立即就医。',
      },
    },
    {
      id: 'dementia',
      title: '认知功能早筛',
      category: '脑健康',
      intro: '通过记忆、方向感、日常处理能力和情绪变化，了解认知下降可能性。',
      measuredCount: 312,
      accent: '#f0c64b',
      questions: [
        { id: 1, text: '是否经常忘记刚发生的事情或反复询问同一问题？', helper: '偶尔忘记钥匙不等于异常，关注频率变化。', options: yesNoMild },
        { id: 2, text: '是否在熟悉环境中迷路或分不清日期？', helper: '例如常去的菜场、小区路线。', options: yesNoMild },
        { id: 3, text: '处理钱款、买菜找零或服药安排是否变困难？', helper: '与过去相比是否明显吃力。', options: yesNoMild },
        { id: 4, text: '家人是否发现您最近情绪或性格变化明显？', helper: '例如易怒、淡漠、焦虑、猜疑。', options: yesNoMild },
        { id: 5, text: '是否越来越不愿参与社交或兴趣活动？', helper: '排除身体不适导致的短期减少。', options: yesNoMild },
      ],
      resultAdvice: {
        low: '认知风险较低，建议保持社交、阅读和规律运动。',
        medium: '存在轻度认知下降信号，建议家人共同观察并进行记忆训练。',
        high: '认知风险较高，建议到记忆门诊或神经内科进一步评估。',
      },
    },
    {
      id: 'depression',
      title: '情绪抑郁风险自评',
      category: '心理健康',
      intro: '评估情绪低落、兴趣下降、睡眠和精力变化，帮助识别近期心理压力。',
      measuredCount: 256,
      accent: '#4aa4ff',
      questions: [
        { id: 1, text: '近两周是否经常感到情绪低落、难过或空落落？', helper: '关注持续时间和对生活的影响。', options: yesNoMild },
        { id: 2, text: '是否对原本喜欢的事情明显提不起兴趣？', helper: '例如散步、看电视、见朋友。', options: yesNoMild },
        { id: 3, text: '睡眠是否出现明显变差或过多？', helper: '入睡困难、早醒、睡不醒都包含。', options: yesNoMild },
        { id: 4, text: '是否经常感到疲惫、没有力气？', helper: '排除明确的体力劳动或急性疾病。', options: yesNoMild },
        { id: 5, text: '是否觉得自己没有价值或拖累家人？', helper: '如果有伤害自己的想法，请立即寻求帮助。', options: yesNoMild },
        { id: 6, text: '注意力是否明显下降，做事容易走神？', helper: '例如看书、看电视、做饭时难以集中。', options: yesNoMild },
      ],
      resultAdvice: {
        low: '情绪风险较低，建议保持规律作息和稳定社交。',
        medium: '近期情绪压力偏高，建议与家人沟通并增加户外活动。',
        high: '抑郁风险较高，建议尽快联系心理医生或精神科专业人员。',
      },
    },
  ] as SelfTestProject[],
}

export default mock
