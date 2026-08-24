window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize DOM elements
    window.FS.initDOM();

    // 2. Initial Startup & Bootstrap
    window.FS.storage.initFilesystem();
    window.FS.settings.loadAppSettings();
    window.FS.settings.initAudioEngine();
    if (window.FS.settings.updateEditorSoundButtons) {
        window.FS.settings.updateEditorSoundButtons();
    }
    
    // Always start on the home page for folder selection
    window.FS.ui.switchView('home');
    
    // Render existing workspaces
    window.FS.workspaces.renderWorkspacesList();

    // Initialize Component event listeners and UI controls
    if (window.FS.settings.initSettingsUI) {
        window.FS.settings.initSettingsUI();
    }
    if (window.FS.ui.initUIEvents) {
        window.FS.ui.initUIEvents();
    }
    if (window.FS.sidebar.initSidebarEvents) {
        window.FS.sidebar.initSidebarEvents();
    }
    if (window.FS.editor.initEditorEvents) {
        window.FS.editor.initEditorEvents();
    }
    if (window.FS.editor.initSessionSettingsUI) {
        window.FS.editor.initSessionSettingsUI();
    }
    if (window.FS.initMenuHandler) {
        window.FS.initMenuHandler();
    }

    if (window.FS.dom.btnCreateWorkspace) {
        window.FS.dom.btnCreateWorkspace.addEventListener('click', () => {
            window.FS.workspaces.createWorkspace();
        });
    }

    const btnImportWorkspace = document.getElementById('btn-import-workspace');
    const fileImportWorkspace = document.getElementById('file-import-workspace');
    if (btnImportWorkspace && fileImportWorkspace) {
        btnImportWorkspace.addEventListener('click', () => {
            fileImportWorkspace.click();
        });
        
        fileImportWorkspace.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                window.FS.workspaces.importBook(e.target.files[0]);
                e.target.value = ''; // Reset input
            }
        });
    }

    if (window.lucide) window.lucide.createIcons();
});
