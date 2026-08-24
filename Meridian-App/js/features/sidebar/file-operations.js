window.FS.sidebar = window.FS.sidebar || {};

window.FS.sidebar.toggleFolderOpen = function(folderId) {
    let folders = window.FS.storage.getFoldersFromStorage();
    let f = folders.find(folder => folder.id === folderId);
    if (f) {
        f.isOpen = !f.isOpen;
        window.FS.storage.saveFolders(folders);
        window.FS.sidebar.renderSidebarTree();
    }
};

window.FS.sidebar.moveFileToFolder = function(fileId, folderId) {
    let docs = window.FS.storage.getDocumentsFromStorage();
    let doc = docs.find(d => d.id === fileId);
    if (doc) {
        doc.folderId = folderId;
        doc.modifiedAt = Date.now();
        window.FS.storage.saveDocuments(docs);
        
        if (window.FS.state.activeDocId === fileId) {
            window.FS.ui.updateActiveDocumentHeader();
        }
        window.FS.sidebar.renderSidebarTree();
    }
};

window.FS.sidebar.createNewDocument = function(folderId = null) {
    let docs = window.FS.storage.getDocumentsFromStorage();
    
    const newDoc = {
        id: 'doc_' + Date.now(),
        folderId: folderId,
        title: 'Untitled Draft',
        content: '',
        words: 0,
        modifiedAt: Date.now()
    };

    docs.push(newDoc);
    window.FS.storage.saveDocuments(docs);
    
    window.FS.sidebar.renderSidebarTree();
    window.FS.sidebar.selectDocument(newDoc.id);
    
    setTimeout(() => {
        window.FS.sidebar.triggerRenameItem(newDoc.id, false);
    }, 100);
};

window.FS.sidebar.createNewFolder = function() {
    let folders = window.FS.storage.getFoldersFromStorage();
    
    const newFolder = {
        id: 'folder_' + Date.now(),
        name: 'Untitled Folder',
        isOpen: true
    };

    folders.push(newFolder);
    window.FS.storage.saveFolders(folders);
    
    window.FS.sidebar.renderSidebarTree();
    
    setTimeout(() => {
        window.FS.sidebar.triggerRenameItem(newFolder.id, true);
    }, 100);
};

window.FS.sidebar.triggerRenameItem = function(itemId, isFolder) {
    const selector = isFolder ? `.tree-folder[data-id="${itemId}"]` : `.tree-file[data-id="${itemId}"]`;
    const itemEl = document.querySelector(selector);
    if (!itemEl) return;
    
    const titleEl = itemEl.querySelector('.tree-item-title');
    const originalName = titleEl.innerText;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rename-input';
    input.value = originalName;
    
    titleEl.replaceWith(input);
    input.focus();
    input.select();
    
    let resolved = false;
    
    const saveRename = () => {
        if (resolved) return;
        resolved = true;
        const newName = input.value.trim() || originalName;
        
        if (isFolder) {
            let folders = window.FS.storage.getFoldersFromStorage();
            let f = folders.find(folder => folder.id === itemId);
            if (f) {
                f.name = newName;
                window.FS.storage.saveFolders(folders);
            }
        } else {
            let docs = window.FS.storage.getDocumentsFromStorage();
            let d = docs.find(doc => doc.id === itemId);
            if (d) {
                d.title = newName;
                window.FS.storage.saveDocuments(docs);
                
                if (window.FS.state.activeDocId === itemId) {
                    window.FS.ui.updateActiveDocumentHeader();
                }
            }
        }
        window.FS.sidebar.renderSidebarTree();
    };
    
    const cancelRename = () => {
        if (resolved) return;
        resolved = true;
        input.replaceWith(titleEl);
    };
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveRename();
        } else if (e.key === 'Escape') {
            cancelRename();
        }
    });
    
    input.addEventListener('blur', () => {
        saveRename();
    });
};

window.FS.sidebar.deleteFolder = function(folderId) {
    let folders = window.FS.storage.getFoldersFromStorage();
    let target = folders.find(f => f.id === folderId);
    if (!target) return;
    
    if (!confirm(`Are you sure you want to delete folder "${target.name}" and all files nested inside?`)) return;

    folders = folders.filter(f => f.id !== folderId);
    window.FS.storage.saveFolders(folders);
    
    let docs = window.FS.storage.getDocumentsFromStorage();
    let children = docs.filter(d => d.folderId === folderId);
    docs = docs.filter(d => d.folderId !== folderId);
    window.FS.storage.saveDocuments(docs);

    if (children.some(c => c.id === window.FS.state.activeDocId)) {
        window.FS.sidebar.clearActiveDocument();
    }
    
    window.FS.sidebar.renderSidebarTree();
};

window.FS.sidebar.deleteDocument = function(docId) {
    let docs = window.FS.storage.getDocumentsFromStorage();
    let target = docs.find(d => d.id === docId);
    if (!target) return;
    
    if (!confirm(`Are you sure you want to delete draft "${target.title}"?`)) return;

    docs = docs.filter(d => d.id !== docId);
    window.FS.storage.saveDocuments(docs);

    if (window.FS.state.activeDocId === docId) {
        window.FS.sidebar.clearActiveDocument();
    }
    
    window.FS.sidebar.renderSidebarTree();
};

window.FS.sidebar.clearActiveDocument = function() {
    window.FS.state.activeDocId = null;
    localStorage.removeItem('flowstate_active_doc_id');
    
    window.FS.dom.headerDocTitle.innerText = "Select or create a file";
    window.FS.dom.editorTextarea.innerHTML = '';
    window.FS.dom.editorTextarea.removeAttribute('contenteditable');
    window.FS.dom.inputSessionTitle.value = '';
    
    window.FS.ui.switchView('main');
    document.getElementById('session-settings-section').style.display = 'block';
    document.getElementById('btn-start-session').style.display = 'flex';
};
