export interface DiseaseGuideMockDepartment {
  id: string;
  name: string;
}

export interface DiseaseGuideMockItem {
  id: string;
  diseaseId: string;
  title: string;
  summary: string;
  departmentId: string;
  departmentName: string;
}

const mock: {
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  departments: DiseaseGuideMockDepartment[];
  diseases: DiseaseGuideMockItem[];
} = {
  title: "疾病宝典",
  searchPlaceholder: "搜索疾病名称",
  emptyText: "暂无相关疾病内容",
  departments: [
    { id: "dept_endocrine", name: "内分泌科" },
    { id: "dept_cardio", name: "心血管科" },
    { id: "dept_neuro", name: "神经内科" }
  ],
  diseases: [
    {
      id: "disease-card-1",
      diseaseId: "disease_diabetes",
      title: "2型糖尿病",
      summary: "关注血糖控制、饮食结构和长期随访管理。",
      departmentId: "dept_endocrine",
      departmentName: "内分泌科"
    },
    {
      id: "disease-card-2",
      diseaseId: "disease_hypertension",
      title: "高血压",
      summary: "适合长期监测血压、减盐和规范用药的人群。",
      departmentId: "dept_cardio",
      departmentName: "心血管科"
    },
    {
      id: "disease-card-3",
      diseaseId: "disease_stroke",
      title: "脑卒中",
      summary: "重点关注早期识别、复诊和家庭康复训练。",
      departmentId: "dept_neuro",
      departmentName: "神经内科"
    }
  ]
};

export default mock;
