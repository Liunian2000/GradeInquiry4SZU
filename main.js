// ==UserScript==
// @name         深圳大学平时成绩&期末成绩查询 (优化版)
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  UI优化
// @author       流年.
// @match        https://ehall.szu.edu.cn/jwapp/sys/cjcx/*
// @match        https://ehall-443.webvpn.szu.edu.cn/jwapp/sys/cjcx/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    let scriptState = {
        isRunning: false,
        courseData: [],
        container: null,
        studentId: null,
        studentName: null
    };

    // [优化] 注入优化的核心样式
    GM_addStyle(`
        /* Main container and general layout */
        #score-query-container {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 450px;
            background: #f9f9f9;
            border-radius: 16px;
            padding: 20px;
            z-index: 99999;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        #score-query-container.hidden {
            transform: translateX(110%);
            opacity: 0;
            pointer-events: none;
        }

        /* Header */
        .sq-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e0e0e0;
        }
        .sq-header h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: #212121;
        }
        .sq-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            background: #e0e0e0;
            border-radius: 50%;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
        }
        .sq-close-btn:hover {
            background-color: #d1d1d1;
            transform: rotate(90deg);
        }
        .sq-close-btn svg {
            width: 14px;
            height: 14px;
            stroke: #555;
        }

        /* Main content area */
        .sq-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }

        /* Action Buttons */
        .sq-actions {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }
        .sq-btn {
            flex-grow: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .sq-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .sq-btn:disabled {
            background: #bdbdbd !important; /* Use important to override gradient */
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }
        #start-query {
            background: linear-gradient(135deg, #43A047 0%, #66BB6A 100%);
        }
        #export-scores {
            background: linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%);
        }

        /* Progress and Status */
        .progress-container {
            margin-bottom: 16px;
        }
        .progress-bar {
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
        }
        .progress {
            height: 100%;
            background: linear-gradient(90deg, #43A047, #81C784);
            width: 0%;
            transition: width 0.3s ease-in-out;
        }
        #status {
            margin-bottom: 8px;
            font-size: 0.85rem;
            color: #616161;
            text-align: center;
            min-height: 20px;
        }

        /* Results Area */
        #score-results {
            max-height: 350px;
            overflow-y: auto;
            margin: 0 -12px;
            padding: 4px 12px;
        }
        .course-item {
            padding: 14px;
            background: #fff;
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            margin-bottom: 10px;
            transition: box-shadow 0.2s, transform 0.2s;
        }
        .course-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .course-item:last-child {
            margin-bottom: 0;
        }
        .course-item strong {
            font-size: 1rem;
            color: #333;
            margin-bottom: 8px;
            display: block;
        }
        .course-item div {
            font-size: 0.85rem;
            color: #616161;
            line-height: 1.7;
        }
        .final-score {
            font-weight: bold;
            color: #d81b60;
        }
        #score-results::-webkit-scrollbar { width: 6px; }
        #score-results::-webkit-scrollbar-thumb { background: #bdbdbd; border-radius: 3px; }
        #score-results::-webkit-scrollbar-track { background: transparent; }

        /* Footer */
        .sq-footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            color: #757575;
        }
        .github-link {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #757575;
            text-decoration: none;
            transition: color 0.2s;
        }
        .github-link:hover {
            color: #212121;
        }
        .github-link svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }

        /* Toggle Button */
        #toggle-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #43A047 0%, #66BB6A 100%);
            color: #fff;
            border: none;
            border-radius: 50%;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            z-index: 99998;
            box-shadow: 0 6px 18px rgba(67, 160, 71, 0.3);
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            line-height: 1.2;
        }
        #toggle-btn:hover {
            box-shadow: 0 8px 24px rgba(67, 160, 71, 0.4);
            transform: translateY(-2px) scale(1.05);
        }
    `);

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-btn';
    toggleBtn.innerHTML = '深大<br>成绩';
    document.body.appendChild(toggleBtn);

    function getStudentInfoFromPage() {
        const allTds = document.querySelectorAll('td');
        for (const td of allTds) {
            const text = td.textContent.trim();
            if (text === '学号' && td.nextElementSibling) {
                scriptState.studentId = td.nextElementSibling.textContent.trim();
            }
            if (text === '姓名' && td.nextElementSibling) {
                scriptState.studentName = td.nextElementSibling.textContent.trim();
            }
            if (scriptState.studentId && scriptState.studentName) {
                break;
            }
        }
    }

    function initContainer() {
        const container = document.createElement('div');
        container.id = 'score-query-container';
        container.className = 'hidden';
        // [优化] 注入新的HTML结构
        container.innerHTML = `
            <div class="sq-header">
                <h3>深圳大学成绩查询助手</h3>
                <button class="sq-close-btn" title="关闭">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div class="sq-content">
                <div class="sq-actions">
                    <button id="start-query" class="sq-btn">开始查询</button>
                    <button id="export-scores" class="sq-btn" disabled>导出CSV</button>
                </div>
                <div class="progress-container">
                    <div id="status">准备就绪</div>
                    <div class="progress-bar"><div class="progress" id="progress"></div></div>
                </div>
                <div id="score-results"></div>
            </div>

            <div class="sq-footer">
                <span>&copy; 2025 流年</span>
                <a href="https://github.com/Liunian2000/GradeInquiry4SZU/" target="_blank" class="github-link" title="查看源码">
                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                    <span>GitHub</span>
                </a>
            </div>
        `;
        document.body.appendChild(container);
        scriptState.container = container;

        const startBtn = container.querySelector('#start-query');
        const exportBtn = container.querySelector('#export-scores');
        const statusEl = container.querySelector('#status');
        const progressEl = container.querySelector('#progress');
        const resultsEl = container.querySelector('#score-results');
        const closeBtn = container.querySelector('.sq-close-btn'); // [修改] 更新关闭按钮的选择器

        closeBtn.addEventListener('click', () => container.classList.add('hidden'));

        startBtn.addEventListener('click', async () => {
            if (scriptState.isRunning) return;

            getStudentInfoFromPage();

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

            const header = "学期,课程号,课程名称,平时成绩,平时系数(%),期末成绩,期末系数(%),总成绩,等级\n";
            const rows = scriptState.courseData.map(course => {
                const { finalScore, grade } = calculateFinalScoreAndGrade(course);
                return [
                    `"${course.XNXQDM_DISPLAY}"`,
                    `"${course.KCH || 'N/A'}"`,
                    `"${course.KCM}"`,
                    course.PSCJ,
                    course.PSCJXS || 'N/A',
                    course.QMCJ,
                    course.QMCJXS || 'N/A',
                    finalScore,
                    grade
                ].join(',');
            }).join('\n');

            const csvContent = "\uFEFF" + header + rows;
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);

            let filename = "深大详细成绩单.csv";
            if (scriptState.studentId && scriptState.studentName) {
                filename = `深大详细成绩单-${scriptState.studentId}-${scriptState.studentName}.csv`;
            }
            link.setAttribute("download", filename);

            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    function calculateFinalScoreAndGrade(course) {
        const pscj = parseFloat(course.PSCJ);
        const qmcj = parseFloat(course.QMCJ);
        const pscjxs = parseFloat(course.PSCJXS);
        const qmcjxs = parseFloat(course.QMCJXS);

        let rawFinalScore;

        if (pscjxs === 100 && !isNaN(pscj)) {
            rawFinalScore = pscj;
        } else if (![pscj, qmcj, pscjxs, qmcjxs].some(isNaN)) {
            rawFinalScore = (pscj * pscjxs / 100) + (qmcj * qmcjxs / 100);
        } else {
            return { finalScore: 'N/A', grade: 'N/A' };
        }

        const finalScore = Math.round(rawFinalScore);
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
