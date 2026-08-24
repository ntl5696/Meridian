window.FS.storage = {
    initFilesystem: function () {
        // The default workspace handling happens in workspaces.js.

        // Restore collapse preference
        const isCollapsedPref = localStorage.getItem('flowstate_sidebar_collapsed');
        if (isCollapsedPref === 'true' && window.FS.ui && window.FS.ui.toggleSidebar) {
            window.FS.ui.toggleSidebar(true);
        }
    },

    getDocumentsFromStorage: function () {
        if (!window.FS.state.activeWorkspaceId) return [];
        const raw = localStorage.getItem(`flowstate_documents_${window.FS.state.activeWorkspaceId}`);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    },

    getFoldersFromStorage: function () {
        if (!window.FS.state.activeWorkspaceId) return [];
        const raw = localStorage.getItem(`flowstate_folders_${window.FS.state.activeWorkspaceId}`);
        if (!raw) return [];
        try {
            const folders = JSON.parse(raw);
            let updated = false;
            const migrated = folders.map(f => {
                if (f.id === 'folder_welcome' && f.name === 'Drafts') {
                    f.name = 'Manuscript';
                    updated = true;
                }
                return f;
            });
            if (updated) {
                localStorage.setItem(`flowstate_folders_${window.FS.state.activeWorkspaceId}`, JSON.stringify(migrated));
            }
            return migrated;
        } catch (e) {
            return [];
        }
    },

    saveDocuments: function (docs) {
        if (!window.FS.state.activeWorkspaceId) return;
        localStorage.setItem(`flowstate_documents_${window.FS.state.activeWorkspaceId}`, JSON.stringify(docs));
    },

    saveFolders: function (folders) {
        if (!window.FS.state.activeWorkspaceId) return;
        localStorage.setItem(`flowstate_folders_${window.FS.state.activeWorkspaceId}`, JSON.stringify(folders));
    }
};
