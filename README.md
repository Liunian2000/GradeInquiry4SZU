# 深圳大学成绩查询助手

## 项目介绍

这是一个油猴(Tampermonkey)脚本，用于查询深圳大学本科课程的平时成绩和期末成绩。脚本通过遍历分数范围(0-100)的方式，从教务系统获取成绩数据并整合展示。该方法灵感来源于 [Matt-Dong123/tools4szu](https://github.com/Matt-Dong123/tools4szu) 项目，在此基础上进行了前端优化和交互增强。

如果你觉得这个项目对你有所帮助的话，帮我点个star咯（嬉皮笑脸）

ps：有一说一我觉得这个更好看也更好用[Greasyfork-szu获取详细成绩](https://greasyfork.org/zh-CN/scripts/529958-szu%E8%8E%B7%E5%8F%96%E8%AF%A6%E7%BB%86%E6%88%90%E7%BB%A9)，po个链接吧

## 功能特点

- **可视化界面**：美观的卡片式设计，实时显示查询进度和结果
- **一键查询**：点击按钮自动获取所有课程的平时分和期末分
- **成绩整合**：自动合并同一课程的平时成绩和期末成绩数据
- **安全便捷**：直接在浏览器中运行，无需额外安装软件

## 安装使用说明

### 前提条件

1. 安装浏览器扩展：
   - **Chrome**：安装 [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - **Firefox**：安装 [Greasemonkey](https://addons.mozilla.org/zh-CN/firefox/addon/greasemonkey/) 或 [Tampermonkey](https://addons.mozilla.org/zh-CN/firefox/addon/tampermonkey/)
   - **Edge**：安装 [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/篡改猴测试版/fcmfnpggmnlmfebfghbfnillijihnkoh?hl=zh-cn)

2. 油猴扩展已打开开发者模式

4. 确保已登录深圳大学办事大厅：
   - 访问 [办事大厅](https://ehall.szu.edu.cn/new/index.html) 并打开“成绩查询”应用

### 安装步骤

1. 如果你已经安装了油猴，你可以直接访问greasyfork的项目地址[（深圳大学平时成绩&期末成绩查询）](https://greasyfork.org/zh-CN/scripts/542686-%E6%B7%B1%E5%9C%B3%E5%A4%A7%E5%AD%A6%E5%B9%B3%E6%97%B6%E6%88%90%E7%BB%A9-%E6%9C%9F%E6%9C%AB%E6%88%90%E7%BB%A9%E6%9F%A5%E8%AF%A2)进行快速安装
2. 如果你无法访问greasyfork，你可以点击浏览器扩展栏中的 Tampermonkey 图标，选择 "添加新脚本"
3. 将仓库中的main.js的代码复制到脚本编辑页面（替换原有内容）
4. 点击菜单栏的 "文件" -> "保存"（或按 Ctrl+S）保存脚本

### 使用流程

1. 登录深圳大学办事大厅成绩查询页面
2. 页面右上角会出现一个绿色的"深大成绩"按钮
3. 点击按钮显示查询面板
4. 点击"开始查询成绩"按钮开始查询
5. 等待进度条完成，查询结果会显示在面板中

## 工作原理

脚本通过以下方式实现成绩查询：

1. **遍历分数查询**：对0到100的每个分数，分别查询平时成绩(PSCJ)和期末成绩(QMCJ)等于该分数的课程
2. **数据整合**：将相同课程的平时成绩和期末成绩合并到同一记录中
3. **结果展示**：将整合后的课程成绩数据以清晰的格式展示在页面上

## 注意事项

1. **使用限制**：
   - 脚本仅在深圳大学教务系统成绩查询页面生效（`https://ehall.szu.edu.cn/jwapp/sys/cjcx/*`）
   - 查询过程中请勿关闭教务系统页面或清除浏览器Cookie

2. **查询耗时**：
   - 完整查询需要遍历201个分数(0-100的平时分和期末分)，每次查询间隔200毫秒
   - 总耗时约40秒，具体取决于网络环境和服务器响应速度

3. **可能的问题**：
   - 若查询结果为空，请确认已登录教务系统并有权限查看成绩
   - 若频繁查询失败，可能是教务系统限制，请稍后再试
   - 如遇跨域错误，请确保在教务系统页面内使用

## 项目来源

本项目的查询方法源自 [Matt-Dong123/tools4szu](https://github.com/Matt-Dong123/tools4szu) 项目，在此基础上进行了前端界面优化和油猴脚本适配。感谢原作者的技术贡献！
