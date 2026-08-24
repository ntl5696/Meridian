window.FS.editor = window.FS.editor || {};

window.FS.editor.calculateCurrentWpm = function () {
    if (window.FS.state.timeElapsed < 2) return 0;
    return Math.round((window.FS.state.wordsCount / window.FS.state.timeElapsed) * 60);
};

window.FS.editor.updateLiveStats = function () {
    window.FS.dom.indicatorWords.innerHTML = `<i data-lucide="pencil"></i> ${window.FS.state.wordsCount} words`;

    const rollingWpm = window.FS.editor.calculateCurrentWpm();
    window.FS.dom.indicatorWpm.innerText = `${rollingWpm} WPM`;

    if (rollingWpm > 60) {
        window.FS.dom.flowPulse.style.animationDuration = '0.5s';
        window.FS.dom.flowPulse.style.backgroundColor = 'var(--success)';
    } else if (rollingWpm > 30) {
        window.FS.dom.flowPulse.style.animationDuration = '1.2s';
        window.FS.dom.flowPulse.style.backgroundColor = 'var(--accent)';
    } else {
        window.FS.dom.flowPulse.style.animationDuration = '2s';
        window.FS.dom.flowPulse.style.backgroundColor = 'var(--text-muted)';
    }

    if (window.lucide) window.lucide.createIcons();
};

