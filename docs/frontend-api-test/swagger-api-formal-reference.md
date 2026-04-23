# 智诊康养 API 正式文档

## 文档约定

| 项目 | 说明 |
| --- | --- |
| Base URL | `http://server.mctown.online:8190/api/v1` |
| Swagger 地址 | `http://server.mctown.online:8190/api/v1/docs` |
| 用户端鉴权 | `Authorization: Bearer APP_TOKEN` |
| 后台端鉴权 | `Authorization: Bearer ADMIN_TOKEN` |
| 内部治理层鉴权 | `Authorization: Bearer ADMIN_TOKEN`，并满足内部访问校验要求 |
| 参数说明 | 表格中的请求参数按 `Path`、`Query`、`Body` 三类标识；未列出则表示无需业务参数 |
| 响应说明 | 响应示例仅展示关键字段，统一响应包裹为 `code`、`message`、`data` |

统一成功响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 系统层 / 系统检查

鉴权：`无需鉴权`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取服务健康状态</td><td>用于检查当前服务及其依赖组件的可用状态。</td><td><code>GET</code></td><td><code>/api/v1/system/health</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;status&quot;: &quot;ok&quot;,
    &quot;services&quot;: {
      &quot;database&quot;: &quot;up&quot;,
      &quot;redis&quot;: &quot;up&quot;,
      &quot;objectStorage&quot;: &quot;up&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>获取系统架构摘要</td><td>用于查看当前服务的模块组成、技术栈与架构摘要。</td><td><code>GET</code></td><td><code>/api/v1/system/architecture</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;appName&quot;: &quot;IntelliHealthCare&quot;,
    &quot;apiPrefix&quot;: &quot;/api/v1&quot;,
    &quot;modules&quot;: [
      &quot;auth&quot;,
      &quot;users&quot;,
      &quot;orders&quot;,
      &quot;agents&quot;
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 系统层 / 公开协议

鉴权：`无需鉴权`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取隐私协议</td><td>用于获取登录前可访问的隐私协议正文。</td><td><code>GET</code></td><td><code>/api/v1/app/agreements/privacy</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;title&quot;: &quot;隐私协议&quot;,
    &quot;version&quot;: &quot;2026-04&quot;,
    &quot;content&quot;: &quot;...&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 用户认证

鉴权：`无需鉴权`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>发送短信验证码</td><td>用于发送登录或密码重置所需的短信验证码。</td><td><code>POST</code></td><td><code>/api/v1/app/auth/sms/send</code></td><td><strong>Body</strong><br>phone: string<br>purpose: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;sent&quot;: true,
    &quot;purpose&quot;: &quot;login&quot;
  }
}</code></pre></td></tr>
    <tr><td>用户端密码登录</td><td>用于校验用户账号密码并返回用户端访问令牌。</td><td><code>POST</code></td><td><code>/api/v1/app/auth/login/password</code></td><td><strong>Body</strong><br>phone: string<br>password: string<br>agreePrivacy: boolean<br>deviceId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;accessToken&quot;: &quot;ACCESS_TOKEN&quot;,
    &quot;refreshToken&quot;: &quot;REFRESH_TOKEN&quot;,
    &quot;expiresIn&quot;: 7200,
    &quot;user&quot;: {
      &quot;id&quot;: &quot;user_001&quot;,
      &quot;role&quot;: &quot;USER&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>用户端短信登录</td><td>用于校验短信验证码并返回用户端访问令牌。</td><td><code>POST</code></td><td><code>/api/v1/app/auth/login/sms</code></td><td><strong>Body</strong><br>phone: string<br>code: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;accessToken&quot;: &quot;ACCESS_TOKEN&quot;,
    &quot;refreshToken&quot;: &quot;REFRESH_TOKEN&quot;,
    &quot;expiresIn&quot;: 7200,
    &quot;user&quot;: {
      &quot;id&quot;: &quot;user_001&quot;,
      &quot;role&quot;: &quot;USER&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>用户端第三方登录</td><td>用于处理第三方身份登录并返回用户端访问令牌。</td><td><code>POST</code></td><td><code>/api/v1/app/auth/login/third-party</code></td><td><strong>Body</strong><br>phone?: string<br>provider: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;accessToken&quot;: &quot;ACCESS_TOKEN&quot;,
    &quot;refreshToken&quot;: &quot;REFRESH_TOKEN&quot;,
    &quot;expiresIn&quot;: 7200,
    &quot;user&quot;: {
      &quot;id&quot;: &quot;user_001&quot;,
      &quot;role&quot;: &quot;USER&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>校验重置密码验证码</td><td>用于校验重置密码场景中的短信验证码是否有效。</td><td><code>POST</code></td><td><code>/api/v1/app/auth/password/verify-code</code></td><td><strong>Body</strong><br>phone: string<br>code: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;verified&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>重置密码</td><td>用于在验证码校验通过后重置登录密码。</td><td><code>POST</code></td><td><code>/api/v1/app/auth/password/reset</code></td><td><strong>Body</strong><br>newPassword: string<br>phone: string<br>code: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reset&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>刷新用户端 Token</td><td>用于使用 refreshToken 换取新的用户端访问令牌。</td><td><code>POST</code></td><td><code>/api/v1/app/auth/token/refresh</code></td><td><strong>Body</strong><br>refreshToken: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;accessToken&quot;: &quot;NEW_ACCESS_TOKEN&quot;,
    &quot;refreshToken&quot;: &quot;NEW_REFRESH_TOKEN&quot;,
    &quot;expiresIn&quot;: 7200
  }
}</code></pre></td></tr>
    <tr><td>用户端退出登录</td><td>用于注销当前用户会话并清理登录态。</td><td><code>POST</code></td><td><code>/api/v1/app/auth/logout</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;loggedOut&quot;: true
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 用户中心

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取当前登录用户</td><td>用于获取当前登录用户，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;id&quot;: &quot;user_001&quot;,
    &quot;nickname&quot;: &quot;王兰&quot;,
    &quot;mobile&quot;: &quot;13900139000&quot;,
    &quot;role&quot;: &quot;USER&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取个人主页信息</td><td>用于获取个人主页信息，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me/profile</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;nickname&quot;: &quot;王兰&quot;,
    &quot;avatar&quot;: &quot;https://cdn.example.com/avatar.png&quot;,
    &quot;city&quot;: &quot;上海&quot;,
    &quot;gender&quot;: &quot;FEMALE&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取账号与安全信息</td><td>用于获取账号与安全信息，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me/security</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;mobile&quot;: &quot;13900139000&quot;,
    &quot;realNameVerified&quot;: true,
    &quot;securityLevel&quot;: &quot;HIGH&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取设置详情</td><td>用于获取设置详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me/settings</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;messageSettings&quot;: {
      &quot;systemNotice&quot;: true,
      &quot;orderNotice&quot;: true,
      &quot;healthAlert&quot;: true,
      &quot;smsEnabled&quot;: false
    }
  }
}</code></pre></td></tr>
    <tr><td>更新消息设置</td><td>用于更新消息设置，返回更新后的业务结果。</td><td><code>PUT</code></td><td><code>/api/v1/app/users/me/settings/message</code></td><td><strong>Body</strong><br>systemNotice?: boolean<br>orderNotice?: boolean<br>healthAlert?: boolean<br>communityNotice?: boolean<br>smsEnabled?: boolean</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;messageSettings&quot;: {
      &quot;systemNotice&quot;: true,
      &quot;orderNotice&quot;: true,
      &quot;healthAlert&quot;: true,
      &quot;smsEnabled&quot;: false
    }
  }
}</code></pre></td></tr>
    <tr><td>获取积分概览与明细</td><td>用于获取积分概览与明细，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me/points</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;totalPoints&quot;: 1280,
    &quot;list&quot;: [
      {
        &quot;id&quot;: &quot;point_001&quot;,
        &quot;change&quot;: 20,
        &quot;type&quot;: &quot;SIGN_IN&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取我的足迹</td><td>用于获取我的足迹，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me/footprints</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;id&quot;: &quot;fp_001&quot;,
        &quot;title&quot;: &quot;居家康复理疗&quot;,
        &quot;visitedAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>清空我的足迹</td><td>用于清空我的足迹。</td><td><code>DELETE</code></td><td><code>/api/v1/app/users/me/footprints</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;id&quot;: &quot;fp_001&quot;,
        &quot;title&quot;: &quot;居家康复理疗&quot;,
        &quot;visitedAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取我参加的活动</td><td>用于获取我参加的活动，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me/activities</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;activityId&quot;: &quot;act_001&quot;,
        &quot;title&quot;: &quot;社区义诊&quot;,
        &quot;status&quot;: &quot;REGISTERED&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取我的评价列表</td><td>用于获取我的评价列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me/reviews</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;reviewId&quot;: &quot;review_001&quot;,
        &quot;orderId&quot;: &quot;order_001&quot;,
        &quot;score&quot;: 5,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取优惠券列表</td><td>用于获取优惠券列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/users/me/coupons</code></td><td><strong>Query</strong><br>status?: &quot;UNUSED&quot; | &quot;USED&quot; | &quot;EXPIRED&quot;<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;couponId&quot;: &quot;coupon_001&quot;,
        &quot;name&quot;: &quot;新用户优惠券&quot;,
        &quot;status&quot;: &quot;UNUSED&quot;,
        &quot;discountAmount&quot;: 50
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>更新个人资料</td><td>用于更新个人资料，返回更新后的业务结果。</td><td><code>PUT</code></td><td><code>/api/v1/app/users/me/profile</code></td><td><strong>Body</strong><br>nickname?: string<br>avatar?: string<br>city?: string<br>gender?: &quot;MALE&quot; | &quot;FEMALE&quot; | &quot;UNKNOWN&quot;<br>birthday?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;profile&quot;: {
      &quot;nickname&quot;: &quot;王兰&quot;,
      &quot;city&quot;: &quot;上海&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>提交实名认证资料</td><td>用于提交实名认证资料，返回提交后的处理结果。</td><td><code>PUT</code></td><td><code>/api/v1/app/users/me/real-name</code></td><td><strong>Body</strong><br>realName: string<br>idCard: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;verified&quot;: true,
    &quot;realName&quot;: &quot;王兰&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 首页

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取首页聚合数据</td><td>用于获取首页聚合数据，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/home/dashboard</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;banners&quot;: [
      {
        &quot;id&quot;: &quot;banner_001&quot;,
        &quot;title&quot;: &quot;长者健康周&quot;
      }
    ],
    &quot;quickEntries&quot;: [
      {
        &quot;code&quot;: &quot;service&quot;,
        &quot;name&quot;: &quot;服务预约&quot;
      }
    ],
    &quot;cards&quot;: [
      {
        &quot;code&quot;: &quot;medication&quot;,
        &quot;title&quot;: &quot;今日用药提醒&quot;
      }
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 定位

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取当前定位城市</td><td>用于获取当前定位城市，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/locations/current</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;cityCode&quot;: &quot;310100&quot;,
    &quot;cityName&quot;: &quot;上海市&quot;,
    &quot;districtName&quot;: &quot;浦东新区&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取城市地区列表</td><td>用于获取城市地区列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/locations/cities</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;cityCode&quot;: &quot;310100&quot;,
        &quot;cityName&quot;: &quot;上海市&quot;
      },
      {
        &quot;cityCode&quot;: &quot;330100&quot;,
        &quot;cityName&quot;: &quot;杭州市&quot;
      }
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 搜索

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取热搜标签</td><td>用于获取热搜标签，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/search/hot-tags</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      &quot;康复护理&quot;,
      &quot;上门体检&quot;,
      &quot;失眠调理&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取搜索历史</td><td>用于获取搜索历史，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/search/history</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      &quot;康复理疗&quot;,
      &quot;上门护理&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>记录搜索历史</td><td>用于记录搜索历史，返回记录写入结果。</td><td><code>POST</code></td><td><code>/api/v1/app/search/history</code></td><td><strong>Body</strong><br>keyword: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;saved&quot;: true,
    &quot;keyword&quot;: &quot;康复理疗&quot;
  }
}</code></pre></td></tr>
    <tr><td>清空搜索历史</td><td>用于清空搜索历史。</td><td><code>DELETE</code></td><td><code>/api/v1/app/search/history</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;cleared&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>执行全局搜索</td><td>用于执行全局搜索。</td><td><code>GET</code></td><td><code>/api/v1/app/search/global</code></td><td><strong>Query</strong><br>keyword: string<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;type&quot;: &quot;SERVICE&quot;,
        &quot;id&quot;: &quot;srv_001&quot;,
        &quot;title&quot;: &quot;脑卒中康复理疗&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 家庭与地址

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取家属绑定关系</td><td>用于获取家属绑定关系，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/family/bindings</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;id&quot;: &quot;binding_001&quot;,
        &quot;elderId&quot;: &quot;elder_001&quot;,
        &quot;relation&quot;: &quot;DAUGHTER&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取地址列表</td><td>用于获取地址列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/family/addresses</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;addressId&quot;: &quot;addr_001&quot;,
        &quot;contactName&quot;: &quot;王兰&quot;,
        &quot;phone&quot;: &quot;13900139000&quot;,
        &quot;isDefault&quot;: true,
        &quot;fullAddress&quot;: &quot;上海市浦东新区世纪大道 100 号&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>新增地址</td><td>用于新增地址，返回新增后的业务对象。</td><td><code>POST</code></td><td><code>/api/v1/app/family/addresses</code></td><td><strong>Body</strong><br>label?: string<br>elderId?: string<br>receiverName: string<br>receiverPhone: string<br>province: string<br>city: string<br>district: string<br>street?: string<br>detailAddress: string<br>longitude?: number<br>latitude?: number<br>isDefault?: boolean</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;addressId&quot;: &quot;addr_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>更新地址</td><td>用于更新地址，返回更新后的业务结果。</td><td><code>PUT</code></td><td><code>/api/v1/app/family/addresses/:addressId</code></td><td><strong>Path</strong><br>addressId: string<hr><strong>Body</strong><br>label?: string<br>elderId?: string<br>receiverName: string<br>receiverPhone: string<br>province: string<br>city: string<br>district: string<br>street?: string<br>detailAddress: string<br>longitude?: number<br>latitude?: number<br>isDefault?: boolean</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;addressId&quot;: &quot;addr_001&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 健康档案

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取健康档案摘要</td><td>健康档案首页先调用该接口，查看档案总览、风险标签、最近提醒等聚合信息。</td><td><code>GET</code></td><td><code>/api/v1/app/health/archive/summary</code></td><td><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;profileCompleteRate&quot;: 0.92,
    &quot;riskTags&quot;: [
      &quot;高血压&quot;
    ],
    &quot;reminders&quot;: [
      {
        &quot;id&quot;: &quot;remind_001&quot;,
        &quot;text&quot;: &quot;建议补充近期血压记录&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取基础信息</td><td>基础信息编辑页进入时先调用，用于回填姓名、生日、身高、体重、紧急联系人等字段。</td><td><code>GET</code></td><td><code>/api/v1/app/health/archive/basic-info</code></td><td><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;elderName&quot;: &quot;王建国&quot;,
    &quot;gender&quot;: &quot;MALE&quot;,
    &quot;birthday&quot;: &quot;1948-03-12&quot;,
    &quot;bloodType&quot;: &quot;A&quot;
  }
}</code></pre></td></tr>
    <tr><td>更新基础信息</td><td>基础信息保存按钮对应接口。建议先通过 GET 接口拿到原始数据，再按页面表单回传修改后的字段。</td><td><code>PUT</code></td><td><code>/api/v1/app/health/archive/basic-info</code></td><td><strong>Query</strong><br>elderId?: string<hr><strong>Body</strong><br>avatar?: string<br>name?: string<br>phone?: string<br>birthday?: string<br>address?: string<br>height?: number<br>weight?: number<br>education?: string<br>occupation?: string<br>emergencyContact?: Record&lt;string, unknown&gt;</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;elderId&quot;: &quot;elder_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取病史与长期记忆</td><td>病史页、照护偏好页可先调用该接口回显慢病、手术史、风险标签和长期记忆信息。</td><td><code>GET</code></td><td><code>/api/v1/app/health/archive/medical-history</code></td><td><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;chronicDiseases&quot;: [
      &quot;高血压&quot;,
      &quot;糖尿病&quot;
    ],
    &quot;allergies&quot;: [
      &quot;青霉素&quot;
    ],
    &quot;longTermMemory&quot;: &quot;午饭后需要提醒服药&quot;
  }
}</code></pre></td></tr>
    <tr><td>更新病史与长期记忆</td><td>病史页保存接口。medicalHistory、riskTags、longTermMemory 均可按页面需要局部更新。</td><td><code>PUT</code></td><td><code>/api/v1/app/health/archive/medical-history</code></td><td><strong>Query</strong><br>elderId?: string<hr><strong>Body</strong><br>medicalHistory?: Record&lt;string, unknown&gt;<br>riskTags?: unknown[]<br>longTermMemory?: Record&lt;string, unknown&gt;</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;elderId&quot;: &quot;elder_001&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 健康数据与设备

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取健康指标总览</td><td>健康数据首页先调用，查看综合评分、摘要卡片、最近提醒和绑定设备概览。</td><td><code>GET</code></td><td><code>/api/v1/app/health/metrics/overview</code></td><td><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;metrics&quot;: [
      {
        &quot;metricKey&quot;: &quot;bloodPressure&quot;,
        &quot;latestValue&quot;: &quot;128/82&quot;,
        &quot;level&quot;: &quot;NORMAL&quot;
      },
      {
        &quot;metricKey&quot;: &quot;steps&quot;,
        &quot;latestValue&quot;: 6320,
        &quot;level&quot;: &quot;GOOD&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取单项指标趋势</td><td>血压、血糖、睡眠、体重等单项详情页趋势图接口。metricKey 由页面类型决定。</td><td><code>GET</code></td><td><code>/api/v1/app/health/metrics/:metricKey/trend</code></td><td><strong>Path</strong><br>metricKey: string<hr><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;metricKey&quot;: &quot;bloodPressure&quot;,
    &quot;points&quot;: [
      {
        &quot;date&quot;: &quot;2026-04-21&quot;,
        &quot;value&quot;: &quot;130/85&quot;
      },
      {
        &quot;date&quot;: &quot;2026-04-22&quot;,
        &quot;value&quot;: &quot;128/82&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取单项指标记录列表</td><td>单项指标明细列表接口。recordId 需要从该接口返回中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/health/metrics/:metricKey/records</code></td><td><strong>Path</strong><br>metricKey: string<hr><strong>Query</strong><br>page?: number<br>pageSize?: number<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;recordId&quot;: &quot;metric_001&quot;,
        &quot;value&quot;: &quot;128/82&quot;,
        &quot;measuredAt&quot;: &quot;2026-04-22T09:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>新增指标记录</td><td>添加健康数据页保存接口。手工录入时通常填写 value、unit、note、measuredAt。</td><td><code>POST</code></td><td><code>/api/v1/app/health/metrics/:metricKey/records</code></td><td><strong>Path</strong><br>metricKey: string<hr><strong>Body</strong><br>elderId?: string<br>deviceId?: string<br>value?: number<br>unit?: string<br>payload?: Record&lt;string, unknown&gt;<br>note?: string<br>measuredAt?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;recordId&quot;: &quot;metric_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>更新指标记录</td><td>编辑历史指标记录时调用。recordId 请先从记录列表接口返回中获取。</td><td><code>PUT</code></td><td><code>/api/v1/app/health/metrics/:metricKey/records/:recordId</code></td><td><strong>Path</strong><br>metricKey: string<br>recordId: string<hr><strong>Body</strong><br>elderId?: string<br>deviceId?: string<br>value?: number<br>unit?: string<br>payload?: Record&lt;string, unknown&gt;<br>note?: string<br>measuredAt?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;recordId&quot;: &quot;metric_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>删除指标记录</td><td>删除历史健康记录。删除前请确认 recordId 来自当前指标的记录列表。</td><td><code>DELETE</code></td><td><code>/api/v1/app/health/metrics/:metricKey/records/:recordId</code></td><td><strong>Path</strong><br>metricKey: string<br>recordId: string<hr><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;deleted&quot;: true,
    &quot;recordId&quot;: &quot;metric_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取设备列表</td><td>设备中心首页接口。deviceId 需要从该列表返回中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/health/devices</code></td><td><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;deviceId&quot;: &quot;dev_001&quot;,
        &quot;deviceName&quot;: &quot;智能手环&quot;,
        &quot;online&quot;: true,
        &quot;battery&quot;: 76
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取设备详情</td><td>设备详情页接口。可回显设备状态、电量、设置摘要和最近测量信息。</td><td><code>GET</code></td><td><code>/api/v1/app/health/devices/:deviceId</code></td><td><strong>Path</strong><br>deviceId: string<hr><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;deviceId&quot;: &quot;dev_001&quot;,
    &quot;deviceName&quot;: &quot;智能手环&quot;,
    &quot;online&quot;: true,
    &quot;battery&quot;: 76,
    &quot;settings&quot;: {
      &quot;syncFrequency&quot;: &quot;15m&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>手动绑定设备</td><td>设备添加页保存接口。serialNo 和 type 为必填。</td><td><code>POST</code></td><td><code>/api/v1/app/health/devices/bind</code></td><td><strong>Body</strong><br>elderId?: string<br>serialNo: string<br>type: DeviceType<br>nickname?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;deviceId&quot;: &quot;dev_001&quot;,
    &quot;bound&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>扫码绑定设备</td><td>扫码绑定页接口。请求体与手动绑定一致，前端只是在页面上通过扫码得到 serialNo。</td><td><code>POST</code></td><td><code>/api/v1/app/health/devices/scan/bind</code></td><td><strong>Body</strong><br>elderId?: string<br>serialNo: string<br>type: DeviceType<br>nickname?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;deviceId&quot;: &quot;dev_001&quot;,
    &quot;bound&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>解绑设备</td><td>设备详情页解除绑定接口。</td><td><code>DELETE</code></td><td><code>/api/v1/app/health/devices/:deviceId</code></td><td><strong>Path</strong><br>deviceId: string<hr><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;unbound&quot;: true,
    &quot;deviceId&quot;: &quot;dev_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>更新设备设置</td><td>设备设置页保存接口，settings 可按页面结构提交。</td><td><code>PUT</code></td><td><code>/api/v1/app/health/devices/:deviceId/settings</code></td><td><strong>Path</strong><br>deviceId: string<hr><strong>Body</strong><br>settings: Record&lt;string, unknown&gt;<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;deviceId&quot;: &quot;dev_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>更新设备密码</td><td>设备密码页保存接口。</td><td><code>PUT</code></td><td><code>/api/v1/app/health/devices/:deviceId/password</code></td><td><strong>Path</strong><br>deviceId: string<hr><strong>Body</strong><br>password: string<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;deviceId&quot;: &quot;dev_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>更新心率预警设置</td><td>心率设置页保存接口，settings 中可填写心率阈值和提醒开关。</td><td><code>PUT</code></td><td><code>/api/v1/app/health/devices/:deviceId/heart-rate-settings</code></td><td><strong>Path</strong><br>deviceId: string<hr><strong>Body</strong><br>settings: Record&lt;string, unknown&gt;<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;deviceId&quot;: &quot;dev_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取设备测量记录</td><td>设备详情页记录列表接口，可用于回显设备同步上来的测量数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/devices/:deviceId/measurements</code></td><td><strong>Path</strong><br>deviceId: string<hr><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;measurementId&quot;: &quot;mea_001&quot;,
        &quot;type&quot;: &quot;heartRate&quot;,
        &quot;value&quot;: 72,
        &quot;measuredAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取今日用药提醒</td><td>用药信息首页优先调用，查看今天应服药项目和状态。</td><td><code>GET</code></td><td><code>/api/v1/app/health/medications/today</code></td><td><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;medicationId&quot;: &quot;med_001&quot;,
        &quot;medicineName&quot;: &quot;缬沙坦&quot;,
        &quot;dosage&quot;: &quot;80mg&quot;,
        &quot;plannedAt&quot;: &quot;08:00&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取用药列表</td><td>用药列表页接口。medicationId 需要从该列表返回中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/health/medications</code></td><td><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;medicationId&quot;: &quot;med_001&quot;,
        &quot;medicineName&quot;: &quot;缬沙坦&quot;,
        &quot;frequency&quot;: &quot;每日一次&quot;,
        &quot;status&quot;: &quot;ACTIVE&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>新增用药计划</td><td>新增用药页保存接口。至少填写药名、剂量、频次和开始日期。</td><td><code>POST</code></td><td><code>/api/v1/app/health/medications</code></td><td><strong>Body</strong><br>name: string<br>dosage: string<br>frequency: string<br>mealTiming?: string<br>route?: string<br>indication?: string<br>scheduleTimes?: string[]<br>startDate: string<br>endDate?: string<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;medicationId&quot;: &quot;med_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>更新用药计划</td><td>编辑用药页保存接口。medicationId 请先从用药列表中获取。</td><td><code>PUT</code></td><td><code>/api/v1/app/health/medications/:medicationId</code></td><td><strong>Path</strong><br>medicationId: string<hr><strong>Body</strong><br>active?: boolean<br>name: string<br>dosage: string<br>frequency: string<br>mealTiming?: string<br>route?: string<br>indication?: string<br>scheduleTimes?: string[]<br>startDate: string<br>endDate?: string<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updated&quot;: true,
    &quot;medicationId&quot;: &quot;med_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>删除用药计划</td><td>删除不再使用的用药计划。</td><td><code>DELETE</code></td><td><code>/api/v1/app/health/medications/:medicationId</code></td><td><strong>Path</strong><br>medicationId: string<hr><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;deleted&quot;: true,
    &quot;medicationId&quot;: &quot;med_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>记录服药</td><td>用药提醒卡片上的已服药动作接口。</td><td><code>POST</code></td><td><code>/api/v1/app/health/medications/:medicationId/take</code></td><td><strong>Path</strong><br>medicationId: string<hr><strong>Body</strong><br>note?: string<br>scheduledAt?: string<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;recorded&quot;: true,
    &quot;medicationId&quot;: &quot;med_001&quot;,
    &quot;takenAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 健康膳食与自测

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取健康膳食首页</td><td>用于获取健康膳食首页，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/diet/plan</code></td><td><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;meals&quot;: [
      {
        &quot;mealType&quot;: &quot;breakfast&quot;,
        &quot;suggestion&quot;: &quot;燕麦牛奶 + 水煮蛋&quot;
      }
    ],
    &quot;nutritionTips&quot;: [
      &quot;控制盐摄入&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取食谱列表</td><td>用于获取食谱列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/diet/recipes</code></td><td><strong>Query</strong><br>mealType?: &quot;BREAKFAST&quot; | &quot;LUNCH&quot; | &quot;SNACK&quot; | &quot;DINNER&quot;<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;recipeId&quot;: &quot;recipe_001&quot;,
        &quot;name&quot;: &quot;低盐蒸鱼&quot;,
        &quot;calories&quot;: 220
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取食谱详情</td><td>用于获取食谱详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/diet/recipes/:recipeId</code></td><td><strong>Path</strong><br>recipeId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;recipeId&quot;: &quot;recipe_001&quot;,
    &quot;name&quot;: &quot;低盐蒸鱼&quot;,
    &quot;ingredients&quot;: [
      &quot;鲈鱼&quot;,
      &quot;姜丝&quot;
    ],
    &quot;steps&quot;: [
      &quot;清洗&quot;,
      &quot;蒸制&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取饮食记录日报</td><td>用于获取饮食记录日报，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/diet-records</code></td><td><strong>Query</strong><br>date?: string<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;date&quot;: &quot;2026-04-23&quot;,
    &quot;list&quot;: [
      {
        &quot;recordId&quot;: &quot;diet_001&quot;,
        &quot;mealType&quot;: &quot;lunch&quot;,
        &quot;foods&quot;: [
          &quot;米饭&quot;,
          &quot;清蒸鱼&quot;
        ]
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>新增饮食记录</td><td>用于新增饮食记录，返回新增后的业务对象。</td><td><code>POST</code></td><td><code>/api/v1/app/health/diet-records</code></td><td><strong>Body</strong><br>recipeId?: string<br>mealType: &quot;BREAKFAST&quot; | &quot;LUNCH&quot; | &quot;SNACK&quot; | &quot;DINNER&quot;<br>foods: Record&lt;string, unknown&gt;[]<br>totalCalories: number<br>macros?: Record&lt;string, unknown&gt;<br>note?: string<br>eatenAt?: string<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;recordId&quot;: &quot;diet_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>获取饮食历史统计</td><td>用于获取饮食历史统计，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/diet-records/history</code></td><td><strong>Query</strong><br>elderId?: string<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;stats&quot;: [
      {
        &quot;date&quot;: &quot;2026-04-21&quot;,
        &quot;calories&quot;: 1500
      },
      {
        &quot;date&quot;: &quot;2026-04-22&quot;,
        &quot;calories&quot;: 1620
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取自测项目列表</td><td>用于获取自测项目列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/self-tests</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;testId&quot;: &quot;test_001&quot;,
        &quot;title&quot;: &quot;抑郁风险自测&quot;,
        &quot;questionCount&quot;: 9
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取自测历史</td><td>用于获取自测历史，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/self-tests/history</code></td><td><strong>Query</strong><br>elderId?: string<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;testId&quot;: &quot;test_001&quot;,
        &quot;score&quot;: 6,
        &quot;level&quot;: &quot;LOW&quot;,
        &quot;submittedAt&quot;: &quot;2026-04-22T10:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取自测详情与题目</td><td>用于获取自测详情与题目，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/health/self-tests/:testId</code></td><td><strong>Path</strong><br>testId: string<hr><strong>Query</strong><br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;testId&quot;: &quot;test_001&quot;,
    &quot;title&quot;: &quot;抑郁风险自测&quot;,
    &quot;questions&quot;: [
      {
        &quot;id&quot;: &quot;q1&quot;,
        &quot;title&quot;: &quot;近两周是否睡眠不佳？&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>提交自测结果</td><td>用于提交自测结果，返回提交后的处理结果。</td><td><code>POST</code></td><td><code>/api/v1/app/health/self-tests/:testId/submit</code></td><td><strong>Path</strong><br>testId: string<hr><strong>Body</strong><br>answers: { questionId: string; optionIndex?: number; score?: number; }[]<br>elderId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;testId&quot;: &quot;test_001&quot;,
    &quot;score&quot;: 6,
    &quot;level&quot;: &quot;LOW&quot;,
    &quot;recommendations&quot;: [
      &quot;保持规律作息&quot;
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 服务目录

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取服务分类</td><td>服务首页进入后先调用，用于展示家政护理、康复理疗、上门体检、养老机构等一级入口。</td><td><code>GET</code></td><td><code>/api/v1/app/services/categories</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;code&quot;: &quot;home-care&quot;,
        &quot;name&quot;: &quot;家政护理&quot;
      },
      {
        &quot;code&quot;: &quot;rehab-therapy&quot;,
        &quot;name&quot;: &quot;康复理疗&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取家政护理列表</td><td>家政护理列表页接口，支持分页。serviceId 需从此列表返回中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/services/home-care</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;serviceId&quot;: &quot;srv_001&quot;,
        &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
        &quot;price&quot;: 299,
        &quot;city&quot;: &quot;上海&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取家政护理详情</td><td>家政护理详情页接口。serviceId 请先从家政护理列表中取得。</td><td><code>GET</code></td><td><code>/api/v1/app/services/home-care/:serviceId</code></td><td><strong>Path</strong><br>serviceId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;serviceId&quot;: &quot;srv_001&quot;,
    &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
    &quot;price&quot;: 299,
    &quot;description&quot;: &quot;适用于居家康复训练&quot;,
    &quot;availableCities&quot;: [
      &quot;上海&quot;,
      &quot;杭州&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取康复理疗列表</td><td>康复理疗列表页接口，常用于康复项目浏览和下单前选择服务。</td><td><code>GET</code></td><td><code>/api/v1/app/services/rehab-therapy</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;serviceId&quot;: &quot;srv_001&quot;,
        &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
        &quot;price&quot;: 299,
        &quot;city&quot;: &quot;上海&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取康复理疗详情</td><td>康复理疗详情页接口。可配合预约选项接口进入下单链路。</td><td><code>GET</code></td><td><code>/api/v1/app/services/rehab-therapy/:serviceId</code></td><td><strong>Path</strong><br>serviceId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;serviceId&quot;: &quot;srv_001&quot;,
    &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
    &quot;price&quot;: 299,
    &quot;description&quot;: &quot;适用于居家康复训练&quot;,
    &quot;availableCities&quot;: [
      &quot;上海&quot;,
      &quot;杭州&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取上门体检列表</td><td>上门体检列表页接口，支持分页。</td><td><code>GET</code></td><td><code>/api/v1/app/services/home-exam</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;serviceId&quot;: &quot;srv_001&quot;,
        &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
        &quot;price&quot;: 299,
        &quot;city&quot;: &quot;上海&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取上门体检详情</td><td>上门体检详情页接口。serviceId 请先从上门体检列表返回中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/services/home-exam/:serviceId</code></td><td><strong>Path</strong><br>serviceId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;serviceId&quot;: &quot;srv_001&quot;,
    &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
    &quot;price&quot;: 299,
    &quot;description&quot;: &quot;适用于居家康复训练&quot;,
    &quot;availableCities&quot;: [
      &quot;上海&quot;,
      &quot;杭州&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取养老机构列表</td><td>养老机构列表页接口，支持分页。</td><td><code>GET</code></td><td><code>/api/v1/app/services/elderly-care</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;serviceId&quot;: &quot;srv_001&quot;,
        &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
        &quot;price&quot;: 299,
        &quot;city&quot;: &quot;上海&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取养老机构详情</td><td>养老机构详情页接口。serviceId 请先从养老机构列表中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/services/elderly-care/:serviceId</code></td><td><strong>Path</strong><br>serviceId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;serviceId&quot;: &quot;srv_001&quot;,
    &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
    &quot;price&quot;: 299,
    &quot;description&quot;: &quot;适用于居家康复训练&quot;,
    &quot;availableCities&quot;: [
      &quot;上海&quot;,
      &quot;杭州&quot;
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 订单与预约

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取预约选项</td><td>预约页进入时先调用，用于回显可约日期、时间段、地址候选等信息。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/booking/options</code></td><td><strong>Query</strong><br>serviceId?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;dates&quot;: [
      &quot;2026-04-24&quot;,
      &quot;2026-04-25&quot;
    ],
    &quot;timeSlots&quot;: [
      &quot;09:00-11:00&quot;,
      &quot;13:00-15:00&quot;
    ],
    &quot;addresses&quot;: [
      {
        &quot;addressId&quot;: &quot;addr_001&quot;,
        &quot;fullAddress&quot;: &quot;上海市浦东新区世纪大道 100 号&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>预览订单</td><td>订单确认页的核心接口。前端先填 serviceId、addressId、预约时间等信息，再看价格和服务摘要。</td><td><code>POST</code></td><td><code>/api/v1/app/orders/preview</code></td><td><strong>Body</strong><br>serviceId: string<br>addressId: string<br>elderId?: string<br>bookingDate?: string<br>bookingTimeSlot?: string<br>couponId?: string<br>remark?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;serviceId&quot;: &quot;srv_001&quot;,
    &quot;originalAmount&quot;: 299,
    &quot;discountAmount&quot;: 50,
    &quot;payableAmount&quot;: 249
  }
}</code></pre></td></tr>
    <tr><td>创建订单</td><td>订单确认页点击提交订单时调用。成功后重点查看 data.orderId，支付链路会继续使用。</td><td><code>POST</code></td><td><code>/api/v1/app/orders</code></td><td><strong>Body</strong><br>contactName?: string<br>contactPhone?: string<br>serviceId: string<br>addressId: string<br>elderId?: string<br>bookingDate?: string<br>bookingTimeSlot?: string<br>couponId?: string<br>remark?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;status&quot;: &quot;PENDING_PAYMENT&quot;,
    &quot;payableAmount&quot;: 249
  }
}</code></pre></td></tr>
    <tr><td>获取订单列表</td><td>我的订单页、家政护理订单页等列表接口。orderId 需要从该接口返回中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/orders</code></td><td><strong>Query</strong><br>status?: OrderStatus<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;orderId&quot;: &quot;order_001&quot;,
        &quot;serviceName&quot;: &quot;脑卒中康复理疗&quot;,
        &quot;status&quot;: &quot;PENDING_PAYMENT&quot;,
        &quot;amount&quot;: 249
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取订单详情</td><td>订单详情页接口。orderId 请先从订单列表获取。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/:orderId</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;serviceName&quot;: &quot;脑卒中康复理疗&quot;,
    &quot;status&quot;: &quot;BOOKED&quot;,
    &quot;bookingDate&quot;: &quot;2026-04-24&quot;,
    &quot;bookingTimeSlot&quot;: &quot;13:00-15:00&quot;
  }
}</code></pre></td></tr>
    <tr><td>修改预约时间</td><td>改约页保存接口。</td><td><code>PUT</code></td><td><code>/api/v1/app/orders/:orderId/schedule</code></td><td><strong>Path</strong><br>orderId: string<hr><strong>Body</strong><br>bookingDate: string<br>bookingTimeSlot: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;bookingDate&quot;: &quot;2026-04-25&quot;,
    &quot;bookingTimeSlot&quot;: &quot;15:00-17:00&quot;,
    &quot;updated&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>取消订单</td><td>订单详情页取消订单动作接口。</td><td><code>POST</code></td><td><code>/api/v1/app/orders/:orderId/cancel</code></td><td><strong>Path</strong><br>orderId: string<hr><strong>Body</strong><br>reason?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;status&quot;: &quot;CANCELLED&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取订单时间线</td><td>服务跟踪页接口，用于展示订单从创建到完成的节点记录。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/:orderId/timeline</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;node&quot;: &quot;ORDER_CREATED&quot;,
        &quot;time&quot;: &quot;2026-04-23T08:00:00Z&quot;
      },
      {
        &quot;node&quot;: &quot;PAYMENT_CONFIRMED&quot;,
        &quot;time&quot;: &quot;2026-04-23T08:05:00Z&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取服务凭证</td><td>订单详情或服务跟踪页接口。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/:orderId/voucher</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;voucherCode&quot;: &quot;VCH-20260423-001&quot;,
    &quot;qrCodeUrl&quot;: &quot;https://cdn.example.com/voucher.png&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取服务记录</td><td>服务记录页接口。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/:orderId/service-records</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;recordId&quot;: &quot;srvrec_001&quot;,
        &quot;staffName&quot;: &quot;李医生&quot;,
        &quot;content&quot;: &quot;完成基础康复评估&quot;,
        &quot;createdAt&quot;: &quot;2026-04-24T09:00:00Z&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取评估报告</td><td>评估报告页接口。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/:orderId/assessment-report</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reportId&quot;: &quot;report_001&quot;,
    &quot;title&quot;: &quot;康复评估报告&quot;,
    &quot;summary&quot;: &quot;恢复进度稳定&quot;,
    &quot;generatedAt&quot;: &quot;2026-04-24T18:00:00Z&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取康复报告</td><td>康复报告页接口。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/:orderId/rehab-report</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reportId&quot;: &quot;report_001&quot;,
    &quot;title&quot;: &quot;康复评估报告&quot;,
    &quot;summary&quot;: &quot;恢复进度稳定&quot;,
    &quot;generatedAt&quot;: &quot;2026-04-24T18:00:00Z&quot;
  }
}</code></pre></td></tr>
    <tr><td>提交订单评价</td><td>评价弹窗或评价页提交接口。</td><td><code>POST</code></td><td><code>/api/v1/app/orders/:orderId/reviews</code></td><td><strong>Path</strong><br>orderId: string<hr><strong>Body</strong><br>score: number<br>tags?: string[]<br>content?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reviewId&quot;: &quot;review_001&quot;,
    &quot;submitted&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>获取订单评价</td><td>订单详情页回显已评价内容时调用。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/:orderId/reviews</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reviewId&quot;: &quot;review_001&quot;,
    &quot;score&quot;: 5,
    &quot;content&quot;: &quot;服务专业，沟通顺畅。&quot;
  }
}</code></pre></td></tr>
    <tr><td>提交售后申请</td><td>订单详情页售后申请接口。</td><td><code>POST</code></td><td><code>/api/v1/app/orders/:orderId/after-sales</code></td><td><strong>Path</strong><br>orderId: string<hr><strong>Body</strong><br>type: AfterSaleType<br>reason: string<br>description?: string<br>amountRequested?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;afterSaleId&quot;: &quot;afs_001&quot;,
    &quot;status&quot;: &quot;PROCESSING&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取售后记录</td><td>查看订单售后进度时调用。</td><td><code>GET</code></td><td><code>/api/v1/app/orders/:orderId/after-sales</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;afterSaleId&quot;: &quot;afs_001&quot;,
        &quot;type&quot;: &quot;REFUND&quot;,
        &quot;status&quot;: &quot;PROCESSING&quot;
      }
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 支付

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取支付渠道</td><td>支付页打开后先调用，用于渲染可选支付方式。</td><td><code>GET</code></td><td><code>/api/v1/app/payments/channels</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;code&quot;: &quot;ALIPAY&quot;,
        &quot;name&quot;: &quot;支付宝&quot;
      },
      {
        &quot;code&quot;: &quot;WECHAT&quot;,
        &quot;name&quot;: &quot;微信支付&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>创建支付单</td><td>支付页点击立即支付时调用。成功后重点查看 data.paymentId，用于后续确认支付和结果页查询。</td><td><code>POST</code></td><td><code>/api/v1/app/payments</code></td><td><strong>Body</strong><br>orderId: string<br>channel: PaymentChannel</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;paymentId&quot;: &quot;pay_001&quot;,
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;amount&quot;: 249,
    &quot;status&quot;: &quot;PENDING&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取支付单详情</td><td>支付结果页或轮询状态时调用。paymentId 来自创建支付单接口返回。</td><td><code>GET</code></td><td><code>/api/v1/app/payments/:paymentId</code></td><td><strong>Path</strong><br>paymentId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;paymentId&quot;: &quot;pay_001&quot;,
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;amount&quot;: 249,
    &quot;status&quot;: &quot;PENDING&quot;
  }
}</code></pre></td></tr>
    <tr><td>确认支付</td><td>用于确认支付。</td><td><code>POST</code></td><td><code>/api/v1/app/payments/:paymentId/confirm</code></td><td><strong>Path</strong><br>paymentId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;paymentId&quot;: &quot;pay_001&quot;,
    &quot;status&quot;: &quot;PAID&quot;,
    &quot;paidAt&quot;: &quot;2026-04-23T08:06:00Z&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 体检报告

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取体检报告列表</td><td>体检报告列表页进入时先调用。reportId 需要从该列表返回中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/health/reports/checkups</code></td><td><strong>Query</strong><br>elderId?: string<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;reportId&quot;: &quot;report_001&quot;,
        &quot;title&quot;: &quot;2026 春季体检报告&quot;,
        &quot;status&quot;: &quot;APPROVED&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>上传体检报告</td><td>报告上传页提交接口。通常先完成文件上传，再把 summary 和 attachment 一并提交。</td><td><code>POST</code></td><td><code>/api/v1/app/health/reports/checkups</code></td><td><strong>Body</strong><br>elderId?: string<br>title: string<br>summary: Record&lt;string, unknown&gt;<br>attachment?: Record&lt;string, unknown&gt;</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reportId&quot;: &quot;report_001&quot;,
    &quot;status&quot;: &quot;PENDING_REVIEW&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取体检报告详情</td><td>报告详情页接口。reportId 请先从报告列表中获取。</td><td><code>GET</code></td><td><code>/api/v1/app/health/reports/checkups/:reportId</code></td><td><strong>Path</strong><br>reportId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reportId&quot;: &quot;report_001&quot;,
    &quot;title&quot;: &quot;2026 春季体检报告&quot;,
    &quot;summary&quot;: {
      &quot;bloodPressure&quot;: &quot;128/82&quot;
    },
    &quot;attachment&quot;: {
      &quot;fileId&quot;: &quot;file_001&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>删除体检报告</td><td>删除已上传的报告。请先确认 reportId 来源于列表或详情。</td><td><code>DELETE</code></td><td><code>/api/v1/app/health/reports/checkups/:reportId</code></td><td><strong>Path</strong><br>reportId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;deleted&quot;: true,
    &quot;reportId&quot;: &quot;report_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取报告解读</td><td>非 AI 版报告解读接口。报告解读页可先调用此接口，再按需补充 AI 增强接口。</td><td><code>GET</code></td><td><code>/api/v1/app/health/reports/checkups/:reportId/interpretation</code></td><td><strong>Path</strong><br>reportId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reportId&quot;: &quot;report_001&quot;,
    &quot;summary&quot;: &quot;整体指标稳定&quot;,
    &quot;risks&quot;: [
      &quot;血糖轻度偏高&quot;
    ],
    &quot;suggestions&quot;: [
      &quot;建议复查空腹血糖&quot;
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 文件上传

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取上传凭证</td><td>用于获取上传凭证，返回当前业务对象或列表数据。</td><td><code>POST</code></td><td><code>/api/v1/app/files/presign</code></td><td><strong>Body</strong><br>category: FileCategory<br>fileName: string<br>mimeType: string<br>size: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;fileKey&quot;: &quot;reports/2026/04/file_001.pdf&quot;,
    &quot;uploadUrl&quot;: &quot;https://oss.example.com/presigned-url&quot;,
    &quot;headers&quot;: {
      &quot;Content-Type&quot;: &quot;application/pdf&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>通知上传完成并落库</td><td>用于通知上传完成并落库。</td><td><code>POST</code></td><td><code>/api/v1/app/files/complete</code></td><td><strong>Body</strong><br>category: FileCategory<br>fileName: string<br>objectKey: string<br>mimeType: string<br>size: number<br>metadata?: Record&lt;string, unknown&gt;</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;fileId&quot;: &quot;file_001&quot;,
    &quot;url&quot;: &quot;https://cdn.example.com/file_001.pdf&quot;,
    &quot;completed&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>获取文件信息</td><td>用于获取文件信息，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/files/:fileId</code></td><td><strong>Path</strong><br>fileId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;fileId&quot;: &quot;file_001&quot;,
    &quot;fileName&quot;: &quot;report.pdf&quot;,
    &quot;size&quot;: 102400,
    &quot;url&quot;: &quot;https://cdn.example.com/file_001.pdf&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 消息与咨询

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取消息聚合概览</td><td>用于获取消息聚合概览，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/messages/overview</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;unreadNoticeCount&quot;: 3,
    &quot;unreadConversationCount&quot;: 1,
    &quot;latestNotice&quot;: {
      &quot;id&quot;: &quot;notice_001&quot;,
      &quot;title&quot;: &quot;服务预约已确认&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>获取通知列表</td><td>用于获取通知列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/messages/notices</code></td><td><strong>Query</strong><br>type?: &quot;SYSTEM&quot; | &quot;HEALTH_ALERT&quot; | &quot;ORDER&quot; | &quot;CONTENT&quot; | &quot;COMMUNITY&quot; | &quot;COMMENT&quot; | &quot;LIKE&quot; | &quot;FOLLOW&quot;<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;noticeId&quot;: &quot;notice_001&quot;,
        &quot;title&quot;: &quot;服务预约已确认&quot;,
        &quot;read&quot;: false,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>批量已读通知</td><td>用于批量已读通知。</td><td><code>POST</code></td><td><code>/api/v1/app/messages/notices/read</code></td><td><strong>Body</strong><br>noticeIds?: string[]</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;updatedCount&quot;: 3
  }
}</code></pre></td></tr>
    <tr><td>获取会话列表</td><td>用于获取会话列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/conversations</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;conversationId&quot;: &quot;conv_001&quot;,
        &quot;doctorName&quot;: &quot;李医生&quot;,
        &quot;latestMessage&quot;: &quot;请按时测量血压&quot;,
        &quot;unreadCount&quot;: 1
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>创建医生咨询会话</td><td>用于创建医生咨询会话，返回新建后的业务对象。</td><td><code>POST</code></td><td><code>/api/v1/app/conversations/doctor</code></td><td><strong>Body</strong><br>doctorUserId?: string<br>topic?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;conversationId&quot;: &quot;conv_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>获取会话消息列表</td><td>用于获取会话消息列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/conversations/:conversationId/messages</code></td><td><strong>Path</strong><br>conversationId: string<hr><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;messageId&quot;: &quot;msg_001&quot;,
        &quot;sender&quot;: &quot;doctor&quot;,
        &quot;content&quot;: &quot;请按时测量血压&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>发送会话消息</td><td>用于发送会话消息，返回发送执行结果。</td><td><code>POST</code></td><td><code>/api/v1/app/conversations/:conversationId/messages</code></td><td><strong>Path</strong><br>conversationId: string<hr><strong>Body</strong><br>contentType: &quot;TEXT&quot; | &quot;IMAGE&quot; | &quot;AUDIO&quot;<br>content: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;messageId&quot;: &quot;msg_002&quot;,
    &quot;sender&quot;: &quot;user&quot;,
    &quot;content&quot;: &quot;好的&quot;,
    &quot;createdAt&quot;: &quot;2026-04-23T08:01:00Z&quot;
  }
}</code></pre></td></tr>
    <tr><td>会话已读</td><td>用于会话已读。</td><td><code>POST</code></td><td><code>/api/v1/app/conversations/:conversationId/read</code></td><td><strong>Path</strong><br>conversationId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;read&quot;: true,
    &quot;conversationId&quot;: &quot;conv_001&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 健康内容

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取健康资讯列表</td><td>用于获取健康资讯列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/news</code></td><td><strong>Query</strong><br>sort?: &quot;latest&quot; | &quot;LATEST&quot; | &quot;hot&quot; | &quot;HOT&quot;<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;id&quot;: &quot;content_001&quot;,
        &quot;title&quot;: &quot;春季血压管理要点&quot;,
        &quot;cover&quot;: &quot;https://cdn.example.com/cover.png&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取资讯详情</td><td>用于获取资讯详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/news/:newsId</code></td><td><strong>Path</strong><br>newsId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;id&quot;: &quot;content_001&quot;,
    &quot;title&quot;: &quot;春季血压管理要点&quot;,
    &quot;content&quot;: &quot;...&quot;,
    &quot;liked&quot;: false,
    &quot;favorite&quot;: false
  }
}</code></pre></td></tr>
    <tr><td>点赞资讯</td><td>用于点赞资讯。</td><td><code>POST</code></td><td><code>/api/v1/app/content/news/:newsId/like</code></td><td><strong>Path</strong><br>newsId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>收藏资讯</td><td>用于收藏资讯。</td><td><code>POST</code></td><td><code>/api/v1/app/content/news/:newsId/favorite</code></td><td><strong>Path</strong><br>newsId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>记录资讯分享</td><td>用于记录资讯分享，返回记录写入结果。</td><td><code>POST</code></td><td><code>/api/v1/app/content/news/:newsId/share</code></td><td><strong>Path</strong><br>newsId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>获取资讯评论列表</td><td>用于获取资讯评论列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/news/:newsId/comments</code></td><td><strong>Path</strong><br>newsId: string<hr><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;commentId&quot;: &quot;comment_001&quot;,
        &quot;userName&quot;: &quot;王兰&quot;,
        &quot;content&quot;: &quot;内容很实用&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>发表评论资讯评论</td><td>用于发表评论资讯评论。</td><td><code>POST</code></td><td><code>/api/v1/app/content/news/:newsId/comments</code></td><td><strong>Path</strong><br>newsId: string<hr><strong>Body</strong><br>parentId?: string<br>content: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;commentId&quot;: &quot;comment_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>获取健康讲堂列表</td><td>用于获取健康讲堂列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/lectures</code></td><td><strong>Query</strong><br>sort?: &quot;latest&quot; | &quot;LATEST&quot; | &quot;hot&quot; | &quot;HOT&quot;<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;id&quot;: &quot;content_001&quot;,
        &quot;title&quot;: &quot;春季血压管理要点&quot;,
        &quot;cover&quot;: &quot;https://cdn.example.com/cover.png&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取讲堂详情</td><td>用于获取讲堂详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/lectures/:lectureId</code></td><td><strong>Path</strong><br>lectureId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;id&quot;: &quot;content_001&quot;,
    &quot;title&quot;: &quot;春季血压管理要点&quot;,
    &quot;content&quot;: &quot;...&quot;,
    &quot;liked&quot;: false,
    &quot;favorite&quot;: false
  }
}</code></pre></td></tr>
    <tr><td>点赞讲堂</td><td>用于点赞讲堂。</td><td><code>POST</code></td><td><code>/api/v1/app/content/lectures/:lectureId/like</code></td><td><strong>Path</strong><br>lectureId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>收藏讲堂</td><td>用于收藏讲堂。</td><td><code>POST</code></td><td><code>/api/v1/app/content/lectures/:lectureId/favorite</code></td><td><strong>Path</strong><br>lectureId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>记录讲堂分享</td><td>用于记录讲堂分享，返回记录写入结果。</td><td><code>POST</code></td><td><code>/api/v1/app/content/lectures/:lectureId/share</code></td><td><strong>Path</strong><br>lectureId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>获取讲堂评论列表</td><td>用于获取讲堂评论列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/lectures/:lectureId/comments</code></td><td><strong>Path</strong><br>lectureId: string<hr><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;commentId&quot;: &quot;comment_001&quot;,
        &quot;userName&quot;: &quot;王兰&quot;,
        &quot;content&quot;: &quot;内容很实用&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>发表评论讲堂评论</td><td>用于发表评论讲堂评论。</td><td><code>POST</code></td><td><code>/api/v1/app/content/lectures/:lectureId/comments</code></td><td><strong>Path</strong><br>lectureId: string<hr><strong>Body</strong><br>parentId?: string<br>content: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;commentId&quot;: &quot;comment_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>获取疾病科室分类</td><td>用于获取疾病科室分类，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/diseases/departments</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;code&quot;: &quot;cardiology&quot;,
        &quot;name&quot;: &quot;心血管科&quot;
      },
      {
        &quot;code&quot;: &quot;neurology&quot;,
        &quot;name&quot;: &quot;神经科&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取疾病列表</td><td>用于获取疾病列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/diseases</code></td><td><strong>Query</strong><br>departmentId?: string<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;diseaseId&quot;: &quot;dis_001&quot;,
        &quot;name&quot;: &quot;高血压&quot;,
        &quot;department&quot;: &quot;心血管科&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取疾病详情</td><td>用于获取疾病详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/content/diseases/:diseaseId</code></td><td><strong>Path</strong><br>diseaseId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;diseaseId&quot;: &quot;dis_001&quot;,
    &quot;name&quot;: &quot;高血压&quot;,
    &quot;symptoms&quot;: [
      &quot;头晕&quot;
    ],
    &quot;suggestions&quot;: [
      &quot;定期监测血压&quot;
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / 社区与活动

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取热门话题列表</td><td>用于获取热门话题列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/community/topics</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;topicId&quot;: &quot;topic_001&quot;,
        &quot;name&quot;: &quot;#康复训练#&quot;,
        &quot;postCount&quot;: 128
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取帖子流</td><td>用于获取帖子流，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/community/posts</code></td><td><strong>Query</strong><br>topicId?: string<br>feedType?: &quot;following&quot; | &quot;recommended&quot; | &quot;latest&quot; | &quot;FOLLOWING&quot; | &quot;RECOMMENDED&quot; | &quot;LATEST&quot;<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;postId&quot;: &quot;post_001&quot;,
        &quot;authorName&quot;: &quot;王阿姨&quot;,
        &quot;content&quot;: &quot;今天完成了散步训练&quot;,
        &quot;likeCount&quot;: 9
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>发布帖子</td><td>用于发布帖子。</td><td><code>POST</code></td><td><code>/api/v1/app/community/posts</code></td><td><strong>Body</strong><br>topicId?: string<br>content: string<br>images?: string[]<br>tagLabel?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;postId&quot;: &quot;post_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>获取帖子详情</td><td>用于获取帖子详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/community/posts/:postId</code></td><td><strong>Path</strong><br>postId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;postId&quot;: &quot;post_001&quot;,
    &quot;authorName&quot;: &quot;王阿姨&quot;,
    &quot;content&quot;: &quot;今天完成了散步训练&quot;,
    &quot;images&quot;: []
  }
}</code></pre></td></tr>
    <tr><td>编辑帖子</td><td>用于编辑帖子。</td><td><code>PUT</code></td><td><code>/api/v1/app/community/posts/:postId</code></td><td><strong>Path</strong><br>postId: string<hr><strong>Body</strong><br>content?: string<br>images?: string[]<br>tagLabel?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;postId&quot;: &quot;post_001&quot;,
    &quot;updated&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>删除帖子</td><td>用于删除帖子，返回删除动作执行结果。</td><td><code>DELETE</code></td><td><code>/api/v1/app/community/posts/:postId</code></td><td><strong>Path</strong><br>postId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;postId&quot;: &quot;post_001&quot;,
    &quot;deleted&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>点赞帖子</td><td>用于点赞帖子。</td><td><code>POST</code></td><td><code>/api/v1/app/community/posts/:postId/like</code></td><td><strong>Path</strong><br>postId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>收藏帖子</td><td>用于收藏帖子。</td><td><code>POST</code></td><td><code>/api/v1/app/community/posts/:postId/favorite</code></td><td><strong>Path</strong><br>postId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>记录帖子分享</td><td>用于记录帖子分享，返回记录写入结果。</td><td><code>POST</code></td><td><code>/api/v1/app/community/posts/:postId/share</code></td><td><strong>Path</strong><br>postId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>获取评论列表</td><td>用于获取评论列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/community/posts/:postId/comments</code></td><td><strong>Path</strong><br>postId: string<hr><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;commentId&quot;: &quot;comment_001&quot;,
        &quot;userName&quot;: &quot;李阿姨&quot;,
        &quot;content&quot;: &quot;继续加油&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>发表评论</td><td>用于发表评论。</td><td><code>POST</code></td><td><code>/api/v1/app/community/posts/:postId/comments</code></td><td><strong>Path</strong><br>postId: string<hr><strong>Body</strong><br>parentId?: string<br>content: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;commentId&quot;: &quot;comment_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>获取活动列表</td><td>用于获取活动列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/community/activities</code></td><td><strong>Query</strong><br>status?: &quot;UPCOMING&quot; | &quot;ONGOING&quot; | &quot;ENDED&quot; | &quot;CANCELLED&quot;<br>sort?: &quot;latest&quot; | &quot;LATEST&quot; | &quot;hot&quot; | &quot;HOT&quot;<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;activityId&quot;: &quot;act_001&quot;,
        &quot;title&quot;: &quot;社区义诊&quot;,
        &quot;startAt&quot;: &quot;2026-04-28T09:00:00Z&quot;,
        &quot;registerStatus&quot;: &quot;OPEN&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取我参加的活动</td><td>用于获取我参加的活动，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/community/activities/my</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;activityId&quot;: &quot;act_001&quot;,
        &quot;title&quot;: &quot;社区义诊&quot;,
        &quot;status&quot;: &quot;REGISTERED&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取活动详情</td><td>用于获取活动详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/community/activities/:activityId</code></td><td><strong>Path</strong><br>activityId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;activityId&quot;: &quot;act_001&quot;,
    &quot;title&quot;: &quot;社区义诊&quot;,
    &quot;address&quot;: &quot;社区卫生服务中心&quot;,
    &quot;seatsLeft&quot;: 12
  }
}</code></pre></td></tr>
    <tr><td>点赞活动</td><td>用于点赞活动。</td><td><code>POST</code></td><td><code>/api/v1/app/community/activities/:activityId/like</code></td><td><strong>Path</strong><br>activityId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 26
  }
}</code></pre></td></tr>
    <tr><td>收藏活动</td><td>用于收藏活动。</td><td><code>POST</code></td><td><code>/api/v1/app/community/activities/:activityId/favorite</code></td><td><strong>Path</strong><br>activityId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 26
  }
}</code></pre></td></tr>
    <tr><td>记录活动分享</td><td>用于记录活动分享，返回记录写入结果。</td><td><code>POST</code></td><td><code>/api/v1/app/community/activities/:activityId/share</code></td><td><strong>Path</strong><br>activityId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;success&quot;: true,
    &quot;count&quot;: 26
  }
}</code></pre></td></tr>
    <tr><td>获取活动评论列表</td><td>用于获取活动评论列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/community/activities/:activityId/comments</code></td><td><strong>Path</strong><br>activityId: string<hr><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;commentId&quot;: &quot;comment_001&quot;,
        &quot;userName&quot;: &quot;王兰&quot;,
        &quot;content&quot;: &quot;已经报名&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>发表评论活动评论</td><td>用于发表评论活动评论。</td><td><code>POST</code></td><td><code>/api/v1/app/community/activities/:activityId/comments</code></td><td><strong>Path</strong><br>activityId: string<hr><strong>Body</strong><br>parentId?: string<br>content: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;commentId&quot;: &quot;comment_001&quot;,
    &quot;created&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>活动报名</td><td>用于活动报名。</td><td><code>POST</code></td><td><code>/api/v1/app/community/activities/:activityId/register</code></td><td><strong>Path</strong><br>activityId: string<hr><strong>Body</strong><br>remark?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;activityId&quot;: &quot;act_001&quot;,
    &quot;registered&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>取消活动报名</td><td>用于取消活动报名，返回取消后的状态结果。</td><td><code>POST</code></td><td><code>/api/v1/app/community/activities/:activityId/cancel</code></td><td><strong>Path</strong><br>activityId: string<hr><strong>Body</strong><br>reason?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;activityId&quot;: &quot;act_001&quot;,
    &quot;cancelled&quot;: true
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 用户端 / AI 助手

