window.FS.editor = window.FS.editor || {};

window.FS.editor.autoSaveActiveDocument = function () {
    if (!window.FS.state.activeDocId || window.FS.state.sessionActive) return;

    let docs = window.FS.storage.getDocumentsFromStorage();
    let docIndex = docs.findIndex(d => d.id === window.FS.state.activeDocId);
    if (docIndex !== -1) {
        docs[docIndex].content = window.FS.dom.editorTextarea.innerHTML;
        docs[docIndex].words = window.FS.utils.computeTextStats(window.FS.dom.editorTextarea.innerText || "").words;
        docs[docIndex].modifiedAt = Date.now();
        window.FS.storage.saveDocuments(docs);

        const wordsBadge = document.querySelector(`.tree-item[data-id="${window.FS.state.activeDocId}"] span:nth-of-type(3)`);
        if (wordsBadge) {
            wordsBadge.innerText = `${docs[docIndex].words} w`;
        }
    }
};

window.FS.editor.startSession = function () {
    if (!window.FS.state.activeDocId) {
        alert("Please select or create a draft in the left sidebar explorer first!");
        return;
    }

    window.FS.settings.initAudioEngine();

    window.FS.state.sessionActive = true;
    window.FS.state.timeElapsed = 0;
    window.FS.state.averageWpm = 0;
    window.FS.state.sessionHistoryPoints = [];
    window.FS.state.lastTypedTime = Date.now();
    window.FS.state.lastKeystrokeTime = Date.now();

    const docs = window.FS.storage.getDocumentsFromStorage();
    const doc = docs.find(d => d.id === window.FS.state.activeDocId);

    window.FS.dom.editorTextarea.innerHTML = doc ? doc.content : '';
    window.FS.state.sessionText = window.FS.dom.editorTextarea.innerHTML;
    window.FS.state.wordsCount = window.FS.utils.computeTextStats(window.FS.dom.editorTextarea.innerText || "").words;

    window.FS.dom.editorTextarea.className = 'rich-text-editor';
    // Font size setting removed
    const lineSpacingSelect = document.getElementById('line-spacing-select');
    if (lineSpacingSelect) {
        window.FS.dom.editorTextarea.style.lineHeight = lineSpacingSelect.value;
    }

    window.FS.dom.inputSessionTitle.value = doc ? doc.title : 'Untitled Stream';

    if (window.FS.state.sessionGoalType === 'time') {
        const activeTimeBtn = window.FS.dom.timePresets.querySelector('.preset-btn.active');
        const val = activeTimeBtn.getAttribute('data-value');
        let durationMin = 5;
        if (val === 'custom') {
            durationMin = parseInt(window.FS.dom.inputCustomTime.value) || 5;
        } else {
            durationMin = parseInt(val) || 5;
        }
        window.FS.state.timeTarget = durationMin * 60;
        window.FS.editor.updateTimerIndicator(window.FS.state.timeTarget);
    } else if (window.FS.state.sessionGoalType === 'words') {
        const activeWordsBtn = window.FS.dom.wordsPresets.querySelector('.preset-btn.active');
        const val = activeWordsBtn.getAttribute('data-value');
        if (val === 'custom') {
            window.FS.state.wordsTarget = parseInt(window.FS.dom.inputCustomWords.value) || 250;
        } else {
            window.FS.state.wordsTarget = parseInt(val) || 250;
        }
        window.FS.dom.indicatorTime.innerHTML = `<i data-lucide="target"></i> Target: ${window.FS.state.wordsTarget} w`;
        if (window.lucide) window.lucide.createIcons();
    } else {
        window.FS.dom.indicatorTime.innerHTML = `<i data-lucide="infinity"></i> Endless`;
        if (window.lucide) window.lucide.createIcons();
    }

    window.FS.settings.updateEditorSoundButtons();
    window.FS.editor.updateLiveStats();

    window.FS.ui.switchView('main');
    document.body.classList.add('session-active');
    document.getElementById('session-settings-section').style.display = 'none';
    document.getElementById('btn-start-session').style.display = 'none';

    setTimeout(() => {
        window.FS.dom.editorTextarea.focus();
        window.FS.dom.editorTextarea.scrollTop = window.FS.dom.editorTextarea.scrollHeight;
    }, 400);

    if (window.flowAudio && window.flowAudio.isAmbientEnabled) {
        window.flowAudio.startAmbient();
    }
    
    window.FS.dom.btnAbandonSession.classList.remove('hidden');
    window.FS.dom.btnCompleteSession.classList.remove('hidden');
    window.FS.dom.btnEditorSoundToggle.classList.remove('hidden');
    window.FS.dom.btnEditorAmbientToggle.classList.remove('hidden');

    window.FS.editor.startSessionTimer();
    window.FS.editor.startFlowCheckingTimer();
};

