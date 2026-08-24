window.FS.sidebar = window.FS.sidebar || {};

window.FS.sidebar.renderSidebarTree = function() {
    window.FS.dom.sidebarTree.innerHTML = '';
    const folders = window.FS.storage.getFoldersFromStorage();
    const docs = window.FS.storage.getDocumentsFromStorage();
    
    let filteredDocsCount = 0;

    // Render directories
    folders.forEach(folder => {
        let nestedFiles = docs.filter(d => d.folderId === folder.id);
        
        let matchesSearch = folder.name.toLowerCase().includes(window.FS.state.searchQuery) ||
                            nestedFiles.some(f => f.title.toLowerCase().includes(window.FS.state.searchQuery));
                            
        if (window.FS.state.searchQuery && !matchesSearch) return;

        const folderWrapper = document.createElement('div');
        folderWrapper.className = 'folder-group';
        folderWrapper.setAttribute('data-folder-id', folder.id);

        const folderRow = document.createElement('div');
        folderRow.className = 'tree-item tree-folder';
        folderRow.setAttribute('data-id', folder.id);
        folderRow.innerHTML = `
            <span class="tree-item-icon folder-arrow ${folder.isOpen ? 'expanded' : ''}"><i data-lucide="chevron-right"></i></span>
            <span class="tree-item-icon"><i data-lucide="${folder.isOpen ? 'folder-open' : 'folder'}"></i></span>
            <span class="tree-item-title">${window.FS.utils.escapeHtml(folder.name)}</span>
            <div class="tree-item-actions">
                <button class="tree-action-btn btn-add-file" title="New draft inside"><i data-lucide="file-plus"></i></button>
                <button class="tree-action-btn btn-rename" title="Rename folder"><i data-lucide="edit"></i></button>
                <button class="tree-action-btn btn-delete" title="Delete folder" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
            </div>
        `;

        folderRow.addEventListener('click', (e) => {
            if (e.target.closest('.tree-item-actions')) return;
            window.FS.sidebar.toggleFolderOpen(folder.id);
        });

        folderRow.querySelector('.btn-add-file').addEventListener('click', (e) => {
            e.stopPropagation();
            window.FS.sidebar.createNewDocument(folder.id);
        });

        folderRow.querySelector('.btn-rename').addEventListener('click', (e) => {
            e.stopPropagation();
            window.FS.sidebar.triggerRenameItem(folder.id, true);
        });

        folderRow.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            window.FS.sidebar.deleteFolder(folder.id);
        });

        folderRow.addEventListener('dragover', (e) => {
            e.preventDefault();
            folderRow.style.background = 'var(--primary-glow)';
        });

        folderRow.addEventListener('dragleave', () => {
            folderRow.style.background = '';
        });

        folderRow.addEventListener('drop', (e) => {
            e.preventDefault();
            folderRow.style.background = '';
            const fileId = e.dataTransfer.getData('text/plain');
            window.FS.sidebar.moveFileToFolder(fileId, folder.id);
        });

        folderWrapper.appendChild(folderRow);

        const subTree = document.createElement('div');
        subTree.className = `folder-sub-tree ${folder.isOpen ? 'expanded' : ''}`;
        
        nestedFiles.forEach(file => {
            if (window.FS.state.searchQuery && !file.title.toLowerCase().includes(window.FS.state.searchQuery)) return;
            
            filteredDocsCount++;
            const fileRow = window.FS.sidebar.createFileTreeRow(file);
            subTree.appendChild(fileRow);
        });

        folderWrapper.appendChild(subTree);
        window.FS.dom.sidebarTree.appendChild(folderWrapper);
    });

    const rootFiles = docs.filter(d => d.folderId === null);
    rootFiles.forEach(file => {
        if (window.FS.state.searchQuery && !file.title.toLowerCase().includes(window.FS.state.searchQuery)) return;
        
        filteredDocsCount++;
        const fileRow = window.FS.sidebar.createFileTreeRow(file);
        window.FS.dom.sidebarTree.appendChild(fileRow);
    });

    window.FS.dom.sidebarTree.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    window.FS.dom.sidebarTree.addEventListener('drop', (e) => {
        if (e.target === window.FS.dom.sidebarTree) {
            e.preventDefault();
            const fileId = e.dataTransfer.getData('text/plain');
            window.FS.sidebar.moveFileToFolder(fileId, null);
        }
    });

    window.FS.dom.sidebarFilesCount.innerText = `${filteredDocsCount} ${filteredDocsCount === 1 ? 'draft' : 'drafts'}`;
    if (window.lucide) window.lucide.createIcons();
};

