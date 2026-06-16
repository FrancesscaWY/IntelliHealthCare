import doctorAvatar from "@/assets/community/activities/people2.png";

const mock = {
  doctor: {
    name: "王医生",
    title: "康复科主治医师",
    status: "在线",
    avatar: doctorAvatar
  },
  quickQuestions: ["最近血压偏高怎么办？", "康复训练一天几次？", "药可以饭后吃吗？"],
  messages: [
    {
      id: 1,
      from: "doctor",
      type: "text",
      content: "您好，我是王医生。您可以告诉我现在主要想咨询哪方面的问题？",
      time: "09:20"
    },
    {
      id: 2,
      from: "me",
      type: "text",
      content: "最近做康复训练后手臂有点酸，正常吗？",
      time: "09:21"
    },
    {
      id: 3,
      from: "doctor",
      type: "text",
      content: "轻微酸胀比较常见，建议先降低强度，训练后做热敷。如果出现持续疼痛或麻木，需要及时线下评估。",
      time: "09:22"
    }
  ]
};

export default mock;