window.FS.editor.startSessionTimer = function () {
    if (window.FS.state.sessionTimer) clearInterval(window.FS.state.sessionTimer);

    window.FS.state.sessionTimer = setInterval(() => {
        if (!window.FS.state.sessionActive) return;

        window.FS.state.timeElapsed++;

        if (window.FS.state.timeElapsed % 2 === 0) {
            const currentRollingWpm = window.FS.editor.calculateCurrentWpm();
            window.FS.state.sessionHistoryPoints.push({
                time: window.FS.state.timeElapsed,
                wpm: currentRollingWpm
            });
        }

        window.FS.editor.updateLiveStats();

        if (window.FS.state.sessionGoalType === 'time') {
            const timeRemaining = window.FS.state.timeTarget - window.FS.state.timeElapsed;
            window.FS.editor.updateTimerIndicator(timeRemaining);

            if (timeRemaining <= 0) {
                window.FS.editor.completeSession(true);
            }
        } else if (window.FS.state.sessionGoalType === 'words') {
            if (window.FS.state.wordsCount >= window.FS.state.wordsTarget) {
                window.FS.editor.completeSession(true);
            }
        }
    }, 1000);
};

window.FS.editor.updateTimerIndicator = function (secondsLeft) {
    if (secondsLeft < 0) secondsLeft = 0;
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    window.FS.dom.indicatorTime.innerHTML = `<i data-lucide="timer"></i> ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (window.lucide) window.lucide.createIcons();
};

window.FS.editor.completeSession = function (isCompletedSuccess = true) {
    window.FS.state.sessionActive = false;
    document.body.classList.remove('session-active');
    window.FS.editor.clearDangerAlerts();
    window.FS.editor.stopSessionTimers();
    window.FS.dom.btnAbandonSession.classList.add('hidden');
    window.FS.dom.btnCompleteSession.classList.add('hidden');
    window.FS.dom.btnEditorSoundToggle.classList.add('hidden');
    window.FS.dom.btnEditorAmbientToggle.classList.add('hidden');

    if (isCompletedSuccess) {
        window.FS.state.sessionText = window.FS.dom.editorTextarea.innerHTML;

        if (window.FS.state.activeDocId) {
            let docs = window.FS.storage.getDocumentsFromStorage();
            let idx = docs.findIndex(d => d.id === window.FS.state.activeDocId);
            if (idx !== -1) {
                docs[idx].content = window.FS.state.sessionText;
                docs[idx].words = window.FS.utils.computeTextStats(window.FS.dom.editorTextarea.innerText || "").words;
                docs[idx].modifiedAt = Date.now();
                window.FS.storage.saveDocuments(docs);
            }
        }

        window.FS.editor.showSessionResults(true);
    } else {
        const docs = window.FS.storage.getDocumentsFromStorage();
        const doc = docs.find(d => d.id === window.FS.state.activeDocId);
        window.FS.dom.editorTextarea.innerHTML = doc ? doc.content : '';
        window.FS.state.lastRecordedWordCount = doc ? window.FS.utils.computeTextStats(doc.content).words : 0;

        if (window.flowAudio) window.flowAudio.stopAmbient();
        window.FS.ui.switchView('main');
        document.getElementById('session-settings-section').style.display = 'block';
        document.getElementById('btn-start-session').style.display = 'flex';
    }

    window.FS.sidebar.renderSidebarTree();
};

window.FS.editor.stopSessionTimers = function () {
    if (window.FS.state.sessionTimer) clearInterval(window.FS.state.sessionTimer);
    if (window.FS.state.flowStateTimer) clearInterval(window.FS.state.flowStateTimer);
    if (window.FS.state.hardcoreTimerInstance) clearInterval(window.FS.state.hardcoreTimerInstance);

    window.FS.state.sessionTimer = null;
    window.FS.state.flowStateTimer = null;
    window.FS.state.hardcoreTimerInstance = null;

    document.body.classList.remove('body-focus-active');
};

window.FS.editor.showSessionResults = function (isSuccess) {
    if (window.flowAudio) {
        window.flowAudio.stopAmbient();
    }

    const stats = window.FS.utils.computeTextStats(window.FS.state.sessionText);
    window.FS.state.wordsCount = stats.words;
    window.FS.state.averageWpm = window.FS.state.timeElapsed > 0 ? Math.round((window.FS.state.wordsCount / window.FS.state.timeElapsed) * 60) : 0;

    window.FS.dom.resHeaderBox.className = 'results-header';
    if (isSuccess) {
        window.FS.dom.resHeaderBox.querySelector('.status-badge').className = 'status-badge success';
        window.FS.dom.resHeaderBox.querySelector('.status-badge').innerHTML = `<i data-lucide="award"></i> Success`;
        window.FS.dom.resTitle.innerText = 'Session Complete!';
        window.FS.dom.resMotivation.innerText = 'Excellent work! You entered the flow state and kept writing.';

        document.getElementById('results-preview-box').classList.remove('hidden');
        window.FS.dom.resultsPreviewText.innerHTML = window.FS.state.sessionText || "(Blank Session)";

        window.FS.dom.btnCopyResult.removeAttribute('disabled');
        window.FS.dom.btnExport.removeAttribute('disabled');
    } else {
        window.FS.dom.resHeaderBox.querySelector('.status-badge').className = 'status-badge failed';
        window.FS.dom.resHeaderBox.querySelector('.status-badge').innerHTML = `<i data-lucide="flame"></i> Text Lost`;
        window.FS.dom.resTitle.innerText = 'Session Failed...';
        window.FS.dom.resMotivation.innerText = 'Your hands stopped moving, and your words burned to ashes in Hardcore mode. Original draft restored.';

        document.getElementById('results-preview-box').classList.add('hidden');
        window.FS.dom.resultsPreviewText.innerText = '';

        window.FS.dom.btnCopyResult.setAttribute('disabled', 'true');
        window.FS.dom.btnExport.setAttribute('disabled', 'true');
    }
    if (window.lucide) window.lucide.createIcons();

    const durationMinVal = Math.floor(window.FS.state.timeElapsed / 60);
    const durationSecVal = window.FS.state.timeElapsed % 60;
    const durationStr = durationMinVal > 0 ? `${durationMinVal}m ${durationSecVal}s` : `${durationSecVal}s`;

    window.FS.dom.resStatWords.innerText = window.FS.state.wordsCount;
    window.FS.dom.resStatWpm.innerText = window.FS.state.averageWpm;
    window.FS.dom.resStatTime.innerText = durationStr;

    let goalProgressPercent = 100;
    if (isSuccess) {
        if (window.FS.state.sessionGoalType === 'time') {
            goalProgressPercent = window.FS.state.timeTarget > 0 ? Math.min(Math.round((window.FS.state.timeElapsed / window.FS.state.timeTarget) * 100), 100) : 100;
        } else if (window.FS.state.sessionGoalType === 'words') {
            goalProgressPercent = window.FS.state.wordsTarget > 0 ? Math.min(Math.round((window.FS.state.wordsCount / window.FS.state.wordsTarget) * 100), 100) : 100;
        }
    } else {
        goalProgressPercent = 0;
    }
    window.FS.dom.resStatGoal.innerText = `${goalProgressPercent}%`;

    window.FS.editor.renderVelocityGraph();
    window.FS.ui.switchView('results');
};

window.FS.editor.updateToolbarState = function() {
    window.FS.dom.toolbarBtns.forEach(btn => {
        const command = btn.getAttribute('data-command');
        const value = btn.getAttribute('data-value');
        if (command) {
            try {
                let isActive = false;
                if (command === 'formatBlock') {
                    const currentBlock = document.queryCommandValue(command);
                    isActive = currentBlock && currentBlock.toUpperCase() === value.toUpperCase();
                } else {
                    isActive = document.queryCommandState(command);
                }
                if (isActive) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            } catch (e) {
                // Ignore unsupported commands
            }
        }
    });
};

window.FS.editor.initColorMenus = function() {
    const textColorBtn = document.getElementById('btn-text-color');
    const textColorMenu = document.getElementById('text-color-menu');
    const highlightBtn = document.getElementById('btn-text-highlight');
    const highlightMenu = document.getElementById('highlight-menu');
    
    if (textColorBtn && textColorMenu) {
        textColorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            textColorMenu.classList.toggle('active');
            if (highlightMenu) highlightMenu.classList.remove('active');
        });
    }
    
    if (highlightBtn && highlightMenu) {
        highlightBtn.addEventListener('click', (e) => {
            e.preventDefault();
            highlightMenu.classList.toggle('active');
            if (textColorMenu) textColorMenu.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#text-color-dropdown-container') && textColorMenu) {
            textColorMenu.classList.remove('active');
        }
        if (!e.target.closest('#highlighter-dropdown-container') && highlightMenu) {
            highlightMenu.classList.remove('active');
        }
    });

    document.querySelectorAll('.color-cell').forEach(cell => {
        cell.addEventListener('mousedown', (e) => e.preventDefault());
        cell.addEventListener('click', (e) => {
            const color = cell.getAttribute('data-color');
            const isHighlight = cell.closest('#highlight-menu');
            
            if (isHighlight) {
                document.execCommand('hiliteColor', false, color);
                document.execCommand('backColor', false, color);
                const ind = document.getElementById('text-highlight-indicator');
                if (ind) ind.style.backgroundColor = color;
                if (highlightMenu) highlightMenu.classList.remove('active');
            } else {
                document.execCommand('foreColor', false, color);
                const ind = document.getElementById('text-color-indicator');
                if (ind) ind.style.backgroundColor = color;
                if (textColorMenu) textColorMenu.classList.remove('active');
            }
            window.FS.dom.editorTextarea.focus();
        });
    });

    const clearTextColorBtn = document.getElementById('btn-text-color-default');
    if (clearTextColorBtn) {
        clearTextColorBtn.addEventListener('mousedown', (e) => e.preventDefault());
        clearTextColorBtn.addEventListener('click', () => {
            document.execCommand('foreColor', false, '');
            document.execCommand('removeFormat', false, 'foreColor');
            const ind = document.getElementById('text-color-indicator');
            if (ind) ind.style.backgroundColor = 'transparent';
            if (textColorMenu) textColorMenu.classList.remove('active');
        });
    }

    const clearHighlightBtn = document.getElementById('btn-highlight-clear');
    if (clearHighlightBtn) {
        clearHighlightBtn.addEventListener('mousedown', (e) => e.preventDefault());
        clearHighlightBtn.addEventListener('click', () => {
            document.execCommand('hiliteColor', false, 'transparent');
            document.execCommand('backColor', false, 'transparent');
            const ind = document.getElementById('text-highlight-indicator');
            if (ind) ind.style.backgroundColor = 'transparent';
            if (highlightMenu) highlightMenu.classList.remove('active');
        });
    }

    const textColorPicker = document.getElementById('text-color-picker');
    if (textColorPicker) {
        textColorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            document.execCommand('foreColor', false, color);
            const ind = document.getElementById('text-color-indicator');
            if (ind) ind.style.backgroundColor = color;
        });
    }

    const highlightColorPicker = document.getElementById('highlight-color-picker');
    if (highlightColorPicker) {
        highlightColorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            document.execCommand('hiliteColor', false, color);
            document.execCommand('backColor', false, color);
            const ind = document.getElementById('text-highlight-indicator');
            if (ind) ind.style.backgroundColor = color;
        });
    }
};

window.FS.editor.initEditorEvents = function() {
    window.FS.editor.initColorMenus();

    window.FS.dom.toolbarBtns.forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents focus loss from the editor
        });
        btn.addEventListener('click', (e) => {
            const command = btn.getAttribute('data-command');
            let value = btn.getAttribute('data-value') || null;
            if (command) {
                if (command === 'formatBlock' && value) {
                    const currentBlock = document.queryCommandValue(command);
                    if (currentBlock && currentBlock.toUpperCase() === value.toUpperCase()) {
                        value = 'div'; // Revert back to standard div
                    }
                }
                document.execCommand(command, false, value);
                window.FS.editor.updateToolbarState();
            }
        });
    });

    const textFormatSelect = document.getElementById('text-format-select');
    if (textFormatSelect) {
        textFormatSelect.addEventListener('change', (e) => {
            document.execCommand('formatBlock', false, e.target.value);
            window.FS.dom.editorTextarea.focus();
        });
    }

    if (window.FS.dom.fontFamilySelect) {
        window.FS.dom.fontFamilySelect.addEventListener('change', (e) => {
            document.execCommand('fontName', false, e.target.value);
            window.FS.dom.editorTextarea.focus();
        });
    }

    if (window.FS.dom.fontSizeSelect) {
        window.FS.dom.fontSizeSelect.addEventListener('change', (e) => {
            document.execCommand('fontSize', false, e.target.value);
            window.FS.dom.editorTextarea.focus();
        });
    }

    window.FS.dom.editorTextarea.addEventListener('keyup', () => {
        window.FS.editor.updateToolbarState();
    });
    
    window.FS.dom.editorTextarea.addEventListener('mouseup', () => {
        window.FS.editor.updateToolbarState();
    });

    window.FS.dom.editorTextarea.addEventListener('input', () => {
        window.FS.editor.autoSaveActiveDocument();
        if (window.FS.editor.handleWordCountChange) {
            window.FS.editor.handleWordCountChange();
        }
    });

    window.FS.dom.editorTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '\t');
            
            if (window.flowAudio && !e.repeat) {
                window.flowAudio.playKeyClick(false);
            }
            
            if (window.FS.state.sessionActive) {
                window.FS.state.lastTypedTime = Date.now();
                window.FS.state.lastKeystrokeTime = Date.now();
                window.FS.editor.clearDangerAlerts();
            }
            return;
        }

        if (window.flowAudio && !e.repeat) {
            const isSpace = e.code === 'Space';
            if (e.code === 'Enter') {
                window.flowAudio.playBell();
            } else {
                window.flowAudio.playKeyClick(isSpace);
            }
        }

        if (!window.FS.state.sessionActive) return;
        
        window.FS.state.lastTypedTime = Date.now();
        window.FS.state.lastKeystrokeTime = Date.now();
        window.FS.editor.clearDangerAlerts();
    });
};

window.FS.editor.initSessionSettingsUI = function() {
    window.FS.dom.goalTypeToggle.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toggle-btn')) return;
        window.FS.dom.goalTypeToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const goalType = e.target.getAttribute('data-type');
        window.FS.state.sessionGoalType = goalType;
        window.FS.dom.optionTime.classList.add('hidden');
        window.FS.dom.optionWords.classList.add('hidden');
        if (goalType === 'time') {
            window.FS.dom.optionTime.classList.remove('hidden');
        } else if (goalType === 'words') {
            window.FS.dom.optionWords.classList.remove('hidden');
        }
    });

    window.FS.dom.timePresets.addEventListener('click', (e) => {
        if (!e.target.classList.contains('preset-btn')) return;
        window.FS.dom.timePresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const val = e.target.getAttribute('data-value');
        if (val === 'custom') {
            window.FS.dom.customTimeContainer.classList.remove('hidden');
        } else {
            window.FS.dom.customTimeContainer.classList.add('hidden');
        }
    });

    window.FS.dom.wordsPresets.addEventListener('click', (e) => {
        if (!e.target.classList.contains('preset-btn')) return;
        window.FS.dom.wordsPresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const val = e.target.getAttribute('data-value');
        if (val === 'custom') {
            window.FS.dom.customWordsContainer.classList.remove('hidden');
        } else {
            window.FS.dom.customWordsContainer.classList.add('hidden');
        }
    });

    window.FS.dom.modeCards.forEach(card => {
        card.addEventListener('click', () => {
            window.FS.dom.modeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            window.FS.state.sessionMode = card.getAttribute('data-mode');
        });
    });

    window.FS.dom.btnStartSession.addEventListener('click', window.FS.editor.startSession);
    window.FS.dom.btnCompleteSession.addEventListener('click', () => window.FS.editor.completeSession(true));
    window.FS.dom.btnAbandonSession.addEventListener('click', () => {
        if (confirm("Are you sure you want to give up? Your writing for this session will not be saved.")) {
            window.FS.editor.completeSession(false);
        }
    });

    if (window.FS.dom.btnHome) {
        window.FS.dom.btnHome.addEventListener('click', () => {
            window.FS.ui.switchView('main');
            document.getElementById('session-settings-section').style.display = 'block';
            document.getElementById('btn-start-session').style.display = 'flex';
        });
    }
};
