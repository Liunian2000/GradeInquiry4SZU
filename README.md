# 深圳大学成绩查询助手

## 项目介绍

这是一个油猴(Tampermonkey)脚本，用于查询深圳大学本科课程的平时成绩和期末成绩。脚本通过遍历分数范围(0-100)的方式，从教务系统获取成绩数据并整合展示。该方法灵感来源于 [Matt-Dong123/tools4szu](https://github.com/Matt-Dong123/tools4szu) 项目，在此基础上进行了前端优化和交互增强。

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
   - 访问 [办事大厅](https://portal.szu.edu.cn/index.html#/) 并打开“成绩查询”应用

### 安装步骤

1. 点击浏览器扩展栏中的 Tampermonkey 图标，选择 "添加新脚本"
2. 将以下代码复制到脚本编辑页面（替换原有内容）
3. 点击菜单栏的 "文件" -> "保存"（或按 Ctrl+S）保存脚本

```javascript
// ==UserScript==
// @name         深圳大学平时成绩&期末成绩查询
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  修复BUG，增加总成绩/等级计算、导出CSV功能，并优化了对100%平时分课程的处理。
// @author       流年
// @match        https://ehall.szu.edu.cn/jwapp/sys/cjcx/*
// @match        https://ehall-443.webvpn.szu.edu.cn/jwapp/sys/cjcx/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    let scriptState = {
        isRunning: false,
        courseData: [],
        container: null
    };

    // 注入核心样式 (样式代码保持不变，此处省略以保持简洁)
    GM_addStyle(`
        #score-query-container { position: fixed; top: 30px; right: 30px; width: 480px; background: #fff; border-radius: 12px; padding: 24px; z-index: 99999; box-shadow: 0 12px 32px rgba(0,0,0,0.12); transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        #score-query-container.hidden { transform: translateX(120%); opacity: 0; pointer-events: none; }
        #score-query-container h3 { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .close-btn { position: relative; width: 28px; height: 28px; border-radius: 50%; background: #f5f5f5; cursor: pointer; transition: background 0.3s; }
        .close-btn:hover { background: #ebebeb; }
        .close-btn::before, .close-btn::after { content: ''; position: absolute; top: 50%; left: 50%; width: 2px; height: 14px; background: #999; transform: translate(-50%, -50%); }
        .close-btn::before { transform: translate(-50%, -50%) rotate(45deg); }
        .close-btn::after { transform: translate(-50%, -50%) rotate(-45deg); }
        #start-query, .export-btn { width: 100%; padding: 12px; margin-bottom: 12px; border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; }
        #start-query { background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); }
        #start-query:hover { box-shadow: 0 6px 18px rgba(76, 175, 80, 0.25); transform: translateY(-1px); }
        .export-btn { background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%); }
        .export-btn:hover { box-shadow: 0 6px 18px rgba(33, 150, 243, 0.25); transform: translateY(-1px); }
        #start-query:disabled, .export-btn:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; transform: none; }
        .progress-container { margin: 8px 0 16px; }
        .progress-bar { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
        .progress { height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); width: 0%; transition: width 0.3s ease-in-out; }
        #status { margin-bottom: 8px; font-size: 14px; color: #666; }
        #score-results { max-height: 400px; overflow-y: auto; padding-right: 8px; }
        .course-item { padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
        .course-item:last-child { border-bottom: none; }
        .course-item strong { font-size: 15px; color: #333; margin-bottom: 6px; display: block; }
        .course-item div { font-size: 13px; color: #666; line-height: 1.6; }
        .final-score { font-weight: bold; color: #e91e63; }
        #score-results::-webkit-scrollbar { width: 6px; }
        #score-results::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        #score-results::-webkit-scrollbar-track { background: transparent; }
        #toggle-btn { position: fixed; top: 30px; right: 30px; width: 52px; height: 52px; background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); color: #fff; border: none; border-radius: 50%; font-size: 14px; font-weight: 500; cursor: pointer; z-index: 99998; box-shadow: 0 6px 18px rgba(76, 175, 80, 0.25); transition: all 0.3s; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.2; }
        #toggle-btn:hover { box-shadow: 0 8px 24px rgba(76, 175, 80, 0.35); transform: translateY(-2px); }
    `);

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-btn';
    toggleBtn.innerHTML = '深大<br>成绩';
    document.body.appendChild(toggleBtn);

    function initContainer() {
        const container = document.createElement('div');
        container.id = 'score-query-container';
        container.className = 'hidden';
        container.innerHTML = `
            <div class="header">
                <h3>深圳大学成绩查询助手</h3>
                <span class="close-btn"></span>
            </div>
            <button id="start-query">开始查询成绩</button>
            <div class="progress-container">
                <div class="progress-bar"><div class="progress" id="progress"></div></div>
            </div>
            <div id="status">准备就绪</div>
            <div id="score-results"></div>
            <button id="export-scores" class="export-btn" disabled>导出为CSV文件</button>
        `;
        document.body.appendChild(container);
        scriptState.container = container;

        const startBtn = container.querySelector('#start-query');
        const exportBtn = container.querySelector('#export-scores');
        const statusEl = container.querySelector('#status');
        const progressEl = container.querySelector('#progress');
        const resultsEl = container.querySelector('#score-results');
        const closeBtn = container.querySelector('.close-btn');

        closeBtn.addEventListener('click', () => container.classList.add('hidden'));

        startBtn.addEventListener('click', async () => {
            if (scriptState.isRunning) return;

            scriptState.isRunning = true;
            startBtn.disabled = true;
            exportBtn.disabled = true;
            resultsEl.innerHTML = '';
            progressEl.style.width = '0%';
            statusEl.textContent = '正在获取课程列表...';

            try {
                const initialCourses = await fetchInitialCourseList();
                if (!initialCourses || initialCourses.length === 0) {
                    statusEl.textContent = '未找到任何课程记录，请确认当前学期有成绩。';
                    return;
                }

                const courseMap = new Map();
                initialCourses.forEach(course => {
                    const key = course.KCM + course.XNXQDM_DISPLAY;
                    course.PSCJ = 'N/A';
                    course.QMCJ = 'N/A';
                    courseMap.set(key, course);
                });

                let pscjFoundCount = 0;
                let qmcjFoundCount = 0;
                const totalCourses = courseMap.size;
                statusEl.textContent = '正在查询详细成绩...';

                for (let score = 100; score >= 0; score--) {
                    const progress = ((100 - score) / 100) * 100;
                    progressEl.style.width = `${progress}%`;
                    statusEl.textContent = `查询进度: ${Math.round(progress)}%`;

                    if (pscjFoundCount >= totalCourses && qmcjFoundCount >= totalCourses) break;

                    const [pscjRows, qmcjRows] = await Promise.all([
                        pscjFoundCount < totalCourses ? performQuery(score, 'PSCJ') : Promise.resolve([]),
                        qmcjFoundCount < totalCourses ? performQuery(score, 'QMCJ') : Promise.resolve([])
                    ]);

                    pscjRows.forEach(row => {
                        const key = row.KCM + row.XNXQDM_DISPLAY;
                        const course = courseMap.get(key);
                        if (course && course.PSCJ === 'N/A') {
                            course.PSCJ = score.toString();
                            course.PSCJXS = row.PSCJXS;
                            pscjFoundCount++;
                        }
                    });

                    qmcjRows.forEach(row => {
                        const key = row.KCM + row.XNXQDM_DISPLAY;
                        const course = courseMap.get(key);
                        if (course && course.QMCJ === 'N/A') {
                            course.QMCJ = score.toString();
                            course.QMCJXS = row.QMCJXS;
                            qmcjFoundCount++;
                        }
                    });

                    scriptState.courseData = Array.from(courseMap.values());
                    renderResults();
                    await new Promise(resolve => setTimeout(resolve, 150));
                }

                progressEl.style.width = '100%';
                statusEl.textContent = '查询完成！';
                exportBtn.disabled = false;

            } catch (err) {
                console.error("查询过程中发生错误:", err);
                statusEl.textContent = `查询异常: ${err.message}`;
            } finally {
                scriptState.isRunning = false;
                startBtn.disabled = false;
            }
        });

        exportBtn.addEventListener('click', () => {
            if (scriptState.courseData.length === 0) {
                alert('没有成绩数据可导出。');
                return;
            }

            const header = "学期,课程名称,平时成绩,平时系数(%),期末成绩,期末系数(%),总成绩,等级\n";
            const rows = scriptState.courseData.map(course => {
                const { finalScore, grade } = calculateFinalScoreAndGrade(course);
                return [
                    `"${course.XNXQDM_DISPLAY}"`,
                    `"${course.KCM}"`,
                    course.PSCJ,
                    course.PSCJXS || 'N/A',
                    course.QMCJ,
                    course.QMCJXS || 'N/A',
                    finalScore, // 已经是整数或'N/A'
                    grade
                ].join(',');
            }).join('\n');

            const csvContent = "\uFEFF" + header + rows;
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "深大成绩单.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // [核心修改] 重写计算总成绩和等级的函数
    function calculateFinalScoreAndGrade(course) {
        const pscj = parseFloat(course.PSCJ);
        const qmcj = parseFloat(course.QMCJ);
        const pscjxs = parseFloat(course.PSCJXS);
        const qmcjxs = parseFloat(course.QMCJXS);

        let rawFinalScore;

        // 优先处理特殊情况：平时成绩占100%
        if (pscjxs === 100 && !isNaN(pscj)) {
            rawFinalScore = pscj;
        }
        // 处理常规情况：平时和期末成绩共同构成
        else if (![pscj, qmcj, pscjxs, qmcjxs].some(isNaN)) {
            rawFinalScore = (pscj * pscjxs / 100) + (qmcj * qmcjxs / 100);
        }
        // 如果以上条件都不满足，则无法计算
        else {
            return { finalScore: 'N/A', grade: 'N/A' };
        }

        // 四舍五入到整数
        const finalScore = Math.round(rawFinalScore);

        // 根据整数总成绩评定等级
        let grade = 'F';
        if (finalScore >= 93) grade = 'A+';
        else if (finalScore >= 85) grade = 'A';
        else if (finalScore >= 80) grade = 'B+';
        else if (finalScore >= 75) grade = 'B';
        else if (finalScore >= 70) grade = 'C+';
        else if (finalScore >= 65) grade = 'C';
        else if (finalScore >= 60) grade = 'D';

        return { finalScore, grade };
    }

    function renderResults() {
        const resultsEl = scriptState.container.querySelector('#score-results');
        resultsEl.innerHTML = '';
        const sortedCourses = [...scriptState.courseData].sort((a, b) => {
            if (a.XNXQDM_DISPLAY > b.XNXQDM_DISPLAY) return -1;
            if (a.XNXQDM_DISPLAY < b.XNXQDM_DISPLAY) return 1;
            return a.KCM.localeCompare(b.KCM);
        });

        sortedCourses.forEach(course => {
            const { finalScore, grade } = calculateFinalScoreAndGrade(course);
            const item = document.createElement('div');
            item.className = 'course-item';
            item.innerHTML = `
                <strong>${course.KCM} (${course.XNXQDM_DISPLAY})</strong>
                <div>平时成绩：<span style="color: #4CAF50; font-weight: bold;">${course.PSCJ}</span>（系数：${course.PSCJXS || 'N/A'}%）</div>
                <div>期末成绩：<span style="color: #FF5722; font-weight: bold;">${course.QMCJ}</span>（系数：${course.QMCJXS || 'N/A'}%）</div>
                <div>最终总评：<span class="final-score">${finalScore}</span> (等级: <span class="final-score">${grade}</span>)</div>
            `;
            resultsEl.appendChild(item);
        });
    }

    toggleBtn.addEventListener('click', () => scriptState.container.classList.toggle('hidden'));

    function fetchInitialCourseList() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `${location.origin}/jwapp/sys/cjcx/modules/cjcx/xscjcx.do`,
                headers: { "Cookie": document.cookie },
                onload: res => {
                    try {
                        const data = JSON.parse(res.responseText);
                        resolve(data?.datas?.xscjcx?.rows || []);
                    } catch (e) { reject(new Error("解析初始课程列表失败")); }
                },
                onerror: () => reject(new Error("获取初始课程列表网络请求失败"))
            });
        });
    }

    function performQuery(score, scoreType) {
        return new Promise(resolve => {
            const payload = `querySetting=[{"name":"${scoreType}","value":"${score}","linkOpt":"and","builder":"equal"}]&pageSize=100&pageNumber=1`;
            GM_xmlhttpRequest({
                method: "POST",
                url: `${location.origin}/jwapp/sys/cjcx/modules/cjcx/xscjcx.do`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                    "Cookie": document.cookie
                },
                data: payload,
                onload: res => {
                    try {
                        const data = JSON.parse(res.responseText);
                        resolve(data?.datas?.xscjcx?.rows || []);
                    } catch (e) {
                        console.error(`解析${scoreType}=${score}的响应失败:`, e);
                        resolve([]);
                    }
                },
                onerror: () => {
                    console.error(`查询${scoreType}=${score}时网络请求失败`);
                    resolve([]);
                }
            });
        });
    }

    initContainer();
    GM_registerMenuCommand("打开深大成绩查询", () => {
        if (scriptState.container) {
            scriptState.container.classList.remove('hidden');
        }
    });

})();

```

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
