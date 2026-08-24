window.FS.ui = {
    switchView: function(viewName) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            v.style.display = 'none';
        });

        window.FS.state.currentView = viewName;
        const targetView = window.FS.dom.views[viewName];
        
        targetView.style.display = 'block';
        setTimeout(() => {
            targetView.classList.add('active');
        }, 50);

        const appHeader = document.querySelector('.app-header');
        if (viewName === 'home') {
            window.FS.dom.sidebarElement.style.display = 'none';
            window.FS.dom.btnSidebarExpand.style.display = 'none';
            if (window.FS.dom.headerDocPath) window.FS.dom.headerDocPath.style.display = 'none';
            if (window.FS.dom.btnExportBook) window.FS.dom.btnExportBook.style.display = 'none';
            if (window.FS.dom.btnToggleSetup) window.FS.dom.btnToggleSetup.style.display = 'none';
            appHeader.style.borderBottomColor = '';
            document.body.classList.remove('body-focus-active');
        } else if (viewName === 'main') {
            window.FS.dom.sidebarElement.style.display = '';
            window.FS.dom.btnSidebarExpand.style.display = '';
            if (window.FS.dom.headerDocPath) window.FS.dom.headerDocPath.style.display = '';
            if (window.FS.dom.btnExportBook) window.FS.dom.btnExportBook.style.display = '';
            if (window.FS.dom.btnToggleSetup) window.FS.dom.btnToggleSetup.style.display = '';
        } else {
            window.FS.dom.sidebarElement.style.display = '';
            window.FS.dom.btnSidebarExpand.style.display = '';
            if (window.FS.dom.headerDocPath) window.FS.dom.headerDocPath.style.display = '';
            if (window.FS.dom.btnExportBook) window.FS.dom.btnExportBook.style.display = '';
            if (window.FS.dom.btnToggleSetup) window.FS.dom.btnToggleSetup.style.display = '';
            appHeader.style.borderBottomColor = '';
            document.body.classList.remove('body-focus-active');
        }
    },

    openModal: function(modalName) {
        if (window.FS.settings && window.FS.settings.initAudioEngine) {
            window.FS.settings.initAudioEngine();
        }
        window.FS.dom.modals[modalName].style.display = 'flex';
        setTimeout(() => {
            window.FS.dom.modals[modalName].classList.add('active');
        }, 50);
    },

    closeModal: function(modalName) {
        window.FS.dom.modals[modalName].classList.remove('active');
        setTimeout(() => {
            window.FS.dom.modals[modalName].style.display = 'none';
        }, 300);
    },

    applyTheme: function(themeName) {
        document.body.className = '';
        document.body.classList.add(`theme-${themeName}`);
        window.FS.state.currentTheme = themeName;
        localStorage.setItem('flowstate_theme', themeName);
    },

    toggleSidebar: function(shouldCollapse) {
        window.FS.state.sidebarCollapsed = shouldCollapse;
        if (shouldCollapse) {
            window.FS.dom.sidebarElement.classList.add('collapsed');
            window.FS.dom.btnSidebarExpand.classList.remove('hidden');
            document.body.classList.add('sidebar-collapsed');
        } else {
            window.FS.dom.sidebarElement.classList.remove('collapsed');
            window.FS.dom.btnSidebarExpand.classList.add('hidden');
            document.body.classList.remove('sidebar-collapsed');
        }
        localStorage.setItem('flowstate_sidebar_collapsed', shouldCollapse ? 'true' : 'false');
    },

    toggleSetupSidebar: function(shouldHide) {
        window.FS.state.setupSidebarHidden = shouldHide;
        if (shouldHide) {
            document.body.classList.add('setup-sidebar-hidden');
        } else {
            document.body.classList.remove('setup-sidebar-hidden');
        }
        localStorage.setItem('flowstate_setup_hidden', shouldHide ? 'true' : 'false');
    },

    updateActiveDocumentHeader: function() {
        const docs = window.FS.storage.getDocumentsFromStorage();
        const doc = docs.find(d => d.id === window.FS.state.activeDocId);
        if (!doc) return;

        let bookName = "Book";
        if (window.FS.state.activeWorkspaceId && window.FS.workspaces) {
            const workspaces = window.FS.workspaces.getWorkspaces();
            const ws = workspaces.find(w => w.id === window.FS.state.activeWorkspaceId);
            if (ws) bookName = ws.name;
        }

        let pathPrefix = `${bookName} / `;

        if (doc.folderId) {
            const folders = window.FS.storage.getFoldersFromStorage();
            const folder = folders.find(f => f.id === doc.folderId);
            const folderName = folder ? folder.name : 'Unknown Folder';
            window.FS.dom.headerDocTitle.innerText = `${pathPrefix}${folderName} / ${doc.title}`;
        } else {
            window.FS.dom.headerDocTitle.innerText = `${pathPrefix}${doc.title}`;
        }
    },

    initUIEvents: function() {
        if (window.FS.dom.btnToggleSetup) {
            window.FS.dom.btnToggleSetup.addEventListener('click', () => {
                window.FS.ui.toggleSetupSidebar(!window.FS.state.setupSidebarHidden);
            });
            
            if (window.FS.state.setupSidebarHidden) {
                window.FS.ui.toggleSetupSidebar(true);
            }
        }

        if (window.FS.dom.btnSetupCollapse) {
            window.FS.dom.btnSetupCollapse.addEventListener('click', () => {
                window.FS.ui.toggleSetupSidebar(true);
            });
        }

        if (window.FS.dom.btnShowSetupTab) {
            window.FS.dom.btnShowSetupTab.addEventListener('click', () => {
                window.FS.ui.toggleSetupSidebar(false);
            });
        }

        if (window.FS.dom.appLogo) {
            window.FS.dom.appLogo.addEventListener('click', () => {
                if (window.FS.state.sessionActive) {
                    if (confirm("You have an active writing session. End the session and go to the home screen?")) {
                        window.FS.editor.completeSession(true);
                    } else {
                        return;
                    }
                } else {
                    window.FS.editor.autoSaveActiveDocument();
                }
                
                window.FS.workspaces.renderWorkspacesList();
                window.FS.ui.switchView('home');
            });
        }

        // Compile Modal Setup
        if (window.FS.dom.btnExportBook) {
            window.FS.dom.btnExportBook.addEventListener('click', () => {
                if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                    window.FS.compileUI.openCompileModal();
                }
            });
        }
        if (window.FS.compileUI && window.FS.compileUI.init) {
            window.FS.compileUI.init();
        }

        window.FS.dom.btnSettings.addEventListener('click', () => window.FS.ui.openModal('settings'));
        window.FS.dom.btnCloseSettings.addEventListener('click', () => window.FS.ui.closeModal('settings'));
        window.FS.dom.btnSaveSettings.addEventListener('click', () => {
            window.FS.settings.saveAppSettings();
            window.FS.ui.closeModal('settings');
        });

        // Calendar Modal Events
        window.FS.dom.btnCalendarStats.addEventListener('click', () => {
            window.FS.editor.currentCalendarDate = new Date();
            window.FS.editor.initCalendar();
            window.FS.ui.openModal('calendar');
        });
        window.FS.dom.btnCloseCalendar.addEventListener('click', () => window.FS.ui.closeModal('calendar'));
        
        window.FS.dom.btnPrevMonth.addEventListener('click', () => {
            const d = window.FS.editor.currentCalendarDate;
            d.setDate(1);
            d.setMonth(d.getMonth() - 1);
            window.FS.editor.initCalendar();
        });
        window.FS.dom.btnNextMonth.addEventListener('click', () => {
            const d = window.FS.editor.currentCalendarDate;
            d.setDate(1);
            d.setMonth(d.getMonth() + 1);
            window.FS.editor.initCalendar();
        });

        window.addEventListener('click', (e) => {
            Object.keys(window.FS.dom.modals).forEach(key => {
                if (e.target === window.FS.dom.modals[key]) {
                    window.FS.ui.closeModal(key);
                }
            });
        });

    }
};
