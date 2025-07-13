// ==UserScript==
// @name         深圳大学平时成绩&期末成绩查询
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  修复了无法获取具体成绩的BUG，采用先获取列表再填充成绩的正确算法。
// @author       流年
// @match        https://ehall.szu.edu.cn/jwapp/sys/cjcx/*
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
        /* 主容器 */
        #score-query-container {
            position: fixed;
            top: 30px;
            right: 30px;
            width: 360px;
            background: #fff;
            border-radius: 12px;
            padding: 24px;
            z-index: 99999;
            box-shadow: 0 12px 32px rgba(0,0,0,0.12);
            transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        #score-query-container.hidden {
            transform: translateX(120%);
            opacity: 0;
            pointer-events: none;
        }
        /* ... 其他样式 ... */
        #score-query-container h3 { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .close-btn { position: relative; width: 28px; height: 28px; border-radius: 50%; background: #f5f5f5; cursor: pointer; transition: background 0.3s; }
        .close-btn:hover { background: #ebebeb; }
        .close-btn::before, .close-btn::after { content: ''; position: absolute; top: 50%; left: 50%; width: 2px; height: 14px; background: #999; transform: translate(-50%, -50%); }
        .close-btn::before { transform: translate(-50%, -50%) rotate(45deg); }
        .close-btn::after { transform: translate(-50%, -50%) rotate(-45deg); }
        #start-query { width: 100%; padding: 12px; margin-bottom: 12px; background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; }
        #start-query:hover { box-shadow: 0 6px 18px rgba(76, 175, 80, 0.25); transform: translateY(-1px); }
        #start-query:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; transform: none; }
        .progress-container { margin: 8px 0 16px; }
        .progress-bar { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
        .progress { height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); width: 0%; transition: width 0.3s ease-in-out; }
        #status { margin-bottom: 8px; font-size: 14px; color: #666; }
        #score-results { max-height: 300px; overflow-y: auto; padding-right: 8px; }
        .course-item { padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
        .course-item:last-child { border-bottom: none; }
        .course-item strong { font-size: 15px; color: #333; margin-bottom: 6px; display: block; }
        .course-item div { font-size: 13px; color: #666; line-height: 1.6; }
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
        `;
        document.body.appendChild(container);
        scriptState.container = container;

        const startBtn = container.querySelector('#start-query');
        const statusEl = container.querySelector('#status');
        const progressEl = container.querySelector('#progress');
        const resultsEl = container.querySelector('#score-results');
        const closeBtn = container.querySelector('.close-btn');

        closeBtn.addEventListener('click', () => container.classList.add('hidden'));

        startBtn.addEventListener('click', async () => {
            if (scriptState.isRunning) return;

            scriptState.isRunning = true;
            startBtn.disabled = true;
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
                    // [修改] 只显示百分比进度
                    statusEl.textContent = `查询进度: ${Math.round(progress)}%`;

                    if (pscjFoundCount >= totalCourses && qmcjFoundCount >= totalCourses) {
                        break;
                    }

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

            } catch (err) {
                console.error("查询过程中发生错误:", err);
                statusEl.textContent = `查询异常: ${err.message}`;
            } finally {
                scriptState.isRunning = false;
                startBtn.disabled = false;
            }
        });
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
            const item = document.createElement('div');
            item.className = 'course-item';
            item.innerHTML = `
                <strong>${course.KCM} (${course.XNXQDM_DISPLAY})</strong>
                <div>平时成绩：<span style="color: #4CAF50; font-weight: bold;">${course.PSCJ}</span>（系数：${course.PSCJXS || 'N/A'}%）</div>
                <div>期末成绩：<span style="color: #FF5722; font-weight: bold;">${course.QMCJ}</span>（系数：${course.QMCJXS || 'N/A'}%）</div>
            `;
            resultsEl.appendChild(item);
        });
    }

    toggleBtn.addEventListener('click', () => scriptState.container.classList.toggle('hidden'));

    function fetchInitialCourseList() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://ehall.szu.edu.cn/jwapp/sys/cjcx/modules/cjcx/xscjcx.do",
                headers: {
                    "Cookie": document.cookie
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data && data.datas && data.datas.xscjcx && data.datas.xscjcx.rows) {
                            resolve(data.datas.xscjcx.rows);
                        } else {
                            resolve([]);
                        }
                    } catch (e) {
                        reject(new Error("解析初始课程列表失败"));
                    }
                },
                onerror: () => reject(new Error("获取初始课程列表网络请求失败"))
            });
        });
    }

    function performQuery(score, scoreType) {
        return new Promise((resolve, reject) => {
            const payload = `querySetting=[{"name":"${scoreType}","value":"${score}","linkOpt":"and","builder":"equal"}]&pageSize=100&pageNumber=1`;
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://ehall.szu.edu.cn/jwapp/sys/cjcx/modules/cjcx/xscjcx.do",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                    "Cookie": document.cookie
                },
                data: payload,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data && data.datas && data.datas.xscjcx && data.datas.xscjcx.rows) {
                            resolve(data.datas.xscjcx.rows);
                        } else {
                            resolve([]);
                        }
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
