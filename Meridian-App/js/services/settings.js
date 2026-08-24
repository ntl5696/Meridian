window.FS.settings = {
    initAudioEngine: function() {
        if (window.flowAudio) {
            window.flowAudio.init();
            
            // Sync values
            window.flowAudio.isTypewriterEnabled = window.FS.dom.chkTypewriter.checked;
            window.flowAudio.isAmbientEnabled = window.FS.dom.chkAmbient.checked;
            window.flowAudio.ambientProfile = window.FS.dom.selectAmbientType.value;
            window.flowAudio.typewriterProfile = window.FS.dom.selectTypewriterProfile.value;
            window.flowAudio.setTypewriterVolume(parseInt(window.FS.dom.rangeVolTypewriter.value));
            window.flowAudio.setAmbientVolume(parseInt(window.FS.dom.rangeVolAmbient.value));
            window.flowAudio.isBellEnabled = window.FS.dom.chkTypewriterBell.checked;
        }
    },

    saveAppSettings: function() {
        const config = {
            typewriterVolume: window.FS.dom.rangeVolTypewriter.value,
            ambientVolume: window.FS.dom.rangeVolAmbient.value,
            typewriterProfile: window.FS.dom.selectTypewriterProfile.value,
            playBell: window.FS.dom.chkTypewriterBell.checked,
            autoSave: window.FS.dom.chkAutoSave.checked,
            darkMode: window.FS.dom.chkDarkMode.checked,
            showDailyGoalWidget: window.FS.dom.chkShowDailyGoal.checked,
            dailyGoal: parseInt(window.FS.dom.inputDailyGoal.value) || 500,
            dailyGoalCollapsed: window.FS.state && window.FS.state.dailyGoalCollapsed ? true : false
        };

        localStorage.setItem('flowstate_config', JSON.stringify(config));
    },

    loadAppSettings: function() {
        const raw = localStorage.getItem('flowstate_config');
        if (raw) {
            try {
                const config = JSON.parse(raw);
                
                window.FS.dom.rangeVolTypewriter.value = config.typewriterVolume || 75;
                window.FS.dom.valVolTypewriter.innerText = `${window.FS.dom.rangeVolTypewriter.value}%`;
                
                window.FS.dom.rangeVolAmbient.value = config.ambientVolume || 40;
                window.FS.dom.valVolAmbient.innerText = `${window.FS.dom.rangeVolAmbient.value}%`;
                
                window.FS.dom.selectTypewriterProfile.value = config.typewriterProfile || 'mechanical';
                window.FS.dom.chkTypewriterBell.checked = config.playBell !== undefined ? config.playBell : true;
                window.FS.dom.chkAutoSave.checked = config.autoSave !== undefined ? config.autoSave : true;
                
                window.FS.dom.chkShowDailyGoal.checked = config.showDailyGoalWidget !== undefined ? config.showDailyGoalWidget : true;
                window.FS.dom.inputDailyGoal.value = config.dailyGoal !== undefined ? config.dailyGoal : 500;
                
                if (window.FS.state) {
                    window.FS.state.dailyGoalCollapsed = config.dailyGoalCollapsed || false;
                }
                
                const isDarkMode = config.darkMode !== undefined ? config.darkMode : true;
                window.FS.dom.chkDarkMode.checked = isDarkMode;
                window.FS.ui.applyTheme(isDarkMode ? 'dark' : 'light');
                
                if (window.FS.editor && window.FS.editor.updateDailyGoalWidget) {
                    window.FS.editor.updateDailyGoalWidget();
                }
            } catch(e) {
                console.error("Could not parse config cache: ", e);
            }
        } else {
            window.FS.dom.chkDarkMode.checked = true;
            window.FS.ui.applyTheme('dark');
        }
    },

    updateEditorSoundButtons: function() {
        if (window.FS.dom.chkTypewriter.checked) {
            window.FS.dom.btnEditorSoundToggle.classList.add('active');
        } else {
            window.FS.dom.btnEditorSoundToggle.classList.remove('active');
        }
        
        if (window.FS.dom.chkAmbient.checked) {
            window.FS.dom.btnEditorAmbientToggle.classList.add('active');
        } else {
            window.FS.dom.btnEditorAmbientToggle.classList.remove('active');
        }
    },

    initSettingsUI: function() {
        window.FS.dom.chkTypewriter.addEventListener('change', (e) => {
            window.FS.settings.initAudioEngine();
            window.flowAudio.isTypewriterEnabled = e.target.checked;
            
            if (e.target.checked) {
                window.FS.dom.typewriterNoiseSettings.classList.remove('hidden');
            } else {
                window.FS.dom.typewriterNoiseSettings.classList.add('hidden');
            }
            
            window.FS.settings.updateEditorSoundButtons();
        });

        window.FS.dom.chkAmbient.addEventListener('change', (e) => {
            window.FS.settings.initAudioEngine();
            window.flowAudio.isAmbientEnabled = e.target.checked;
            
            if (e.target.checked) {
                window.FS.dom.ambientNoiseSettings.classList.remove('hidden');
                window.flowAudio.startAmbient();
            } else {
                window.FS.dom.ambientNoiseSettings.classList.add('hidden');
                window.flowAudio.stopAmbient();
            }
            window.FS.settings.updateEditorSoundButtons();
        });

        if (window.FS.dom.btnEditorSoundToggle) {
            window.FS.dom.btnEditorSoundToggle.addEventListener('click', () => {
                window.FS.dom.chkTypewriter.checked = !window.FS.dom.chkTypewriter.checked;
                window.FS.dom.chkTypewriter.dispatchEvent(new Event('change'));
            });
        }

        if (window.FS.dom.btnEditorAmbientToggle) {
            window.FS.dom.btnEditorAmbientToggle.addEventListener('click', () => {
                window.FS.dom.chkAmbient.checked = !window.FS.dom.chkAmbient.checked;
                window.FS.dom.chkAmbient.dispatchEvent(new Event('change'));
            });
        }

        window.FS.dom.selectAmbientType.addEventListener('change', (e) => {
            if (window.flowAudio) {
                window.flowAudio.ambientProfile = e.target.value;
                if (window.FS.dom.chkAmbient.checked) {
                    window.flowAudio.startAmbient();
                }
            }
        });

        if (window.FS.dom.selectTypewriterProfile) {
            window.FS.dom.selectTypewriterProfile.addEventListener('change', (e) => {
                if (window.flowAudio) {
                    window.flowAudio.typewriterProfile = e.target.value;
                }
            });
        }

        window.FS.dom.rangeVolTypewriter.addEventListener('input', (e) => {
            window.FS.dom.valVolTypewriter.innerText = `${e.target.value}%`;
            if (window.flowAudio) window.flowAudio.setTypewriterVolume(parseInt(e.target.value));
        });

        window.FS.dom.rangeVolAmbient.addEventListener('input', (e) => {
            window.FS.dom.valVolAmbient.innerText = `${e.target.value}%`;
            if (window.flowAudio) window.flowAudio.setAmbientVolume(parseInt(e.target.value));
        });

        if (window.FS.dom.chkDarkMode) {
            window.FS.dom.chkDarkMode.addEventListener('change', (e) => {
                const themeName = e.target.checked ? 'dark' : 'light';
                window.FS.ui.applyTheme(themeName);
                window.FS.settings.saveAppSettings();
            });
        }
        
        // Daily goal events
        if (window.FS.dom.chkShowDailyGoal) {
            window.FS.dom.chkShowDailyGoal.addEventListener('change', (e) => {
                if (window.FS.editor && window.FS.editor.updateDailyGoalWidget) {
                    window.FS.editor.updateDailyGoalWidget();
                }
                window.FS.settings.saveAppSettings();
            });
        }
        
        if (window.FS.dom.inputDailyGoal) {
            window.FS.dom.inputDailyGoal.addEventListener('input', (e) => {
                if (window.FS.editor && window.FS.editor.updateDailyGoalWidget) {
                    window.FS.editor.updateDailyGoalWidget();
                }
            });
            window.FS.dom.inputDailyGoal.addEventListener('change', (e) => {
                window.FS.settings.saveAppSettings();
            });
        }
        
        if (window.FS.dom.btnHideDailyGoal) {
            window.FS.dom.btnHideDailyGoal.addEventListener('click', () => {
                if (!window.FS.state) window.FS.state = {};
                window.FS.state.dailyGoalCollapsed = true;
                if (window.FS.editor && window.FS.editor.updateDailyGoalWidget) {
                    window.FS.editor.updateDailyGoalWidget();
                }
                window.FS.settings.saveAppSettings();
            });
        }
        
        if (window.FS.dom.btnShowDailyGoalTab) {
            window.FS.dom.btnShowDailyGoalTab.addEventListener('click', () => {
                if (!window.FS.state) window.FS.state = {};
                window.FS.state.dailyGoalCollapsed = false;
                if (window.FS.editor && window.FS.editor.updateDailyGoalWidget) {
                    window.FS.editor.updateDailyGoalWidget();
                }
                window.FS.settings.saveAppSettings();
            });
        }
    }
};
