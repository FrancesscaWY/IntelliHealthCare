# API前端接入说明文档

  1. [Swagger](http://server.mctown.online:8190/api/v1/docs#/)网站：测试后端服务是否正常启动；API状态测试；API分类模块；问题反馈。
  2. API文档：API分类、名称、含义、使用方式。
  3. API-前端网页映射汇总表：API分类模块与前端页面的映射关系。
   
## 操作规范
1. 找到自己负责的模块
2. 根据API-前端映射表找到对应的接入页
3. 根据Swagger/API文档上找到负责模型涉及的API
4. 根据具体的逻辑关系将API接入前端页面
5. 问题反馈：通过Swagger提交Github Issue，规范符合模板，包括：
   -  API访问失败
   -  API返回错误
   -  前端需要的数据API没有正常提供
   -  其他问题

## API-前端网页映射汇总表

### 系统层
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 系统层 / 系统检查 | `-` | `-` |
| 系统层 / 公开协议 | `user-web/auth/login` | `登录页/隐私政策` |
| 系统层 / 公开协议 | `admin-web/auth/login` | `后台登录页/隐私政策` |

### 用户端/用户认证
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 用户认证 | `user-web/auth/login` | `启动引导页/登录页` |
| 用户端 / 用户认证 | `user-web/auth/forgot-password` | `登录页/忘记密码页` |
| 用户端 / 用户认证 | `user-web/auth/reset-password` | `登录页/忘记密码页/设置密码页` |
| 用户端 / 用户认证 | `user-web/home/MyJ/setting` | `首页/我的页/设置页` |

### 用户端/用户中心
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 用户中心 | `user-web/auth/real-name` | `登录页/实名认证页` |
| 用户端 / 用户中心 | `user-web/home/mine` | `首页/我的页` |
| 用户端 / 用户中心 | `user-web/home/profile` | `首页/我的页/个人主页` |
| 用户端 / 用户中心 | `user-web/home/MyJ/profile-info` | `首页/我的页/个人资料页` |
| 用户端 / 用户中心 | `user-web/home/MyJ/account-security` | `首页/我的页/账号与安全页` |
| 用户端 / 用户中心 | `user-web/home/MyJ/message-settings` | `首页/我的页/消息设置页` |
| 用户端 / 用户中心 | `user-web/home/MyJ/integration` | `首页/我的页/我的积分页` |
| 用户端 / 用户中心 | `user-web/home/MyJ/myfoot` | `首页/我的页/我的足迹页` |
| 用户端 / 用户中心 | `user-web/home/MyJ/myactivity` | `首页/我的页/我参加的活动页` |
| 用户端 / 用户中心 | `user-web/home/MyJ/setting` | `首页/我的页/设置页` |

### 用户端/应用入口
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 首页 | `user-web/home/dashboard` | `首页` |
| 用户端 / 定位 | `user-web/home/dashboard` | `首页` |
| 用户端 / 定位 | `user-web/home/location-select` | `首页/选择地区页` |
| 用户端 / 搜索 | `user-web/home/dashboard` | `首页` |
| 用户端 / 搜索 | `user-web/home/search` | `首页/搜索页` |

### 用户端/家庭与地址 
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 家庭与地址 | `user-web/service/booking` | `首页/服务详情页/预约服务页` |
| 用户端 / 家庭与地址 | `user-web/service/order-confirm` | `首页/服务详情页/预约服务页/订单确认页` |
| 用户端 / 家庭与地址 | `user-web/service/order-edit` | `首页/我的页/我的订单页/订单详情页/修改订单信息页` |

### 用户端/健康档案
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 健康档案 | `user-web/healthdocs/health-records` | `首页/健康档案页` |
| 用户端 / 健康档案 | `user-web/healthdocs/basic-info` | `首页/健康档案页/基础信息页` |
| 用户端 / 健康档案 | `user-web/healthdocs/medical-history` | `首页/健康档案页/既往病史页` |

### 用户端/健康数据与设备
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 健康数据与设备 | `user-web/home/dashboard` | `首页` |
| 用户端 / 健康数据与设备 | `user-web/health/health-data` | `首页/健康数据页` |
| 用户端 / 健康数据与设备 | `user-web/health/add-data` | `首页/健康数据页/添加数据页` |
| 用户端 / 健康数据与设备 | `user-web/health/data-steps` | `首页/健康数据页/步数详情页` |
| 用户端 / 健康数据与设备 | `user-web/health/data-heartrate` | `首页/健康数据页/心率详情页` |
| 用户端 / 健康数据与设备 | `user-web/health/data-sleep` | `首页/健康数据页/睡眠页` |
| 用户端 / 健康数据与设备 | `user-web/health/data-weight` | `首页/健康数据页/体重页` |
| 用户端 / 健康数据与设备 | `user-web/health/data-bloodglucose` | `首页/健康数据页/血糖页` |
| 用户端 / 健康数据与设备 | `user-web/health/data-bloodpressure` | `首页/健康数据页/血压页` |
| 用户端 / 健康数据与设备 | `user-web/health/data-spo2` | `首页/健康数据页/血氧页` |
| 用户端 / 健康数据与设备 | `user-web/health/data-pressure` | `首页/健康数据页/压力页` |
| 用户端 / 健康数据与设备 | `user-web/health/device-center` | `首页/设备中心页` |
| 用户端 / 健康数据与设备 | `user-web/health/device-detail` | `首页/设备中心页/设备详情页` |
| 用户端 / 健康数据与设备 | `user-web/health/device-add` | `首页/设备中心页/添加设备页` |
| 用户端 / 健康数据与设备 | `user-web/health/device-scan` | `首页/设备中心页/添加设备页/扫码绑定页` |
| 用户端 / 健康数据与设备 | `user-web/health/device-password` | `首页/设备中心页/设备详情页/设备密码页` |
| 用户端 / 健康数据与设备 | `user-web/health/heart-rate-settings` | `首页/设备中心页/设备详情页/心率设置页` |
| 用户端 / 健康数据与设备 | `user-web/health/medication-info` | `首页/用药信息页` |
| 用户端 / 健康数据与设备 | `user-web/health/medication-add` | `首页/用药信息页/添加用药信息页` |
| 用户端 / 健康数据与设备 | `user-web/health/medication-edit` | `首页/用药信息页/编辑用药提醒页` |

### 用户端/健康膳食与自测
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 健康膳食与自测 | `user-web/health/diet-plan` | `首页/健康膳食页` |
| 用户端 / 健康膳食与自测 | `user-web/health/diet-recipe-detail` | `首页/健康膳食页/食谱详情页` |
| 用户端 / 健康膳食与自测 | `user-web/diet-record` | `首页/饮食记录页` |
| 用户端 / 健康膳食与自测 | `user-web/diet-record/add-record` | `首页/饮食记录页/添加记录页` |
| 用户端 / 健康膳食与自测 | `user-web/diet-record/history-data` | `首页/饮食记录页/历史数据页` |
| 用户端 / 健康膳食与自测 | `user-web/health/self-test` | `首页/健康自测页` |

### 用户端/服务目录
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 服务目录 | `user-web/home/dashboard` | `首页` |
| 用户端 / 服务目录 | `user-web/service/home-care` | `首页/家政护理页` |
| 用户端 / 服务目录 | `user-web/service/daily-clean` | `首页/家政护理页/日常清洁页` |
| 用户端 / 服务目录 | `user-web/service/home-care-detail` | `首页/家政护理页/服务详情页` |
| 用户端 / 服务目录 | `user-web/service/rehab-therapy` | `首页/康复理疗页` |
| 用户端 / 服务目录 | `user-web/service/rehab-therapy-detail` | `首页/康复理疗页/康复理疗项目详情页` |
| 用户端 / 服务目录 | `user-web/service/home-exam` | `首页/上门体检页` |
| 用户端 / 服务目录 | `user-web/service/home-exam-detail` | `首页/上门体检页/上门体检项目详情页` |
| 用户端 / 服务目录 | `user-web/service/elderly-care` | `首页/养老机构页` |
| 用户端 / 服务目录 | `user-web/service/elderly-care-detail` | `首页/养老机构页/养老机构详情页` |

### 用户端/订单与预约
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 订单与预约 | `user-web/home/mine` | `首页/我的页` |
| 用户端 / 订单与预约 | `user-web/service/booking` | `首页/服务详情页/预约服务页` |
| 用户端 / 订单与预约 | `user-web/service/order-confirm` | `首页/服务详情页/预约服务页/订单确认页` |
| 用户端 / 订单与预约 | `user-web/service/home-care-orders` | `首页/我的页/家政护理订单页` |
| 用户端 / 订单与预约 | `user-web/orders/rehab-therapy` | `首页/我的页/我的订单页` |
| 用户端 / 订单与预约 | `user-web/service/order-detail` | `首页/我的页/我的订单页/订单详情页` |
| 用户端 / 订单与预约 | `user-web/service/order-edit` | `首页/我的页/我的订单页/订单详情页/修改订单信息页` |
| 用户端 / 订单与预约 | `user-web/service/service-track` | `首页/我的页/我的订单页/订单详情页/服务跟踪页` |
| 用户端 / 订单与预约 | `user-web/orders/checkup-voucher` | `首页/我的页/我的订单页/服务券码页` |
| 用户端 / 订单与预约 | `user-web/orders/willservice/service-record` | `首页/我的页/我的订单页/服务记录页` |
| 用户端 / 订单与预约 | `user-web/orders/willservice/assessment-report` | `首页/我的页/我的订单页/评估报告页` |
| 用户端 / 订单与预约 | `user-web/orders/willservice/rehab-report` | `首页/我的页/我的订单页/康复报告页` |

### 用户端/支付
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 支付 | `user-web/service/payment` | `首页/服务详情页/预约服务页/订单确认页/支付订单页` |
| 用户端 / 支付 | `user-web/service/payment-result` | `首页/服务详情页/预约服务页/订单确认页/支付订单页/支付结果页` |

### 用户端/体检报告
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 体检报告 | `user-web/healthdocs/checkup-reports` | `首页/健康档案页/体检报告页` |
| 用户端 / 体检报告 | `user-web/healthdocs/report-upload` | `首页/健康档案页/体检报告页/上传报告页` |
| 用户端 / 体检报告 | `user-web/healthdocs/report-detail` | `首页/健康档案页/体检报告页/报告详情页` |
| 用户端 / 体检报告 | `user-web/healthdocs/report-interpretation` | `首页/健康档案页/体检报告页/报告详情页/报告解读页` |
| 用户端 / 体检报告 | `user-web/orders/checkup-history` | `首页/我的页/我的订单页/历史报告页` |
| 用户端 / 体检报告 | `user-web/orders/checkup-upload` | `首页/我的页/我的订单页/添加报告页` |
| 用户端 / 体检报告 | `user-web/orders/checkup-report` | `首页/我的页/我的订单页/查看报告页` |


### 用户端/文件上传
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 文件上传 | `user-web/healthdocs/report-upload` | `首页/健康档案页/体检报告页/上传报告页` |
| 用户端 / 文件上传 | `user-web/orders/checkup-upload` | `首页/我的页/我的订单页/添加报告页` |
| 用户端 / 文件上传 | `user-web/community/publish` | `首页/生活圈页/发布动态页` |
| 用户端 / 文件上传 | `user-web/home/doctor-chat` | `首页/消息页/医生咨询页` |
| 用户端 / 文件上传 | `user-web/home/MyJ/profile-info` | `首页/我的页/个人资料页` |

### 用户端/消息与咨询
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 消息与咨询 | `user-web/home/message` | `首页/消息页` |
| 用户端 / 消息与咨询 | `user-web/home/doctor-chat` | `首页/消息页/医生咨询页` |
| 用户端 / 消息与咨询 | `user-web/home/message-comment-detail` | `首页/消息页/评论回复页` |
| 用户端 / 消息与咨询 | `user-web/home/message-like-detail` | `首页/消息页/赞和收藏页` |

### 用户端/健康内容
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 健康内容 | `user-web/home/dashboard` | `首页` |
| 用户端 / 健康内容 | `user-web/content/health-news` | `首页/健康资讯页` |
| 用户端 / 健康内容 | `user-web/content/health-news-detail` | `首页/健康资讯页/资讯详情页` |
| 用户端 / 健康内容 | `user-web/content/health-lecture` | `首页/健康讲堂页` |
| 用户端 / 健康内容 | `user-web/content/health-lecture-detail` | `首页/健康讲堂页/健康讲堂详情页` |
| 用户端 / 健康内容 | `user-web/content/disease-guide` | `首页/疾病宝典页` |
| 用户端 / 健康内容 | `user-web/content/disease-detail` | `首页/疾病宝典页/疾病详情页` |

### 用户端/社区与活动
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / 社区与活动 | `user-web/community/circle` | `首页/生活圈页` |
| 用户端 / 社区与活动 | `user-web/community/publish` | `首页/生活圈页/发布动态页` |
| 用户端 / 社区与活动 | `user-web/community/post-detail` | `首页/生活圈页/帖子详情页` |
| 用户端 / 社区与活动 | `user-web/community/senior-activities` | `首页/生活圈页/老年活动页` |
| 用户端 / 社区与活动 | `user-web/community/senior-activity-detail` | `首页/生活圈页/老年活动页/活动详情页` |
| 用户端 / 社区与活动 | `user-web/home/MyJ/myactivity` | `首页/我的页/我参加的活动页` |

### 用户端/AI助手
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 用户端 / AI 助手 | `user-web/home/dashboard` | `首页` |
| 用户端 / AI 助手 | `user-web/home/assistant-chat` | `首页/AI助手页` |
| 用户端 / AI 助手 | `user-web/service/home-care-recommend-waiting` | `首页/AI助手页/家政智能推荐等待页` |
| 用户端 / AI 助手 | `user-web/service/home-care-recommend` | `首页/AI助手页/家政项目推荐页` |
| 用户端 / AI 助手 | `user-web/service/home-exam-recommend-waiting` | `首页/AI助手页/上门体检智能推荐等待页` |
| 用户端 / AI 助手 | `user-web/service/home-exam-recommend` | `首页/AI助手页/上门体检项目推荐页` |
| 用户端 / AI 助手 | `user-web/service/rehab-recommend-waiting` | `首页/AI助手页/康复智能推荐等待页` |
| 用户端 / AI 助手 | `user-web/service/rehab-recommend` | `首页/AI助手页/康复项目推荐页` |
| 用户端 / AI 助手 | `user-web/orders/checkup-ai-waiting` | `首页/我的页/我的订单页/AI评估页` |
| 用户端 / AI 助手 | `user-web/orders/checkup-ai-analysis` | `首页/我的页/我的订单页/报告分析页` |

### 后台/系统端
| 模块名称 | 英文页面地址 | 中文访问路径 |
| --- | --- | --- |
| 后台端 / 后台认证 | `admin-web/auth/login` | `后台登录页` |
| 后台端 / 后台工作台 | `admin-web/dashboard/overview` | `后台首页` |
| 后台端 / 后台工作台 | `admin-web/elder/member-list` | `后台首页/长者档案页` |
| 后台端 / 后台工作台 | `admin-web/elder/member-detail` | `后台首页/长者档案页/用户详情页` |
| 后台端 / 后台工作台 | `admin-web/dashboard/work-order` | `后台首页/工单管理页` |
| 后台端 / 后台订单调度 | `admin-web/dashboard/order-list` | `后台首页/全部订单页` |
| 后台端 / 后台订单调度 | `admin-web/dashboard/order-detail` | `后台首页/全部订单页/订单详情页` |
| 后台端 / 后台订单调度 | `admin-web/service/order-dispatch` | `后台首页/服务调度页` |
| 后台端 / 后台订单调度 | `admin-web/dashboard/booking-board` | `后台首页/预约看板页` |
| 后台端 / 后台订单调度 | `admin-web/dashboard/work-order` | `后台首页/工单管理页` |
| 后台端 / 后台订单调度 | `admin-web/dashboard/after-sale` | `后台首页/售后管理页` |
| 后台端 / 后台订单调度 | `admin-web/dashboard/after-sale-detail` | `后台首页/售后管理页/售后详情页` |
| 后台端 / 后台报告审核 | `admin-web/elder/report-management` | `后台首页/报告管理页` |
| 内部治理层 / 智能体与 RAG | `-` | `-` |