window.FS.sidebar.createFileTreeRow = function(file) {
    const fileRow = document.createElement('div');
    fileRow.className = `tree-item tree-file ${window.FS.state.activeDocId === file.id ? 'active-file' : ''}`;
    fileRow.setAttribute('data-id', file.id);
    fileRow.setAttribute('draggable', 'true');
    
    fileRow.innerHTML = `
        <span class="tree-item-icon"><i data-lucide="file-text"></i></span>
        <span class="tree-item-title">${window.FS.utils.escapeHtml(file.title)}</span>
        <span style="font-size: 0.72rem; color: var(--text-muted); margin-right: 6px; flex-shrink:0;">${file.words} w</span>
        <div class="tree-item-actions">
            <button class="tree-action-btn btn-rename" title="Rename draft"><i data-lucide="edit"></i></button>
            <button class="tree-action-btn btn-delete" title="Delete draft" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
        </div>
    `;

    fileRow.addEventListener('click', (e) => {
        if (e.target.closest('.tree-item-actions')) return;
        window.FS.sidebar.selectDocument(file.id);
    });

    fileRow.addEventListener('dblclick', (e) => {
        if (e.target.closest('.tree-item-actions')) return;
        window.FS.sidebar.triggerRenameItem(file.id, false);
    });

    fileRow.querySelector('.btn-rename').addEventListener('click', (e) => {
        e.stopPropagation();
        window.FS.sidebar.triggerRenameItem(file.id, false);
    });

    fileRow.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        window.FS.sidebar.deleteDocument(file.id);
    });

    fileRow.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', file.id);
        fileRow.style.opacity = '0.4';
    });

    fileRow.addEventListener('dragend', () => {
        fileRow.style.opacity = '';
    });

    return fileRow;
};

window.FS.sidebar.selectDocument = function(docId) {
    if (window.FS.state.sessionActive) {
        if (window.FS.editor && window.FS.editor.completeSession) {
            window.FS.editor.completeSession(true);
        }
    }

    window.FS.state.activeDocId = docId;
    localStorage.setItem('flowstate_active_doc_id', docId);

    const docs = window.FS.storage.getDocumentsFromStorage();
    const doc = docs.find(d => d.id === docId);
    
    if (doc) {
        window.FS.dom.editorTextarea.innerHTML = doc.content;
        window.FS.dom.editorTextarea.setAttribute('contenteditable', 'true');
        if (window.FS.dom.selectFontSize) {
            window.FS.dom.editorTextarea.style.fontSize = window.FS.dom.selectFontSize.value;
        }
        window.FS.dom.inputSessionTitle.value = doc.title;
        
        window.FS.ui.updateActiveDocumentHeader();
        
        window.FS.state.wordsCount = window.FS.utils.computeTextStats(doc.content).words;
        window.FS.state.lastRecordedWordCount = window.FS.state.wordsCount;
        
        const footerWords = document.getElementById('editor-footer-words');
        if (footerWords) {
            footerWords.innerText = `${window.FS.state.wordsCount} words`;
        }

        if (window.FS.editor && window.FS.editor.updateLiveStats) {
            window.FS.editor.updateLiveStats();
        }
        
        window.FS.sidebar.renderSidebarTree();
        window.FS.ui.switchView('main');
        document.getElementById('session-settings-section').style.display = 'block';
        document.getElementById('btn-start-session').style.display = 'flex';
    }
};

window.FS.sidebar.initSidebarEvents = function() {
    window.FS.dom.btnSidebarCollapse.addEventListener('click', () => window.FS.ui.toggleSidebar(true));
    window.FS.dom.btnSidebarExpand.addEventListener('click', () => window.FS.ui.toggleSidebar(false));
    window.FS.dom.sidebarSearchInput.addEventListener('input', (e) => {
        window.FS.state.searchQuery = e.target.value.toLowerCase().trim();
        window.FS.sidebar.renderSidebarTree();
    });
    window.FS.dom.btnNewFile.addEventListener('click', () => window.FS.sidebar.createNewDocument());
    window.FS.dom.btnNewFolder.addEventListener('click', () => window.FS.sidebar.createNewFolder());
};