window.FS.editor.renderVelocityGraph = function () {
    window.FS.dom.velocitySvg.innerHTML = '';

    if (window.FS.state.sessionHistoryPoints.length < 2) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '250');
        text.setAttribute('y', '75');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'var(--text-muted)');
        text.setAttribute('font-size', '12');
        text.textContent = "Write longer to generate writing speed metrics.";
        window.FS.dom.velocitySvg.appendChild(text);
        return;
    }

    const maxWpm = Math.max(...window.FS.state.sessionHistoryPoints.map(p => p.wpm), 80);
    const maxTime = window.FS.state.sessionHistoryPoints[window.FS.state.sessionHistoryPoints.length - 1].time;

    const svgWidth = 500;
    const svgHeight = 150;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 20;

    const graphW = svgWidth - paddingLeft - paddingRight;
    const graphH = svgHeight - paddingTop - paddingBottom;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    linearGradient.setAttribute('id', 'graph-gradient');
    linearGradient.setAttribute('x1', '0');
    linearGradient.setAttribute('y1', '0');
    linearGradient.setAttribute('x2', '0');
    linearGradient.setAttribute('y2', '1');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'var(--primary)');
    stop1.setAttribute('stop-opacity', '0.4');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'var(--primary)');
    stop2.setAttribute('stop-opacity', '0.0');

    linearGradient.appendChild(stop1);
    linearGradient.appendChild(stop2);
    defs.appendChild(linearGradient);
    window.FS.dom.velocitySvg.appendChild(defs);

    const gridLinesCount = 3;
    for (let i = 0; i <= gridLinesCount; i++) {
        const gridY = paddingTop + (graphH * (i / gridLinesCount));
        const wpmVal = Math.round(maxWpm - (maxWpm * (i / gridLinesCount)));

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', paddingLeft.toString());
        line.setAttribute('y1', gridY.toString());
        line.setAttribute('x2', (svgWidth - paddingRight).toString());
        line.setAttribute('y2', gridY.toString());
        line.setAttribute('class', 'graph-grid');
        window.FS.dom.velocitySvg.appendChild(line);

        const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelText.setAttribute('x', (paddingLeft - 8).toString());
        labelText.setAttribute('y', (gridY + 3).toString());
        labelText.setAttribute('text-anchor', 'end');
        labelText.setAttribute('class', 'graph-axis-text');
        labelText.textContent = wpmVal;
        window.FS.dom.velocitySvg.appendChild(labelText);
    }

    const points = window.FS.state.sessionHistoryPoints.map(p => {
        const x = paddingLeft + (p.time / maxTime) * graphW;
        const y = paddingTop + graphH - (p.wpm / maxWpm) * graphH;
        return { x, y, time: p.time, wpm: p.wpm };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;

        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + graphH} L ${points[0].x} ${paddingTop + graphH} Z`;
    const pathArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathArea.setAttribute('d', areaD);
    pathArea.setAttribute('class', 'graph-area');
    window.FS.dom.velocitySvg.appendChild(pathArea);

    const pathLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathLine.setAttribute('d', pathD);
    pathLine.setAttribute('class', 'graph-line');
    window.FS.dom.velocitySvg.appendChild(pathLine);

    points.forEach(pt => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', pt.x.toString());
        dot.setAttribute('cy', pt.y.toString());
        dot.setAttribute('r', '4');
        dot.setAttribute('class', 'graph-dot');

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `Time: ${pt.time}s, Speed: ${pt.wpm} WPM`;
        dot.appendChild(title);

        window.FS.dom.velocitySvg.appendChild(dot);
    });
};

window.FS.editor.currentCalendarDate = new Date();

window.FS.editor.handleWordCountChange = function() {
    if (!window.FS.state.activeDocId) return;
    
    const text = window.FS.dom.editorTextarea.innerText || "";
    const stats = window.FS.utils.computeTextStats(text);
    const currentWordCount = stats.words;

    const footerWords = document.getElementById('editor-footer-words');
    if (footerWords) {
        footerWords.innerText = `${currentWordCount} words`;
    }
    
    if (window.FS.state.lastRecordedWordCount === undefined) {
        window.FS.state.lastRecordedWordCount = currentWordCount;
        return;
    }
    
    if (currentWordCount > window.FS.state.lastRecordedWordCount) {
        const diff = currentWordCount - window.FS.state.lastRecordedWordCount;
        window.FS.editor.recordDailyWords(diff);
        window.FS.state.lastRecordedWordCount = currentWordCount;
    }
};

window.FS.editor.recordDailyWords = function(wordsTyped) {
    if (wordsTyped <= 0) return;
    
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    let stats = {};
    const raw = localStorage.getItem('flowstate_daily_stats');
    if (raw) {
        try {
            stats = JSON.parse(raw);
        } catch (e) {
            stats = {};
        }
    }
    
    stats[dateStr] = (stats[dateStr] || 0) + wordsTyped;
    localStorage.setItem('flowstate_daily_stats', JSON.stringify(stats));
    
    if (window.FS.editor.updateDailyGoalWidget) {
        window.FS.editor.updateDailyGoalWidget();
    }
};

window.FS.editor.updateDailyGoalWidget = function() {
    if (!window.FS.dom.dailyGoalWidget) return;
    
    const showWidget = window.FS.dom.chkShowDailyGoal.checked;
    if (!showWidget) {
        window.FS.dom.dailyGoalWidget.style.display = 'none';
        if (window.FS.dom.btnShowDailyGoalTab) window.FS.dom.btnShowDailyGoalTab.style.display = 'none';
        return;
    }
    
    window.FS.dom.dailyGoalWidget.style.display = 'flex';
    if (window.FS.dom.btnShowDailyGoalTab) window.FS.dom.btnShowDailyGoalTab.style.display = 'block';
    
    const isCollapsed = window.FS.state && window.FS.state.dailyGoalCollapsed;
    if (isCollapsed) {
        window.FS.dom.dailyGoalWidget.classList.add('collapsed');
        if (window.FS.dom.btnShowDailyGoalTab) window.FS.dom.btnShowDailyGoalTab.classList.add('visible');
    } else {
        window.FS.dom.dailyGoalWidget.classList.remove('collapsed');
        if (window.FS.dom.btnShowDailyGoalTab) window.FS.dom.btnShowDailyGoalTab.classList.remove('visible');
    }
    
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const stats = window.FS.editor.getDailyStats();
    const todayWords = stats[dateStr] || 0;
    const goal = parseInt(window.FS.dom.inputDailyGoal.value) || 500;
    
    window.FS.dom.dailyGoalText.innerText = `${todayWords.toLocaleString()} / ${goal.toLocaleString()}`;
    
    if (todayWords >= goal && goal > 0) {
        window.FS.dom.dailyGoalText.style.color = 'var(--success)';
    } else {
        window.FS.dom.dailyGoalText.style.color = 'var(--text-color)';
    }
};

window.FS.editor.getDailyStats = function() {
    const raw = localStorage.getItem('flowstate_daily_stats');
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch(e) {
        return {};
    }
};

window.FS.editor.initCalendar = function() {
    const date = window.FS.editor.currentCalendarDate;
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    
    // Set header month year
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    window.FS.dom.calendarMonthYear.innerText = `${monthNames[month]} ${year}`;
    
    // Clear days grid
    window.FS.dom.calendarDaysGrid.innerHTML = '';
    
    // Get daily stats from storage
    const stats = window.FS.editor.getDailyStats();
    
    // Days in current month
    const firstDayIndex = new Date(year, month, 1).getDay(); // day of week (0-6)
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Days in previous month (to fill prefix)
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    // Total cells in calendar grid
    const daysFromPrevMonth = firstDayIndex;
    const nextMonthFillerDays = (7 - ((daysFromPrevMonth + totalDays) % 7)) % 7;
    const totalCells = daysFromPrevMonth + totalDays + nextMonthFillerDays;
    
    let monthTotalWords = 0;
    let daysWithWritingThisMonth = 0;
    
    // Helper to format date key YYYY-MM-DD
    const formatDateKey = (y, m, d) => {
        return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };
    
    const today = new Date();
    const todayStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    
    const firstDateStr = Object.keys(stats).sort()[0];
    const goal = parseInt(window.FS.dom.inputDailyGoal.value) || 500;

    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        
        let dayNum;
        let cellDateStr;
        let isCurrentMonth = true;
        
        if (i < daysFromPrevMonth) {
            // Previous month prefix cell
            dayNum = prevMonthTotalDays - daysFromPrevMonth + i + 1;
            isCurrentMonth = false;
            cell.classList.add('other-month');
        } else if (i >= daysFromPrevMonth + totalDays) {
            // Next month suffix cell
            dayNum = i - (daysFromPrevMonth + totalDays) + 1;
            isCurrentMonth = false;
            cell.classList.add('other-month');
        } else {
            // Current month cell
            dayNum = i - daysFromPrevMonth + 1;
            cellDateStr = formatDateKey(year, month, dayNum);
            
            if (cellDateStr === todayStr) {
                cell.classList.add('today');
            }
        }
        
        const dayNumberEl = document.createElement('span');
        dayNumberEl.className = 'day-number';
        dayNumberEl.innerText = dayNum;
        cell.appendChild(dayNumberEl);
        
        if (isCurrentMonth && cellDateStr) {
            const words = stats[cellDateStr] || 0;
            
            // Only add words badge if words > 0 or if today
            if (words > 0 || cellDateStr === todayStr) {
                if (words > 0) {
                    monthTotalWords += words;
                    daysWithWritingThisMonth++;
                }
                
                const dayWordsEl = document.createElement('span');
                dayWordsEl.className = 'day-words';
                
                if (words >= 1000) {
                    dayWordsEl.innerText = `${(words / 1000).toFixed(1)}k w`;
                } else {
                    dayWordsEl.innerText = `${words} w`;
                }
                cell.appendChild(dayWordsEl);
                cell.setAttribute('title', `${words} words written on ${cellDateStr}`);
            }

            // Cell coloring logic
            if (cellDateStr > todayStr) {
                // Future day
            } else if (cellDateStr === todayStr) {
                if (words >= goal && goal > 0) {
                    cell.classList.add('day-goal-met');
                } else {
                    cell.classList.add('day-goal-pending');
                }
            } else if (firstDateStr && cellDateStr >= firstDateStr) {
                // Past days since first writing
                if (words >= goal && goal > 0) {
                    cell.classList.add('day-goal-met');
                } else {
                    cell.classList.add('day-goal-missed');
                }
            }
        }
        
        window.FS.dom.calendarDaysGrid.appendChild(cell);
    }
    
    // Update summary values
    window.FS.dom.calStatTotal.innerText = `${monthTotalWords.toLocaleString()} words`;
    const avg = daysWithWritingThisMonth > 0 ? Math.round(monthTotalWords / daysWithWritingThisMonth) : 0;
    window.FS.dom.calStatAvg.innerText = `${avg.toLocaleString()} w/day`;
    
    // Calculate current writing streak
    const streak = window.FS.editor.calculateStreak(stats, goal);
    window.FS.dom.calStatStreak.innerText = `${streak} ${streak === 1 ? 'day' : 'days'}`;
};

window.FS.editor.calculateStreak = function(stats, goal = 500) {
    let streak = 0;
    let checkDate = new Date();
    
    const formatDateKey = (d) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    
    // Check if goal was met today or yesterday to start the streak count
    let key = formatDateKey(checkDate);
    if (!stats[key] || stats[key] < goal) {
        // Try yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        key = formatDateKey(checkDate);
    }
    
    // Count consecutive days backwards where goal was met
    while (stats[key] !== undefined && stats[key] >= goal && goal > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        key = formatDateKey(checkDate);
    }
    
    return streak;
};