鉴权：`APP_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>创建智能助手会话</td><td>用于创建智能助手会话，返回新建后的业务对象。</td><td><code>POST</code></td><td><code>/api/v1/app/ai/assistant/conversations</code></td><td><strong>Body</strong><br>topic?: string<br>welcomeMessage?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;conversationId&quot;: &quot;ai_conv_001&quot;,
    &quot;topic&quot;: &quot;血压管理&quot;,
    &quot;welcomeMessage&quot;: &quot;您好，我可以协助您解读健康数据。&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取智能助手会话详情</td><td>用于获取智能助手会话详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/assistant/conversations/:conversationId</code></td><td><strong>Path</strong><br>conversationId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;conversationId&quot;: &quot;ai_conv_001&quot;,
    &quot;topic&quot;: &quot;血压管理&quot;,
    &quot;status&quot;: &quot;ACTIVE&quot;
  }
}</code></pre></td></tr>
    <tr><td>获取智能助手会话消息</td><td>用于获取智能助手会话消息，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/assistant/conversations/:conversationId/messages</code></td><td><strong>Path</strong><br>conversationId: string<hr><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;messageId&quot;: &quot;ai_msg_001&quot;,
        &quot;role&quot;: &quot;assistant&quot;,
        &quot;content&quot;: &quot;最近血压整体稳定。&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>发送智能助手消息并获取 AI 回复</td><td>用于发送智能助手消息并获取 AI 回复，返回发送执行结果。</td><td><code>POST</code></td><td><code>/api/v1/app/ai/assistant/conversations/:conversationId/messages</code></td><td><strong>Path</strong><br>conversationId: string<hr><strong>Body</strong><br>content: string<br>pageId?: string<br>route?: string<br>metadata?: Record&lt;string, unknown&gt;</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;userMessage&quot;: {
      &quot;content&quot;: &quot;请解释最近血压趋势。&quot;
    },
    &quot;assistantMessage&quot;: {
      &quot;content&quot;: &quot;近 7 天收缩压基本维持在 125-135 之间。&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>生成 AI 服务推荐</td><td>用于生成 AI 服务推荐。</td><td><code>POST</code></td><td><code>/api/v1/app/ai/service-recommendations</code></td><td><strong>Body</strong><br>elderId?: string<br>query?: string<br>category?: ServiceCategory<br>city?: string<br>limit?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;serviceId&quot;: &quot;srv_001&quot;,
        &quot;title&quot;: &quot;脑卒中康复理疗&quot;,
        &quot;score&quot;: 0.94,
        &quot;reasons&quot;: [
          &quot;与长者康复阶段匹配&quot;
        ]
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>生成 AI 预约预填草稿</td><td>用于生成 AI 预约预填草稿。</td><td><code>POST</code></td><td><code>/api/v1/app/ai/order-prefill</code></td><td><strong>Body</strong><br>elderId?: string<br>orderId?: string<br>serviceRequest?: string<br>healthContextRef?: string<br>resourceConstraints?: ResourceConstraintDto[]</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;serviceId&quot;: &quot;srv_001&quot;,
    &quot;bookingDate&quot;: &quot;2026-04-24&quot;,
    &quot;bookingTimeSlot&quot;: &quot;13:00-15:00&quot;,
    &quot;remark&quot;: &quot;建议安排康复治疗师&quot;
  }
}</code></pre></td></tr>
    <tr><td>生成 AI 健康摘要</td><td>用于生成 AI 健康摘要。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/health-summary</code></td><td><strong>Query</strong><br>elderId?: string<br>metricTypes?: string[]</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;summary&quot;: &quot;近 7 日血压和步数整体稳定。&quot;,
    &quot;highlights&quot;: [
      &quot;晨间血压较平稳&quot;,
      &quot;步数连续 3 日达标&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>生成 AI 指标趋势解释</td><td>用于生成 AI 指标趋势解释。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/health-metric-explanations</code></td><td><strong>Query</strong><br>elderId?: string<br>metricTypes?: string[]</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;items&quot;: [
      {
        &quot;metricKey&quot;: &quot;bloodPressure&quot;,
        &quot;explanation&quot;: &quot;近一周血压波动不大，整体处于可控范围。&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>生成 AI 报告解读</td><td>用于生成 AI 报告解读。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/reports/:reportId/interpretation</code></td><td><strong>Path</strong><br>reportId: string<hr><strong>Query</strong><br>elderId?: string<br>metricTypes?: string[]</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reportId&quot;: &quot;report_001&quot;,
    &quot;interpretation&quot;: &quot;血脂略高，建议饮食控制并定期复查。&quot;
  }
}</code></pre></td></tr>
    <tr><td>生成 AI 报告后续建议</td><td>用于生成 AI 报告后续建议。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/reports/:reportId/followup-suggestions</code></td><td><strong>Path</strong><br>reportId: string<hr><strong>Query</strong><br>elderId?: string<br>metricTypes?: string[]</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reportId&quot;: &quot;report_001&quot;,
    &quot;suggestions&quot;: [
      &quot;两周后复测血脂&quot;,
      &quot;减少高油高糖饮食&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取 AI 风险提醒列表</td><td>用于获取 AI 风险提醒列表，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/risk-alerts</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;alertId&quot;: &quot;alert_001&quot;,
        &quot;level&quot;: &quot;MEDIUM&quot;,
        &quot;title&quot;: &quot;连续两日血压偏高&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取 AI 风险提醒详情</td><td>用于获取 AI 风险提醒详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/risk-alerts/:alertId</code></td><td><strong>Path</strong><br>alertId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;alertId&quot;: &quot;alert_001&quot;,
    &quot;level&quot;: &quot;MEDIUM&quot;,
    &quot;title&quot;: &quot;连续两日血压偏高&quot;,
    &quot;suggestion&quot;: &quot;建议补测并联系医生&quot;
  }
}</code></pre></td></tr>
    <tr><td>检索 AI 知识库上下文</td><td>用于检索 AI 知识库上下文。</td><td><code>GET</code></td><td><code>/api/v1/app/ai/knowledge/search</code></td><td><strong>Query</strong><br>query: string<br>elderId?: string<br>includePrivate?: boolean<br>knowledgeTypes?: RagKnowledgeType[]<br>limit?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;chunkId&quot;: &quot;kb_001&quot;,
        &quot;title&quot;: &quot;高血压日常管理指南&quot;,
        &quot;score&quot;: 0.91,
        &quot;snippet&quot;: &quot;建议每日固定时段测量血压。&quot;
      }
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 后台端 / 后台认证

鉴权：`无需鉴权`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>后台密码登录</td><td>用于校验后台账号密码并返回后台访问令牌。</td><td><code>POST</code></td><td><code>/api/v1/admin/auth/login/password</code></td><td><strong>Body</strong><br>phone: string<br>password: string<br>agreePrivacy: boolean<br>deviceId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;accessToken&quot;: &quot;ACCESS_TOKEN&quot;,
    &quot;refreshToken&quot;: &quot;REFRESH_TOKEN&quot;,
    &quot;expiresIn&quot;: 7200,
    &quot;user&quot;: {
      &quot;id&quot;: &quot;user_001&quot;,
      &quot;role&quot;: &quot;PLATFORM_ADMIN&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>刷新后台 Token</td><td>用于使用 refreshToken 换取新的后台访问令牌。</td><td><code>POST</code></td><td><code>/api/v1/admin/auth/token/refresh</code></td><td><strong>Body</strong><br>refreshToken: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;accessToken&quot;: &quot;NEW_ACCESS_TOKEN&quot;,
    &quot;refreshToken&quot;: &quot;NEW_REFRESH_TOKEN&quot;,
    &quot;expiresIn&quot;: 7200
  }
}</code></pre></td></tr>
    <tr><td>获取当前后台登录用户</td><td>用于获取当前后台登录账号的基础信息与角色信息。</td><td><code>GET</code></td><td><code>/api/v1/admin/auth/me</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;id&quot;: &quot;admin_001&quot;,
    &quot;name&quot;: &quot;平台管理员&quot;,
    &quot;roles&quot;: [
      &quot;PLATFORM_ADMIN&quot;
    ]
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 后台端 / 后台工作台

鉴权：`ADMIN_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>获取后台总览数据</td><td>后台首页进入后的首个接口，用于统计卡片、待处理事项和运营概览。</td><td><code>GET</code></td><td><code>/api/v1/admin/dashboard/overview</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;cards&quot;: [
      {
        &quot;code&quot;: &quot;pendingOrders&quot;,
        &quot;value&quot;: 12
      },
      {
        &quot;code&quot;: &quot;pendingReports&quot;,
        &quot;value&quot;: 4
      }
    ],
    &quot;todoList&quot;: [
      {
        &quot;id&quot;: &quot;todo_001&quot;,
        &quot;title&quot;: &quot;待审核体检报告&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取长者详情</td><td>后台长者详情页接口。elderId 通常来自后台列表、工单或订单关联数据。</td><td><code>GET</code></td><td><code>/api/v1/admin/elders/:elderId</code></td><td><strong>Path</strong><br>elderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;elderId&quot;: &quot;elder_001&quot;,
    &quot;name&quot;: &quot;王建国&quot;,
    &quot;age&quot;: 78,
    &quot;recentOrderCount&quot;: 3,
    &quot;riskTags&quot;: [
      &quot;高血压&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取工单列表</td><td>后台工单列表页接口，支持分页。workOrderId 需要从该列表返回中获取。</td><td><code>GET</code></td><td><code>/api/v1/admin/work-orders</code></td><td><strong>Query</strong><br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;workOrderId&quot;: &quot;wo_001&quot;,
        &quot;orderId&quot;: &quot;order_001&quot;,
        &quot;assignee&quot;: &quot;张护理员&quot;,
        &quot;status&quot;: &quot;ASSIGNED&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 后台端 / 后台订单调度

鉴权：`ADMIN_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>后台获取订单列表</td><td>后台订单管理页接口，可按状态筛选。</td><td><code>GET</code></td><td><code>/api/v1/admin/orders</code></td><td><strong>Query</strong><br>status?: OrderStatus<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;orderId&quot;: &quot;order_001&quot;,
        &quot;userName&quot;: &quot;王兰&quot;,
        &quot;serviceName&quot;: &quot;脑卒中康复理疗&quot;,
        &quot;status&quot;: &quot;BOOKED&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>后台获取订单详情</td><td>后台订单详情页接口。</td><td><code>GET</code></td><td><code>/api/v1/admin/orders/:orderId</code></td><td><strong>Path</strong><br>orderId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;serviceName&quot;: &quot;脑卒中康复理疗&quot;,
    &quot;status&quot;: &quot;BOOKED&quot;,
    &quot;assignee&quot;: &quot;张护理员&quot;
  }
}</code></pre></td></tr>
    <tr><td>后台派单</td><td>后台分派服务机构、员工或排班时调用。</td><td><code>POST</code></td><td><code>/api/v1/admin/orders/:orderId/dispatch</code></td><td><strong>Path</strong><br>orderId: string<hr><strong>Body</strong><br>institutionId?: string<br>assigneeStaffId?: string<br>scheduleId?: string<br>dispatchNote?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;orderId&quot;: &quot;order_001&quot;,
    &quot;workOrderId&quot;: &quot;wo_001&quot;,
    &quot;dispatched&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>更新工单状态</td><td>后台工单执行过程中的状态流转接口。</td><td><code>PUT</code></td><td><code>/api/v1/admin/work-orders/:workOrderId/status</code></td><td><strong>Path</strong><br>workOrderId: string<hr><strong>Body</strong><br>status: WorkOrderStatus</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;workOrderId&quot;: &quot;wo_001&quot;,
    &quot;status&quot;: &quot;IN_SERVICE&quot;,
    &quot;updated&quot;: true
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 后台端 / 后台报告审核

鉴权：`ADMIN_TOKEN`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>后台获取报告列表</td><td>后台报告管理页接口，可按审核状态筛选。</td><td><code>GET</code></td><td><code>/api/v1/admin/reports</code></td><td><strong>Query</strong><br>status?: ReportStatus<br>page?: number<br>pageSize?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;reportId&quot;: &quot;report_001&quot;,
        &quot;elderName&quot;: &quot;王建国&quot;,
        &quot;status&quot;: &quot;PENDING_REVIEW&quot;
      }
    ],
    &quot;page&quot;: 1,
    &quot;pageSize&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>后台审核报告</td><td>后台审核动作接口。reportId 来自后台报告列表。</td><td><code>PUT</code></td><td><code>/api/v1/admin/reports/:reportId/review</code></td><td><strong>Path</strong><br>reportId: string<hr><strong>Body</strong><br>status: ReportStatus</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reportId&quot;: &quot;report_001&quot;,
    &quot;status&quot;: &quot;APPROVED&quot;,
    &quot;reviewedAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
  }
}</code></pre></td></tr>
  </tbody>
</table>

## 内部治理层 / 智能体与 RAG

鉴权：`ADMIN_TOKEN + 内部访问校验`

<table>
  <thead>
    <tr><th>API名称</th><th>含义</th><th>请求方法</th><th>请求路径</th><th>请求参数</th><th>响应示例</th></tr>
  </thead>
  <tbody>
    <tr><td>查询智能体定义列表</td><td>用于查询当前系统已注册的智能体定义列表。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/definitions</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;agentName&quot;: &quot;health-summary-agent&quot;,
        &quot;displayName&quot;: &quot;健康摘要智能体&quot;,
        &quot;taskTypes&quot;: [
          &quot;health-summary&quot;
        ]
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>获取多智能体架构蓝图</td><td>用于查看当前多智能体体系的整体蓝图配置。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/blueprint</code></td><td>无</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;version&quot;: &quot;0.1.0&quot;,
    &quot;layers&quot;: [
      &quot;app&quot;,
      &quot;governance&quot;,
      &quot;rag&quot;
    ],
    &quot;agents&quot;: [
      &quot;health-summary-agent&quot;,
      &quot;report-interpretation-agent&quot;
    ]
  }
}</code></pre></td></tr>
    <tr><td>创建智能体任务</td><td>用于创建新的智能体执行任务并加入调度队列。</td><td><code>POST</code></td><td><code>/api/v1/internal/agents/tasks</code></td><td><strong>Body</strong><br>agentName: string<br>taskType: string<br>ownerId?: string<br>triggerSource: &quot;assistant&quot; | &quot;internal-api&quot; | &quot;event&quot; | &quot;schedule&quot;<br>payload: Record&lt;string, unknown&gt;</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;task&quot;: {
      &quot;id&quot;: &quot;task_001&quot;,
      &quot;agentName&quot;: &quot;health-summary-agent&quot;,
      &quot;status&quot;: &quot;QUEUED&quot;
    },
    &quot;queued&quot;: true,
    &quot;jobId&quot;: &quot;bullmq_001&quot;
  }
}</code></pre></td></tr>
    <tr><td>查询智能体任务列表</td><td>用于按状态、任务类型和归属人查询智能体任务列表。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/tasks</code></td><td><strong>Query</strong><br>status?: AgentTaskStatus<br>ownerId?: string<br>agentName?: string<br>taskType?: string<br>limit?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;id&quot;: &quot;task_001&quot;,
        &quot;agentName&quot;: &quot;health-summary-agent&quot;,
        &quot;taskType&quot;: &quot;health-summary&quot;,
        &quot;status&quot;: &quot;SUCCEEDED&quot;
      }
    ],
    &quot;limit&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取智能体任务详情</td><td>用于获取指定智能体任务的执行详情与结果。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/tasks/:taskId</code></td><td><strong>Path</strong><br>taskId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;id&quot;: &quot;task_001&quot;,
    &quot;agentName&quot;: &quot;health-summary-agent&quot;,
    &quot;taskType&quot;: &quot;health-summary&quot;,
    &quot;status&quot;: &quot;SUCCEEDED&quot;,
    &quot;result&quot;: {
      &quot;summary&quot;: &quot;近 7 日血压稳定。&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>重试智能体任务</td><td>用于对指定智能体任务发起重试执行。</td><td><code>POST</code></td><td><code>/api/v1/internal/agents/tasks/:taskId/retry</code></td><td><strong>Path</strong><br>taskId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;task&quot;: {
      &quot;id&quot;: &quot;task_001&quot;,
      &quot;status&quot;: &quot;QUEUED&quot;
    },
    &quot;queued&quot;: true,
    &quot;jobId&quot;: &quot;bullmq_002&quot;
  }
}</code></pre></td></tr>
    <tr><td>查询人工复核队列</td><td>用于查询人工复核队列，返回符合筛选条件的数据结果。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/reviews</code></td><td><strong>Query</strong><br>status?: AgentHumanReviewStatus<br>queueName?: string<br>agentTaskId?: string<br>limit?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;reviewId&quot;: &quot;review_001&quot;,
        &quot;status&quot;: &quot;PENDING&quot;,
        &quot;queueName&quot;: &quot;medical-review&quot;
      }
    ],
    &quot;limit&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取人工复核详情</td><td>用于获取人工复核详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/reviews/:reviewId</code></td><td><strong>Path</strong><br>reviewId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reviewId&quot;: &quot;review_001&quot;,
    &quot;status&quot;: &quot;PENDING&quot;,
    &quot;taskId&quot;: &quot;task_001&quot;,
    &quot;payload&quot;: {
      &quot;content&quot;: &quot;待复核摘要&quot;
    }
  }
}</code></pre></td></tr>
    <tr><td>提交人工复核决策</td><td>用于提交人工复核决策，返回提交后的处理结果。</td><td><code>POST</code></td><td><code>/api/v1/internal/agents/reviews/:reviewId/decision</code></td><td><strong>Path</strong><br>reviewId: string<hr><strong>Body</strong><br>decision: &quot;approved&quot; | &quot;rejected&quot; | &quot;blocked&quot;<br>notes?: string[]<br>blockedAction?: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;reviewId&quot;: &quot;review_001&quot;,
    &quot;decision&quot;: &quot;approved&quot;,
    &quot;resolved&quot;: true
  }
}</code></pre></td></tr>
    <tr><td>查询智能体审计日志</td><td>用于查询智能体审计日志，返回符合筛选条件的数据结果。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/audit-logs</code></td><td><strong>Query</strong><br>agentTaskId?: string<br>humanReviewId?: string<br>eventType?: string<br>limit?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;logId&quot;: &quot;audit_001&quot;,
        &quot;eventType&quot;: &quot;TASK_COMPLETED&quot;,
        &quot;agentTaskId&quot;: &quot;task_001&quot;,
        &quot;createdAt&quot;: &quot;2026-04-23T08:00:00Z&quot;
      }
    ],
    &quot;limit&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>查询 RAG 知识库列表</td><td>用于查询 RAG 知识库列表，返回符合筛选条件的数据结果。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/rag/knowledge-bases</code></td><td><strong>Query</strong><br>ownerUserId?: string<br>institutionId?: string<br>knowledgeTypes?: RagKnowledgeType[]<br>visibilityScopes?: RagVisibilityScope[]</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;knowledgeBaseId&quot;: &quot;kb_001&quot;,
        &quot;knowledgeType&quot;: &quot;REPORT&quot;,
        &quot;visibilityScope&quot;: &quot;PRIVATE&quot;,
        &quot;chunkCount&quot;: 128
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>执行 RAG 检索</td><td>用于执行 RAG 检索。</td><td><code>POST</code></td><td><code>/api/v1/internal/agents/rag/search</code></td><td><strong>Body</strong><br>query: string<br>ownerUserId?: string<br>institutionId?: string<br>knowledgeTypes?: RagKnowledgeType[]<br>visibilityScopes?: RagVisibilityScope[]<br>limit?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;chunkId&quot;: &quot;kb_001&quot;,
        &quot;score&quot;: 0.96,
        &quot;title&quot;: &quot;高血压日常管理指南&quot;,
        &quot;snippet&quot;: &quot;建议每日固定时段测量血压。&quot;
      }
    ]
  }
}</code></pre></td></tr>
    <tr><td>查询 RAG 评测结果</td><td>用于查询 RAG 评测结果，返回符合筛选条件的数据结果。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/rag/evals</code></td><td><strong>Query</strong><br>status?: RagEvalRunStatus<br>datasetName?: string<br>limit?: number</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;list&quot;: [
      {
        &quot;runId&quot;: &quot;eval_001&quot;,
        &quot;datasetName&quot;: &quot;rag_eval_v1&quot;,
        &quot;status&quot;: &quot;SUCCEEDED&quot;,
        &quot;score&quot;: 0.88
      }
    ],
    &quot;limit&quot;: 20,
    &quot;total&quot;: 1
  }
}</code></pre></td></tr>
    <tr><td>获取 RAG 评测详情</td><td>用于获取 RAG 评测详情，返回当前业务对象或列表数据。</td><td><code>GET</code></td><td><code>/api/v1/internal/agents/rag/evals/:runId</code></td><td><strong>Path</strong><br>runId: string</td><td><pre><code>{
  &quot;code&quot;: 0,
  &quot;message&quot;: &quot;ok&quot;,
  &quot;data&quot;: {
    &quot;runId&quot;: &quot;eval_001&quot;,
    &quot;datasetName&quot;: &quot;rag_eval_v1&quot;,
    &quot;status&quot;: &quot;SUCCEEDED&quot;,
    &quot;metrics&quot;: {
      &quot;precision&quot;: 0.9,
      &quot;recall&quot;: 0.86
    }
  }
}</code></pre></td></tr>
  </tbody>
</table>

