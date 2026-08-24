window.FS = window.FS || {};

window.FS.compileUI = {
    exclusions: [],

    init: function() {
        const dom = window.FS.dom;
        if (!dom) return;

        // Register action buttons
        if (dom.btnCompileSelectAll) {
            dom.btnCompileSelectAll.addEventListener('click', () => this.selectAll());
        }
        if (dom.btnCompileDeselectAll) {
            dom.btnCompileDeselectAll.addEventListener('click', () => this.deselectAll());
        }
        if (dom.btnCancelCompile) {
            dom.btnCancelCompile.addEventListener('click', () => window.FS.ui.closeModal('compile'));
        }
        if (dom.btnCloseCompile) {
            dom.btnCloseCompile.addEventListener('click', () => window.FS.ui.closeModal('compile'));
        }
        if (dom.btnTriggerCompile) {
            dom.btnTriggerCompile.addEventListener('click', () => this.triggerCompile());
        }
        if (dom.compileFormatSelect) {
            dom.compileFormatSelect.addEventListener('change', (e) => {
                this.updateLayoutSettingsVisibility(e.target.value);
                this.updatePreview();
            });
        }

        // Live preview listeners
        const previewTriggerElements = [
            dom.compileTemplateSelect,
            dom.compileTrimSizeSelect,
            dom.compileDropCaps,
            dom.compileRunningHeaders,
            dom.compileTitleOrnament,
            dom.compileAuthorInput
        ];
        previewTriggerElements.forEach(elem => {
            if (elem) {
                elem.addEventListener('change', () => this.updatePreview());
                elem.addEventListener('input', () => this.updatePreview());
            }
        });

        // Render checklist whenever file structure is changed
        const originalSaveDocs = window.FS.storage.saveDocuments;
        if (originalSaveDocs) {
            window.FS.storage.saveDocuments = (docs) => {
                originalSaveDocs(docs);
                if (window.FS.dom.modals.compile && window.FS.dom.modals.compile.classList.contains('active')) {
                    this.renderTree();
                }
            };
        }
    },

    updateLayoutSettingsVisibility: function(format) {
        const dom = window.FS.dom;
        if (!dom || !dom.compilePdfSettingsSection) return;
        const styledFormats = ['pdf', 'epub', 'docx', 'html', 'rtf', 'md', 'txt'];
        if (styledFormats.includes(format)) {
            dom.compilePdfSettingsSection.style.display = 'block';
            const trimSelectControl = dom.compileTrimSizeSelect ? dom.compileTrimSizeSelect.closest('.settings-control') : null;
            const headersSelectControl = dom.compileRunningHeaders ? dom.compileRunningHeaders.closest('.settings-control') : null;
            if (format === 'pdf') {
                if (trimSelectControl) trimSelectControl.style.display = 'block';
                if (headersSelectControl) headersSelectControl.style.display = 'block';
            } else {
                if (trimSelectControl) trimSelectControl.style.display = 'none';
                if (headersSelectControl) headersSelectControl.style.display = 'none';
            }
        } else {
            dom.compilePdfSettingsSection.style.display = 'none';
        }
    },

    updatePreview: function() {
        const dom = window.FS.dom;
        if (!dom || !dom.compileLivePreviewBox) return;

        const template = dom.compileTemplateSelect ? dom.compileTemplateSelect.value : 'classic';
        const trimSize = dom.compileTrimSizeSelect ? dom.compileTrimSizeSelect.value : 'letter';
        const dropCaps = dom.compileDropCaps ? dom.compileDropCaps.checked : false;
        const runningHeaders = dom.compileRunningHeaders ? dom.compileRunningHeaders.value : 'none';
        const titleOrnament = dom.compileTitleOrnament ? dom.compileTitleOrnament.value : 'none';
        const author = dom.compileAuthorInput ? dom.compileAuthorInput.value : 'Meridian Writer';

        // Get active workspace name as book title
        const workspaces = window.FS.workspaces ? window.FS.workspaces.getWorkspaces() : [];
        const ws = workspaces.find(w => w.id === window.FS.state.activeWorkspaceId);
        const bookTitle = ws ? ws.name : 'Book Title';

        // 1. Update template theme class
        dom.compileLivePreviewBox.className = `specimen-${template}`;

        // 2. Update trim size label
        let trimLabel = 'US Letter (8.5" x 11")';
        if (trimSize === 'trade') trimLabel = 'US Trade (6" x 9")';
        else if (trimSize === 'digest') trimLabel = 'US Digest (5.5" x 8.5")';
        else if (trimSize === 'pocket') trimLabel = 'Pocket Book (4.25" x 6.87")';
        if (dom.compilePreviewTrimLabel) {
            dom.compilePreviewTrimLabel.textContent = trimLabel;
        }

        // 3. Update running headers
        if (runningHeaders === 'classic' && dom.compileFormatSelect && dom.compileFormatSelect.value === 'pdf') {
            if (dom.compilePreviewHeader) dom.compilePreviewHeader.style.display = 'flex';
            if (dom.compilePreviewHeaderAuthor) dom.compilePreviewHeaderAuthor.textContent = author;
            if (dom.compilePreviewHeaderTitle) dom.compilePreviewHeaderTitle.textContent = bookTitle;
        } else {
            if (dom.compilePreviewHeader) dom.compilePreviewHeader.style.display = 'none';
        }

        // 4. Update title page ornament preview
        if (dom.compilePreviewOrnament) {
            if (titleOrnament === 'quill') {
                dom.compilePreviewOrnament.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>`;
            } else if (titleOrnament === 'star') {
                dom.compilePreviewOrnament.innerHTML = '✦';
            } else if (titleOrnament === 'flourish') {
                dom.compilePreviewOrnament.innerHTML = '❧ ❦ ☙';
            } else {
                dom.compilePreviewOrnament.innerHTML = '';
            }
        }

        // 5. Update drop caps
        const previewText = dom.compileLivePreviewBox.querySelector('.compile-preview-text');
        if (dropCaps) {
            if (dom.compilePreviewDropCap) dom.compilePreviewDropCap.style.display = 'block';
            if (dom.compilePreviewFirstWordRest) dom.compilePreviewFirstWordRest.style.display = 'inline';
            if (dom.compilePreviewFirstWordNormal) dom.compilePreviewFirstWordNormal.style.display = 'none';
            if (previewText) previewText.style.textIndent = '0';
        } else {
            if (dom.compilePreviewDropCap) dom.compilePreviewDropCap.style.display = 'none';
            if (dom.compilePreviewFirstWordRest) dom.compilePreviewFirstWordRest.style.display = 'none';
            if (dom.compilePreviewFirstWordNormal) dom.compilePreviewFirstWordNormal.style.display = 'inline';
            if (previewText) previewText.style.textIndent = '';
        }
    },

    openCompileModal: function(preselectedFormat = null) {
        if (!window.FS.state.activeWorkspaceId) {
            alert("Please open a workspace first.");
            return;
        }

        this.loadExclusions();

        // Pre-select format if requested
        if (preselectedFormat && window.FS.dom.compileFormatSelect) {
            window.FS.dom.compileFormatSelect.value = preselectedFormat;
        }

        // Initialize settings visibility
        const currentFormat = window.FS.dom.compileFormatSelect ? window.FS.dom.compileFormatSelect.value : 'md';
        this.updateLayoutSettingsVisibility(currentFormat);
        this.updatePreview();

        // Render folder/document checklists
        this.renderTree();

        // Open modal
        window.FS.ui.openModal('compile');
    },

    loadExclusions: function() {
        const wsId = window.FS.state.activeWorkspaceId;
        const stored = localStorage.getItem(`flowstate_compile_exclusions_${wsId}`);
        this.exclusions = stored ? JSON.parse(stored) : [];
    },

    saveExclusions: function() {
        const wsId = window.FS.state.activeWorkspaceId;
        localStorage.setItem(`flowstate_compile_exclusions_${wsId}`, JSON.stringify(this.exclusions));
    },

    renderTree: function() {
        const dom = window.FS.dom;
        if (!dom || !dom.compileTreeList) return;

        dom.compileTreeList.innerHTML = '';

        const folders = window.FS.storage.getFoldersFromStorage();
        const docs = window.FS.storage.getDocumentsFromStorage();

        // Helpers to escape html
        const escapeHtml = window.FS.utils.escapeHtml || (str => str || '');

        // Render directory nodes
        folders.forEach(folder => {
            const nestedFiles = docs.filter(d => d.folderId === folder.id);
            const folderWords = nestedFiles.reduce((acc, curr) => acc + (curr.words || 0), 0);
            const isFolderExcluded = this.exclusions.includes(folder.id);

            const folderItem = document.createElement('div');
            folderItem.className = 'compile-tree-item tree-folder';
            folderItem.setAttribute('data-id', folder.id);
            folderItem.innerHTML = `
                <input type="checkbox" id="chk-comp-${folder.id}" ${!isFolderExcluded ? 'checked' : ''}>
                <span class="item-title">${escapeHtml(folder.name)}</span>
                <span class="item-word-count">${folderWords} w</span>
            `;

            const checkbox = folderItem.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                this.handleCheckboxChange(folder.id, true, e.target.checked);
            });

            dom.compileTreeList.appendChild(folderItem);

            // Nested documents
            nestedFiles.forEach(file => {
                const isFileExcluded = this.exclusions.includes(file.id);

                const fileItem = document.createElement('div');
                fileItem.className = 'compile-tree-item tree-file';
                fileItem.setAttribute('data-id', file.id);
                fileItem.innerHTML = `
                    <input type="checkbox" id="chk-comp-${file.id}" ${!isFileExcluded ? 'checked' : ''}>
                    <span class="item-title">${escapeHtml(file.title)}</span>
                    <span class="item-word-count">${file.words || 0} w</span>
                `;

                const fileCheckbox = fileItem.querySelector('input');
                fileCheckbox.addEventListener('change', (e) => {
                    this.handleCheckboxChange(file.id, false, e.target.checked);
                });

                dom.compileTreeList.appendChild(fileItem);
            });
        });

        // Root level documents (uncategorized)
        const rootFiles = docs.filter(d => d.folderId === null);
        if (rootFiles.length > 0) {
            const uncatHeader = document.createElement('div');
            uncatHeader.className = 'compile-tree-item tree-folder';
            uncatHeader.style.fontStyle = 'italic';
            uncatHeader.style.opacity = '0.7';
            uncatHeader.innerHTML = `<span class="item-title">Uncategorized Drafts</span>`;
            dom.compileTreeList.appendChild(uncatHeader);

            rootFiles.forEach(file => {
                const isFileExcluded = this.exclusions.includes(file.id);

                const fileItem = document.createElement('div');
                fileItem.className = 'compile-tree-item tree-file';
                fileItem.setAttribute('data-id', file.id);
                fileItem.innerHTML = `
                    <input type="checkbox" id="chk-comp-${file.id}" ${!isFileExcluded ? 'checked' : ''}>
                    <span class="item-title">${escapeHtml(file.title)}</span>
                    <span class="item-word-count">${file.words || 0} w</span>
                `;

                const fileCheckbox = fileItem.querySelector('input');
                fileCheckbox.addEventListener('change', (e) => {
                    this.handleCheckboxChange(file.id, false, e.target.checked);
                });

                dom.compileTreeList.appendChild(fileItem);
            });
        }
    },

    handleCheckboxChange: function(itemId, isFolder, checked) {
        if (checked) {
            // Remove from exclusions
            this.exclusions = this.exclusions.filter(id => id !== itemId);
        } else {
            // Add to exclusions if not already there
            if (!this.exclusions.includes(itemId)) {
                this.exclusions.push(itemId);
            }
        }

        // Recursive child checks for folders
        if (isFolder) {
            const docs = window.FS.storage.getDocumentsFromStorage();
            const childDocs = docs.filter(d => d.folderId === itemId);

            childDocs.forEach(doc => {
                const docCheckbox = document.getElementById(`chk-comp-${doc.id}`);
                if (docCheckbox) {
                    docCheckbox.checked = checked;
                }
                if (checked) {
                    this.exclusions = this.exclusions.filter(id => id !== doc.id);
                } else {
                    if (!this.exclusions.includes(doc.id)) {
                        this.exclusions.push(doc.id);
                    }
                }
            });
        }

        this.saveExclusions();
    },

    selectAll: function() {
        this.exclusions = [];
        this.saveExclusions();
        this.renderTree();
    },

    deselectAll: function() {
        const folders = window.FS.storage.getFoldersFromStorage();
        const docs = window.FS.storage.getDocumentsFromStorage();

        this.exclusions = [
            ...folders.map(f => f.id),
            ...docs.map(d => d.id)
        ];
        this.saveExclusions();
        this.renderTree();
    },

    triggerCompile: function() {
        const dom = window.FS.dom;
        if (!dom) return;

        const options = {
            format: dom.compileFormatSelect ? dom.compileFormatSelect.value : 'md',
            author: dom.compileAuthorInput ? dom.compileAuthorInput.value : 'Meridian Writer',
            includeFolderNames: dom.compileIncludeFolderNames ? dom.compileIncludeFolderNames.checked : true,
            includeDocTitles: dom.compileIncludeDocTitles ? dom.compileIncludeDocTitles.checked : true,
            pageBreaksFolders: dom.compilePageBreaksFolders ? dom.compilePageBreaksFolders.checked : true,
            separator: dom.compileSeparatorSelect ? dom.compileSeparatorSelect.value : 'none',
            template: dom.compileTemplateSelect ? dom.compileTemplateSelect.value : 'classic',
            trimSize: dom.compileTrimSizeSelect ? dom.compileTrimSizeSelect.value : 'letter',
            dropCaps: dom.compileDropCaps ? dom.compileDropCaps.checked : false,
            runningHeaders: dom.compileRunningHeaders ? dom.compileRunningHeaders.value : 'none',
            titleOrnament: dom.compileTitleOrnament ? dom.compileTitleOrnament.value : 'none',
            exclusions: [...this.exclusions]
        };

        // Close Compile Modal
        window.FS.ui.closeModal('compile');

        // Execute dynamic compilation
        if (window.FS.workspaces && window.FS.workspaces.compileBook) {
            window.FS.workspaces.compileBook(options);
        } else {
            console.error("compileBook function not found under window.FS.workspaces.");
        }
    }
};
