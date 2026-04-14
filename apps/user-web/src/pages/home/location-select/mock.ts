const mock = {
  title: "选择地区",
  currentCity: "上海",
  hotCities: ["北京", "上海", "广州", "深圳", "青岛", "苏州", "重庆", "成都", "杭州"],
  indexLetters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  cityGroups: [
    {
      letter: "A",
      cities: ["阿巴嘎旗", "阿巴嘎旗", "阿巴嘎旗", "阿巴嘎旗", "阿巴嘎旗", "阿巴嘎旗", "阿巴嘎旗"],
    },
    {
      letter: "B",
      cities: ["北京", "保定", "包头", "宝鸡", "北海", "滨州"],
    },
    {
      letter: "C",
      cities: ["成都", "重庆", "长沙", "常州", "长春", "沧州"],
    },
  ],
};

export default mock;
