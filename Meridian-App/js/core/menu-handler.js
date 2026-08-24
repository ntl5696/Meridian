window.FS = window.FS || {};

window.FS.initMenuHandler = function() {
    if (window.electronAPI) {
        window.electronAPI.onMenuAction((action) => {
            switch(action) {
                case 'new-project':
                    window.FS.workspaces.createWorkspace();
                    break;
                case 'open-project':
                    const fileImportWorkspace = document.getElementById('file-import-workspace');
                    if (fileImportWorkspace) fileImportWorkspace.click();
                    break;
                case 'close-project':
                    if (window.FS.state.sessionActive) {
                        if(confirm("You have an active writing session. End the session and go to the home screen?")) {
                            window.FS.editor.completeSession(true);
                        } else {
                            break;
                        }
                    } else {
                        window.FS.editor.autoSaveActiveDocument();
                    }
                    window.FS.workspaces.renderWorkspacesList();
                    window.FS.ui.switchView('home');
                    break;
                case 'save-backup':
                case 'save-as':
                    window.FS.workspaces.backupBook();
                    break;
                case 'compile-manuscript':
                    if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                        window.FS.compileUI.openCompileModal();
                    }
                    break;
                case 'export-markdown':
                case 'export-manuscript-md':
                    if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                        window.FS.compileUI.openCompileModal('md');
                    }
                    break;
                case 'export-manuscript-txt':
                    if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                        window.FS.compileUI.openCompileModal('txt');
                    }
                    break;
                case 'export-manuscript-html':
                    if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                        window.FS.compileUI.openCompileModal('html');
                    }
                    break;
                case 'export-manuscript-rtf':
                    if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                        window.FS.compileUI.openCompileModal('rtf');
                    }
                    break;
                case 'export-manuscript-docx':
                    if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                        window.FS.compileUI.openCompileModal('docx');
                    }
                    break;
                case 'export-manuscript-epub':
                    if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                        window.FS.compileUI.openCompileModal('epub');
                    }
                    break;
                case 'export-manuscript-pdf':
                    if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
                        window.FS.compileUI.openCompileModal('pdf');
                    }
                    break;
                case 'download-document-md':
                    window.FS.editor.downloadCurrentDocument('md');
                    break;
                case 'download-document-txt':
                    window.FS.editor.downloadCurrentDocument('txt');
                    break;
                case 'download-document-html':
                    window.FS.editor.downloadCurrentDocument('html');
                    break;
                case 'download-document-rtf':
                    window.FS.editor.downloadCurrentDocument('rtf');
                    break;
                case 'download-document-docx':
                    window.FS.editor.downloadCurrentDocument('doc');
                    break;
                case 'download-document-epub':
                    window.FS.editor.downloadCurrentDocument('epub');
                    break;
                case 'download-document-pdf':
                    window.FS.editor.downloadCurrentDocument('pdf');
                    break;
                case 'new-file':
                    const btnNewFile = document.getElementById('btn-new-file');
                    if (btnNewFile) btnNewFile.click();
                    break;
                case 'new-folder':
                    const btnNewFolder = document.getElementById('btn-new-folder');
                    if (btnNewFolder) btnNewFolder.click();
                    break;
                case 'rename-active-file':
                    if (window.FS.state.activeDocId) {
                        window.FS.sidebar.triggerRenameItem(window.FS.state.activeDocId, false);
                    } else {
                        alert("Please open a document first to rename it.");
                    }
                    break;
                case 'delete-active-file':
                    if (window.FS.state.activeDocId) {
                        window.FS.sidebar.deleteDocument(window.FS.state.activeDocId);
                    } else {
                        alert("Please open a document first to delete it.");
                    }
                    break;
                case 'show-document-stats':
                    if (window.FS.editor.showDocumentStatistics) {
                        window.FS.editor.showDocumentStatistics();
                    }
                    break;
                case 'find-and-replace':
                    const searchInput = document.getElementById('sidebar-search-input');
                    if (searchInput) {
                        if (document.body.classList.contains('sidebar-collapsed')) {
                            const btnSidebarExpand = document.getElementById('btn-sidebar-expand');
                            if (btnSidebarExpand) btnSidebarExpand.click();
                        }
                        searchInput.focus();
                        searchInput.select();
                    }
                    break;
                case 'clear-document-text':
                    if (window.FS.dom.editorTextarea) {
                        if (confirm("Are you sure you want to clear the entire content of the current document? This cannot be undone.")) {
                            window.FS.dom.editorTextarea.innerHTML = '';
                            if (window.FS.editor && window.FS.editor.autoSaveActiveDocument) {
                                window.FS.editor.autoSaveActiveDocument();
                            }
                        }
                    }
                    break;
                case 'insert-datetime':
                    if (window.FS.dom.editorTextarea) {
                        const now = new Date();
                        const options = { dateStyle: 'long', timeStyle: 'short' };
                        const dateTimeString = now.toLocaleString(undefined, options);
                        
                        const sel = window.getSelection();
                        if (sel.rangeCount) {
                            const range = sel.getRangeAt(0);
                            range.deleteContents();
                            const node = document.createTextNode(dateTimeString);
                            range.insertNode(node);
                            range.collapse(false);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        } else {
                            window.FS.dom.editorTextarea.innerHTML += dateTimeString;
                        }
                        if (window.FS.editor && window.FS.editor.autoSaveActiveDocument) {
                            window.FS.editor.autoSaveActiveDocument();
                        }
                    }
                    break;
                case 'toggle-left-sidebar':
                    const btnToggleLeft = document.getElementById('btn-sidebar-collapse') || document.getElementById('btn-sidebar-expand');
                    if (btnToggleLeft) btnToggleLeft.click();
                    break;
                case 'toggle-right-sidebar':
                    const btnToggleRight = document.getElementById('btn-toggle-setup') || document.getElementById('btn-setup-collapse');
                    if (btnToggleRight) btnToggleRight.click();
                    break;
                case 'toggle-calendar-stats':
                    const btnCalendar = document.getElementById('btn-calendar-stats');
                    if (btnCalendar) btnCalendar.click();
                    break;

            }
        });
    }
};
