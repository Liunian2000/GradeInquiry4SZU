// ==UserScript==
// @name         深圳大学平时成绩&期末成绩查询
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  基础功能
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

    // 注入核心样式
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

        /* 头部区域 */
        #score-query-container .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        #score-query-container h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }

        /* 关闭按钮 */
        #score-query-container .close-btn {
            position: relative;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #f5f5f5;
            cursor: pointer;
            transition: background 0.3s;
        }
        #score-query-container .close-btn:hover {
            background: #ebebeb;
        }
        #score-query-container .close-btn::before,
        #score-query-container .close-btn::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 2px;
            height: 14px;
            background: #999;
            transform: translate(-50%, -50%);
        }
        #score-query-container .close-btn::before {
            transform: translate(-50%, -50%) rotate(45deg);
        }
        #score-query-container .close-btn::after {
            transform: translate(-50%, -50%) rotate(-45deg);
        }

        /* 操作按钮 */
        #start-query {
            width: 100%;
            padding: 12px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s;
        }
        #start-query:hover {
            box-shadow: 0 6px 18px rgba(76, 175, 80, 0.25);
            transform: translateY(-1px);
        }
        #start-query:disabled {
            background: #ccc;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }

        /* 进度条 */
        .progress-container {
            margin: 8px 0 16px;
        }
        .progress-bar {
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
        }
        .progress {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            width: 0%;
            transition: width 0.3s ease-in-out;
        }

        /* 状态提示 */
        #status {
            margin-bottom: 8px;
            font-size: 14px;
            color: #666;
        }

        /* 结果区域 */
        #score-results {
            max-height: 300px;
            overflow-y: auto;
            padding-right: 8px;
        }
        .course-item {
            padding: 12px 0;
            border-bottom: 1px solid #f5f5f5;
        }
        .course-item:last-child {
            border-bottom: none;
        }
        .course-item strong {
            font-size: 15px;
            color: #333;
            margin-bottom: 6px;
            display: block;
        }
        .course-item div {
            font-size: 13px;
            color: #666;
            line-height: 1.6;
        }

        /* 滚动条优化 */
        #score-results::-webkit-scrollbar {
            width: 6px;
        }
        #score-results::-webkit-scrollbar-thumb {
            background: #ddd;
            border-radius: 3px;
        }
        #score-results::-webkit-scrollbar-track {
            background: transparent;
        }

        /* 切换按钮 */
        #toggle-btn {
            position: fixed;
            top: 30px;
            right: 30px;
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
            color: #fff;
            border: none;
            border-radius: 50%;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            z-index: 99998;
            box-shadow: 0 6px 18px rgba(76, 175, 80, 0.25);
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #toggle-btn:hover {
            box-shadow: 0 8px 24px rgba(76, 175, 80, 0.35);
            transform: translateY(-2px);
        }
    `);

    // 创建切换按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-btn';
    toggleBtn.textContent = '深大\n成绩';
    document.body.appendChild(toggleBtn);

    // 初始化UI容器
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
                <div class="progress-bar">
                    <div class="progress" id="progress"></div>
                </div>
            </div>
            <div id="status">准备就绪</div>
            <div id="score-results"></div>
        `;
        document.body.appendChild(container);
        scriptState.container = container;

        // 元素引用
        const startBtn = container.querySelector('#start-query');
        const statusEl = container.querySelector('#status');
        const progressEl = container.querySelector('#progress');
        const resultsEl = container.querySelector('#score-results');
        const closeBtn = container.querySelector('.close-btn');

        // 关闭按钮事件
        closeBtn.addEventListener('click', () => {
            container.classList.add('hidden');
        });

        // 开始查询逻辑
        startBtn.addEventListener('click', async () => {
            if (scriptState.isRunning) return;

            // 跨域提示
            if (!document.location.href.includes('ehall.szu.edu.cn')) {
                if (!confirm('建议在深大教务系统内使用，继续查询？')) {
                    return;
                }
            }

            scriptState.isRunning = true;
            scriptState.courseData = [];
            startBtn.disabled = true;
            statusEl.textContent = '查询中...';
            progressEl.style.width = '0%';
            resultsEl.innerHTML = '';

            try {
                for (let score = 0; score <= 100; score++) {
                    await queryPS(score);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    await queryQM(score);
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const progress = (score / 100) * 100;
                    progressEl.style.width = `${progress}%`;
                    statusEl.textContent = `进度：${score}%`;
                    renderResults();
                }
                statusEl.textContent = '查询完成！';
            } catch (err) {
                console.error(err);
                statusEl.textContent = '查询异常，请检查控制台';
            } finally {
                scriptState.isRunning = false;
                startBtn.disabled = false;
            }
        });
    }

    // 渲染查询结果
    function renderResults() {
        const resultsEl = scriptState.container.querySelector('#score-results');
        resultsEl.innerHTML = '';

        scriptState.courseData.forEach(course => {
            const item = document.createElement('div');
            item.className = 'course-item';
            item.innerHTML = `
                <strong>${course.KCM}</strong>
                <div>平时成绩：${course.PSCJ}（系数：${course.PSCJXS}）</div>
                <div>期末成绩：${course.QMCJ}（系数：${course.QMCJXS}）</div>
            `;
            resultsEl.appendChild(item);
        });
    }

    // 切换容器显示
    toggleBtn.addEventListener('click', () => {
        scriptState.container.classList.toggle('hidden');
    });

    // 成绩查询核心函数（保持原有逻辑，仅调整调用方式）
    function queryPS(score) { /* 原有queryPS逻辑保持不变 */ }
    function queryQM(score) { /* 原有queryQM逻辑保持不变 */ }
    function processResults(rows, scoreType, score) { /* 原有处理逻辑保持不变 */ }
    function getCookie() { /* 原有Cookie处理逻辑保持不变 */ }

    // 初始化执行
    initContainer();
    GM_registerMenuCommand("打开深大成绩查询", () => {
        scriptState.container.classList.remove('hidden');
    });

})();
