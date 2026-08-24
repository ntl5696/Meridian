window.FS.workspaces = {
    getWorkspaces: function () {
        const raw = localStorage.getItem('flowstate_workspaces');
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    },

    saveWorkspaces: function (workspaces) {
        localStorage.setItem('flowstate_workspaces', JSON.stringify(workspaces));
    },

    createWorkspace: function () {
        this._showCustomPrompt("Enter a name for your new Book/Workspace:", (name) => {
            if (!name || name.trim() === '') return;

            const workspaces = this.getWorkspaces();
            const newId = 'ws_' + Date.now();
            workspaces.push({ id: newId, name: name.trim(), createdAt: Date.now() });
            this.saveWorkspaces(workspaces);

            this.openWorkspace(newId);
        });
    },

    _showCustomPrompt: function (message, callback) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop active';
        backdrop.style.display = 'flex';
        backdrop.style.zIndex = '9999';

        const card = document.createElement('div');
        card.className = 'modal-card';
        card.style.maxWidth = '400px';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `<h3>${message}</h3>`;

        const body = document.createElement('div');
        body.className = 'modal-body';
        const input = document.createElement('input');
        input.type = 'text';
        input.style.width = '100%';
        input.style.padding = '10px';
        input.style.marginBottom = '20px';
        input.style.border = '1px solid var(--border-color, #ccc)';
        input.style.borderRadius = '5px';
        input.style.background = 'var(--bg-color, #fff)';
        input.style.color = 'var(--text-color, #000)';

        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.gap = '10px';

        const btnCancel = document.createElement('button');
        btnCancel.textContent = 'Cancel';
        btnCancel.style.padding = '8px 16px';

        const btnOk = document.createElement('button');
        btnOk.textContent = 'OK';
        btnOk.style.padding = '8px 16px';
        btnOk.style.background = 'var(--primary-color, #007bff)';
        btnOk.style.color = 'white';
        btnOk.style.border = 'none';
        btnOk.style.borderRadius = '5px';
        btnOk.style.cursor = 'pointer';

        footer.appendChild(btnCancel);
        footer.appendChild(btnOk);

        body.appendChild(input);
        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);
        backdrop.appendChild(card);
        document.body.appendChild(backdrop);

        input.focus();

        const close = (val) => {
            if (document.body.contains(backdrop)) {
                document.body.removeChild(backdrop);
            }
            callback(val);
        };

        btnCancel.addEventListener('click', () => close(null));
        btnOk.addEventListener('click', () => close(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') close(input.value);
            if (e.key === 'Escape') close(null);
        });
    },

    openWorkspace: function (id) {
        const workspaces = this.getWorkspaces();
        const ws = workspaces.find(w => w.id === id);
        if (!ws) return;

        window.FS.state.activeWorkspaceId = id;

        window.FS.ui.switchView('main');
        window.FS.sidebar.renderSidebarTree();

        docs = window.FS.storage.getDocumentsFromStorage();
        if (docs.length > 0) {
            window.FS.sidebar.selectDocument(docs[0].id);
        } else if (window.FS.sidebar.clearActiveDocument) {
            window.FS.sidebar.clearActiveDocument();
        }
    },

    renderWorkspacesList: function () {
        const container = document.getElementById('workspaces-list');
        if (!container) return;

        const workspaces = this.getWorkspaces();
        container.innerHTML = '';

        if (workspaces.length === 0) {
            container.innerHTML = '<p class="home-help">No books created yet. Click above to start!</p>';
            return;
        }

        workspaces.forEach(ws => {
            const btn = document.createElement('button');
            btn.className = 'workspace-card';
            btn.innerHTML = `
                <i data-lucide="book"></i>
                <span>${window.FS.utils.escapeHtml(ws.name)}</span>
            `;
            btn.addEventListener('click', () => this.openWorkspace(ws.id));
            container.appendChild(btn);
        });

        if (window.lucide) window.lucide.createIcons();
    },

    exportBook: function (format = 'md') {
        if (!window.FS.state.activeWorkspaceId) return;
        if (window.FS.compileUI && window.FS.compileUI.openCompileModal) {
            window.FS.compileUI.openCompileModal(format);
        } else {
            this.compileBook({ format: format });
        }
    },

    compileBook: function (options = {}) {
        if (!window.FS.state.activeWorkspaceId) return;

        const format = options.format || 'md';
        const author = options.author || 'Meridian Writer';
        const includeFolderNames = options.hasOwnProperty('includeFolderNames') ? options.includeFolderNames : true;
        const includeDocTitles = options.hasOwnProperty('includeDocTitles') ? options.includeDocTitles : true;
        const pageBreaksFolders = options.hasOwnProperty('pageBreaksFolders') ? options.pageBreaksFolders : true;
        const separator = options.separator || 'none';
        const exclusions = options.exclusions || [];

        const template = options.template || 'classic';
        const trimSize = options.trimSize || 'letter';
        const dropCaps = !!options.dropCaps;
        const runningHeaders = options.runningHeaders || 'none';
        const titleOrnament = options.titleOrnament || 'none';

        const workspaces = this.getWorkspaces();
        const ws = workspaces.find(w => w.id === window.FS.state.activeWorkspaceId);
        const bookName = ws ? ws.name : 'Meridian_Book';

        const folders = window.FS.storage.getFoldersFromStorage();
        const docs = window.FS.storage.getDocumentsFromStorage().filter(d => !exclusions.includes(d.id));

        const safeTitle = bookName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const filename = `${safeTitle || 'manuscript'}.${format}`;

        let blobContent = '';
        let contentType = 'text/plain';

        const stripHtml = (html) => {
            if (!html) return '';
            let text = html
                .replace(/<span class="grammar-error[^>]*>(.*?)<\/span>/gi, '$1')
                .replace(/<span style="white-space:\s*pre;?">\s*<\/span>/gi, '')
                .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
                .replace(/<font[^>]*>(.*?)<\/font>/gi, '$1');
            return text
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<p>/gi, '')
                .replace(/<[^>]*>?/gm, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
        };

        const escapeXml = (str) => {
            if (!str) return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        const cleanXhtml = (html) => {
            if (!html) return '<div xmlns="http://www.w3.org/1999/xhtml"></div>';
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
                const root = doc.body.firstChild;
                const serializer = new XMLSerializer();
                return serializer.serializeToString(root);
            } catch (e) {
                console.error("XHTML cleaning failed:", e);
                const safe = html
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;')
                    .replace(/<br>/gi, '<br/>')
                    .replace(/<br\s*>/gi, '<br/>');
                return `<div xmlns="http://www.w3.org/1999/xhtml">${safe}</div>`;
            }
        };

        const convertHtmlToRtf = (html, isFirstInChapter = false) => {
            if (!html) return '';
            let sanitizedHtml = cleanContent(html, false);

            let paragraphs = sanitizedHtml.split(/<\/p>\s*/i);
            let rtfParagraphs = [];

            let paraPrefix = '\\pard\\fi360\\qj ';
            if (template === 'typewriter') {
                paraPrefix = '\\pard\\fi720\\sl480\\slmult1\\ql ';
            } else if (template === 'zen') {
                paraPrefix = '\\pard\\fi0\\sa180\\ql ';
            }

            paragraphs.forEach((pStr, idx) => {
                let cleanP = pStr.replace(/<p[^>]*>/gi, '').trim();
                if (cleanP.length > 0) {
                    let currentPrefix = (idx === 0 && (template === 'classic' || template === 'romance')) ? '\\pard\\fi0\\qj ' : paraPrefix;

                    cleanP = cleanP.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '___BOLD_START___$1___BOLD_END___')
                                   .replace(/<b[^>]*>(.*?)<\/b>/gi, '___BOLD_START___$1___BOLD_END___')
                                   .replace(/<em[^>]*>(.*?)<\/em>/gi, '___ITALIC_START___$1___ITALIC_END___')
                                   .replace(/<i[^>]*>(.*?)<\/i>/gi, '___ITALIC_START___$1___ITALIC_END___');

                    cleanP = cleanP.replace(/<[^>]+>/g, '');

                    let rtfCleanP = '';
                    for (let c = 0; c < cleanP.length; c++) {
                        const code = cleanP.charCodeAt(c);
                        if (code > 127) {
                            rtfCleanP += `\\u${code}?`;
                        } else if (cleanP[c] === '\\') {
                            rtfCleanP += '\\\\';
                        } else if (cleanP[c] === '{') {
                            rtfCleanP += '\\{';
                        } else if (cleanP[c] === '}') {
                            rtfCleanP += '\\}';
                        } else {
                            rtfCleanP += cleanP[c];
                        }
                    }

                    rtfCleanP = rtfCleanP.replace(/___BOLD_START___/g, '\\b ')
                                         .replace(/___BOLD_END___/g, '\\b0 ')
                                         .replace(/___ITALIC_START___/g, '\\i ')
                                         .replace(/___ITALIC_END___/g, '\\i0 ');

                    if (dropCaps && isFirstInChapter && idx === 0) {
                        let i = 0;
                        let letterIdx = -1;
                        let quoteIdx = -1;

                        while (i < rtfCleanP.length) {
                            if (rtfCleanP[i] === '\\') {
                                if (rtfCleanP.startsWith('\\u', i)) {
                                    const qIdx = rtfCleanP.indexOf('?', i);
                                    if (qIdx !== -1) {
                                        const uCodeStr = rtfCleanP.substring(i + 2, qIdx);
                                        const uCode = parseInt(uCodeStr, 10);
                                        if (uCode === 8220 || uCode === 8221 || uCode === 8216 || uCode === 8217 || uCode === 34 || uCode === 39) {
                                            if (quoteIdx === -1) quoteIdx = i;
                                        } else if (/[a-zA-Z0-9]/.test(String.fromCharCode(uCode))) {
                                            letterIdx = i;
                                            break;
                                        }
                                        i = qIdx + 1;
                                        continue;
                                    }
                                }
                                i++;
                            } else {
                                const char = rtfCleanP[i];
                                if (/[a-zA-Z0-9]/.test(char)) {
                                    letterIdx = i;
                                    break;
                                } else if (/["'«»]/.test(char)) {
                                    if (quoteIdx === -1) quoteIdx = i;
                                    i++;
                                } else if (/\s/.test(char)) {
                                    i++;
                                } else {
                                    break;
                                }
                            }
                        }

                        if (letterIdx !== -1) {
                            const startIdx = quoteIdx !== -1 ? quoteIdx : letterIdx;
                            let endIdx = letterIdx + 1;
                            if (rtfCleanP.startsWith('\\u', letterIdx)) {
                                const qIdx = rtfCleanP.indexOf('?', letterIdx);
                                if (qIdx !== -1) endIdx = qIdx + 1;
                            }

                            const dropChar = rtfCleanP.substring(startIdx, endIdx);
                            rtfCleanP = rtfCleanP.substring(0, startIdx) + `\\fs52\\b ${dropChar}\\b0\\fs24 ` + rtfCleanP.substring(endIdx);
                        }
                    }

                    rtfParagraphs.push(`${currentPrefix}${rtfCleanP}\\par`);
                }
            });

            return rtfParagraphs.join('\n');
        };

        const getSeparatorText = (fmt) => {
            switch (separator) {
                case 'three-stars':
                    if (fmt === 'html' || fmt === 'docx' || fmt === 'doc') {
                        return `\n<div class="divider" style="text-align: center; margin: 30px 0; font-size: 1.5em; color: #999; letter-spacing: 5px;">***</div>\n`;
                    }
                    if (fmt === 'rtf') {
                        return '\\par\\par\\qc ***\\par\\par\\ql ';
                    }
                    return '\n\n***\n\n';
                case 'hash':
                    if (fmt === 'html' || fmt === 'docx' || fmt === 'doc') {
                        return `\n<div class="divider" style="text-align: center; margin: 30px 0; font-size: 1.5em; color: #999; letter-spacing: 5px;">#</div>\n`;
                    }
                    if (fmt === 'rtf') {
                        return '\\par\\par\\qc #\\par\\par\\ql ';
                    }
                    return '\n\n#\n\n';
                case 'blank':
                    if (fmt === 'html' || fmt === 'docx' || fmt === 'doc') {
                        return '\n<br/><br/>\n';
                    }
                    if (fmt === 'rtf') {
                        return '\\par\\par\\par ';
                    }
                    return '\n\n\n';
                case 'none':
                default:
                    if (fmt === 'html' || fmt === 'docx' || fmt === 'doc') {
                        return '\n';
                    }
                    if (fmt === 'rtf') {
                        return '\\par ';
                    }
                    return '\n\n';
            }
        };

        const cleanContent = (htmlStr, enableDropCap = true) => {
            if (!htmlStr) return '';
            let text = htmlStr;

            text = text.replace(/<span class="grammar-error[^>]*>(.*?)<\/span>/gi, '$1');
            text = text.replace(/<span style="white-space:\s*pre;?">\s*<\/span>/gi, '');
            text = text.replace(/<div style="text-align:[^"]*">/gi, '');
            text = text.replace(/<p style="text-align:[^"]*">/gi, '<p>');
            text = text.replace(/<font[^>]*>/gi, '');
            text = text.replace(/<\/font>/gi, '');
            text = text.replace(/<span style="font-size:[^"]*">(.*?)<\/span>/gi, '$1');
            text = text.replace(/(<[a-z0-9]+[^>]*)\s+style="[^"]*"/gi, '$1');
            text = text.replace(/\b(Patotoato|Basball|Elangated)\b/g, '');

            let trimmed = text.trim();

            if (!trimmed.includes('<p>')) {
                let paragraphs = trimmed.split(/\r?\n\r?\n+/).map(p => p.trim()).filter(p => p.length > 0);
                trimmed = paragraphs.map(p => `<p>${p}</p>`).join('\n');
            } else {
                let paragraphs = trimmed.split(/<\/p>\s*/i);
                let cleanedPs = [];
                paragraphs.forEach(block => {
                    let b = block.replace(/<p[^>]*>/gi, '').trim();
                    if (b.length > 0) {
                        let lines = b.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                        lines.forEach(l => {
                            cleanedPs.push(`<p>${l}</p>`);
                        });
                    }
                });
                if (cleanedPs.length > 0) {
                    trimmed = cleanedPs.join('\n');
                }
            }

            if (!dropCaps || !enableDropCap) return trimmed;

            let i = 0;
            let letterIndex = -1;
            let punctuationStart = -1;

            while (i < trimmed.length) {
                if (trimmed[i] === '<') {
                    const closeTag = trimmed.indexOf('>', i);
                    if (closeTag === -1) break;
                    i = closeTag + 1;
                } else if (trimmed[i] === '&') {
                    const closeEntity = trimmed.indexOf(';', i);
                    if (closeEntity === -1) break;
                    i = closeEntity + 1;
                } else if (/\s/.test(trimmed[i])) {
                    i++;
                } else {
                    const char = trimmed[i];
                    if (/[a-zA-Z0-9]/.test(char)) {
                        letterIndex = i;
                        break;
                    } else if (/[\u201C\u201D\u2018\u2019"'«»‘’“”]/.test(char)) {
                        if (punctuationStart === -1) {
                            punctuationStart = i;
                        }
                        i++;
                    } else {
                        break;
                    }
                }
            }

            if (letterIndex !== -1) {
                const startIdx = punctuationStart !== -1 ? punctuationStart : letterIndex;
                const dropCapContent = trimmed.slice(startIdx, letterIndex + 1);
                let formattedDropCap = dropCapContent;
                if (/[\u201C\u201D\u2018\u2019"'«»‘’“”]/.test(dropCapContent.charAt(0))) {
                    formattedDropCap = `<span class="drop-quote">${dropCapContent.charAt(0)}</span>${dropCapContent.slice(1)}`;
                }
                return trimmed.slice(0, startIdx) + `<span class="drop-cap">${formattedDropCap}</span>` + trimmed.slice(letterIndex + 1);
            }
            return trimmed;
        };

        const getOrnamentTextSymbol = () => {
            if (titleOrnament === 'quill') return '✒';
            if (titleOrnament === 'star') return '✦';
            if (titleOrnament === 'flourish') return '❧ ❦ ☙';
            return '';
        };

        const applyRtfDropCap = (htmlStr) => {
            if (!dropCaps || !htmlStr) return convertHtmlToRtf(htmlStr);
            const plain = stripHtml(htmlStr).trim();
            if (plain.length === 0) return convertHtmlToRtf(htmlStr);

            let letterIdx = -1;
            let quoteIdx = -1;
            for (let i = 0; i < plain.length; i++) {
                const char = plain.charAt(i);
                if (/[a-zA-Z]/.test(char)) {
                    letterIdx = i;
                    break;
                } else if (/[\u201C\u201D\u2018\u2019"'«»‘’“”]/.test(char)) {
                    if (quoteIdx === -1) quoteIdx = i;
                } else if (!/\s/.test(char)) {
                    break;
                }
            }

            if (letterIdx !== -1) {
                const startIdx = quoteIdx !== -1 ? quoteIdx : letterIdx;
                const dropCapStr = plain.slice(startIdx, letterIdx + 1);
                let rtfContent = convertHtmlToRtf(htmlStr);
                const charIdx = rtfContent.indexOf(dropCapStr);
                if (charIdx !== -1) {
                    return rtfContent.slice(0, charIdx) + `{\\fs52\\b ${dropCapStr}}` + rtfContent.slice(charIdx + dropCapStr.length);
                }
            }
            return convertHtmlToRtf(htmlStr);
        };

        const cleanMarkdownContent = (htmlStr, enableDropCap = true) => {
            if (!htmlStr) return '';
            let text = htmlStr;

            text = text.replace(/<span class="grammar-error[^>]*>(.*?)<\/span>/gi, '$1');
            text = text.replace(/<span style="white-space:\s*pre;?">\s*<\/span>/gi, '');
            text = text.replace(/\b(Patotoato|Basball|Elangated)\b/g, '');
            text = text.replace(/<\/p>\s*/gi, '\n\n');
            text = text.replace(/<br\s*\/?>/gi, '\n');
            text = text.replace(/<[^>]+>/g, '');
            text = text.replace(/&nbsp;/g, ' ')
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"')
                       .replace(/&#39;/g, "'");

            text = text.replace(/\n\t+/g, '\n\n');
            text = text.replace(/^\t+/gm, '');
            text = text.replace(/\n{3,}/g, '\n\n');
            let cleaned = text.trim();

            if (dropCaps && enableDropCap && cleaned.length > 0) {
                let firstChar = cleaned.charAt(0);
                if (/[\u201C\u201D\u2018\u2019"'«»‘’“”]/.test(firstChar) && cleaned.length > 1) {
                    cleaned = firstChar + '**' + cleaned.charAt(1).toUpperCase() + '**' + cleaned.slice(2);
                } else {
                    cleaned = '**' + firstChar.toUpperCase() + '**' + cleaned.slice(1);
                }
            }

            return cleaned;
        };

        if (format === 'md') {
            const ornamentText = getOrnamentTextSymbol();
            let compiledText = `---
title: "${bookName}"
author: "${author}"
date: "${new Date().toLocaleDateString()}"
---

# ${bookName}
${ornamentText ? `\n${ornamentText}\n` : ''}
by ${author}

`;

            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded) {
                        if (pageBreaksFolders) {
                            compiledText += `\n\n<div style="page-break-before: always;"></div>\n\n`;
                        }
                        if (includeFolderNames) {
                            compiledText += `## ${folder.name}\n\n`;
                        }
                    }
                    let scenes = [];
                    nestedFiles.forEach((doc, idx) => {
                        let sceneText = '';
                        if (includeDocTitles) {
                            sceneText += `\n\n<div style="page-break-before: always;"></div>\n\n### ${doc.title}\n\n`;
                        }
                        sceneText += cleanMarkdownContent(doc.content, true);
                        scenes.push(sceneText);
                    });
                    compiledText += scenes.join(getSeparatorText('md')) + `\n\n`;
                }
            });

            const rootFiles = docs.filter(d => d.folderId === null);
            if (rootFiles.length > 0) {
                if (includeFolderNames) {
                    compiledText += `## Uncategorized\n\n`;
                }
                let scenes = [];
                rootFiles.forEach((doc, idx) => {
                    let sceneText = '';
                    if (includeDocTitles) {
                        sceneText += `\n\n<div style="page-break-before: always;"></div>\n\n### ${doc.title}\n\n`;
                    }
                    sceneText += cleanMarkdownContent(doc.content, true);
                    scenes.push(sceneText);
                });
                compiledText += scenes.join(getSeparatorText('md')) + `\n\n`;
            }

            blobContent = compiledText;
            contentType = 'text/markdown';
        }

        const cleanTxtContent = (htmlStr) => {
            if (!htmlStr) return '';
            let text = htmlStr;

            text = text.replace(/<span class="grammar-error[^>]*>(.*?)<\/span>/gi, '$1');
            text = text.replace(/<span style="white-space:\s*pre;?">\s*<\/span>/gi, '');
            text = text.replace(/\b(Patotoato|Basball|Elangated)\b/g, '');
            text = text.replace(/<\/p>\s*/gi, '\n\n');
            text = text.replace(/<br\s*\/?>/gi, '\n');
            text = text.replace(/<[^>]+>/g, '');
            text = text.replace(/&nbsp;/g, ' ')
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"')
                       .replace(/&#39;/g, "'");

            text = text.replace(/\n\t+/g, '\n\n');
            text = text.replace(/^\t+/gm, '');
            text = text.replace(/\n{3,}/g, '\n\n');
            return text.trim();
        };

        if (format === 'txt') {
            const ornamentText = getOrnamentTextSymbol();
            let txt = `${bookName}
by ${author}
${ornamentText ? `${ornamentText}\n` : ''}${'='.repeat(40)}

COPYRIGHT
----------------------------------------
Copyright © ${new Date().getFullYear()} by ${author}
All rights reserved.

First edition
This book was professionally typeset on Meridian.
Find out more at meridian.com

CONTENTS
----------------------------------------
`;

            let currentNum = 1;
            docs.forEach(doc => {
                txt += `${currentNum}. ${doc.title}\n`;
                currentNum++;
            });

            txt += `\n\f\n`;

            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded && includeFolderNames) {
                        txt += `\f\n========================================\n${folder.name.toUpperCase()}\n========================================\n\n`;
                    }
                    let scenes = [];
                    nestedFiles.forEach((doc, idx) => {
                        let sceneText = '';
                        if (includeDocTitles) {
                            sceneText += `\f\n${doc.title.toUpperCase()}\n${'-'.repeat(doc.title.length)}\n\n`;
                        }
                        sceneText += cleanTxtContent(doc.content);
                        scenes.push(sceneText);
                    });
                    txt += scenes.join('\n\n' + getSeparatorText('txt') + '\n\n') + `\n\n`;
                }
            });

            const rootFiles = docs.filter(d => d.folderId === null);
            if (rootFiles.length > 0) {
                if (includeFolderNames) {
                    txt += `\f\n========================================\nUNCATEGORIZED\n========================================\n\n`;
                }
                let scenes = [];
                rootFiles.forEach((doc, idx) => {
                    let sceneText = '';
                    if (includeDocTitles) {
                        sceneText += `\f\n${doc.title.toUpperCase()}\n${'-'.repeat(doc.title.length)}\n\n`;
                    }
                    sceneText += cleanTxtContent(doc.content);
                    scenes.push(sceneText);
                });
                txt += scenes.join('\n\n' + getSeparatorText('txt') + '\n\n') + `\n\n`;
            }

            blobContent = txt;
            contentType = 'text/plain';
        } else if (format === 'html') {
            let ornamentHtml = '';
            if (titleOrnament === 'quill') {
                ornamentHtml = `<div class="title-ornament ornament-quill" style="margin: 20px 0; font-size: 22pt; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-feather"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg></div>`;
            } else if (titleOrnament === 'star') {
                ornamentHtml = `<div class="title-ornament ornament-star" style="margin: 20px 0; font-size: 22pt; text-align: center; color: #666;">✦</div>`;
            } else if (titleOrnament === 'flourish') {
                ornamentHtml = `<div class="title-ornament ornament-flourish" style="margin: 20px 0; font-size: 22pt; text-align: center; color: #4f46e5; font-family: Georgia, serif;">❧ ❦ ☙</div>`;
            }

            let tocItemsHtml = '';
            let currentNumber = 1;
            docs.forEach(doc => {
                tocItemsHtml += `
                <div style="display: flex; justify-content: space-between; font-size: 11pt; border-bottom: 1px dotted #ddd; margin-bottom: 8px;">
                    <span><a href="#doc-${doc.id}" style="color: inherit; text-decoration: none;">${currentNumber}. ${escapeXml(doc.title)}</a></span>
                </div>`;
                currentNumber++;
            });

            let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${bookName}</title>
    <style>
        body { 
            font-family: ${template === 'modern' ? "'Merriweather', 'Lora', serif" : (template === 'zen' ? "'Inter', sans-serif" : (template === 'typewriter' ? "'Courier New', Courier, monospace" : "'EB Garamond', 'Georgia', serif"))}; 
            line-height: ${template === 'typewriter' ? '2.0' : '1.6'}; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px; 
            color: #111; 
        }
        .title-page { text-align: center; margin-top: 100px; margin-bottom: 120px; page-break-after: always; }
        .copyright-page { text-align: center; margin-top: 120px; margin-bottom: 120px; page-break-after: always; font-size: 10pt; line-height: 1.6; }
        .toc-page { margin-top: 100px; margin-bottom: 120px; page-break-after: always; }
        h1 { 
            font-size: 3em; 
            margin-bottom: 20px; 
            font-family: ${template === 'romance' ? "'Playfair Display', serif" : (template === 'modern' || template === 'zen' ? "'Outfit', sans-serif" : "inherit")};
            font-weight: ${template === 'zen' ? '300' : 'normal'};
            text-transform: ${template === 'zen' ? 'lowercase' : (template === 'typewriter' ? 'uppercase' : 'none')};
            letter-spacing: ${template === 'zen' ? '3px' : (template === 'typewriter' ? '1px' : 'none')};
        }
        .author { font-size: 1.5em; font-style: italic; color: #333; margin-bottom: 50px; }
        h2 { 
            font-size: 1.8em; 
            margin-top: 40px; 
            border-bottom: ${template === 'modern' ? '2px solid #222' : 'none'}; 
            padding-bottom: 10px; 
            font-family: ${template === 'romance' ? "'Playfair Display', serif" : (template === 'modern' || template === 'zen' ? "'Outfit', sans-serif" : "inherit")};
            text-align: ${template === 'modern' || template === 'zen' ? 'left' : 'center'};
        }
        .folder-break { page-break-before: always; }
        h3 { 
            font-size: 1.4em; 
            margin-top: 50px; 
            color: #111; 
            font-family: ${template === 'romance' ? "'Playfair Display', serif" : (template === 'modern' || template === 'zen' ? "'Outfit', sans-serif" : "inherit")};
            text-align: ${template === 'modern' || template === 'zen' ? 'left' : 'center'};
            font-style: ${template === 'classic' || template === 'romance' ? 'italic' : 'normal'};
            page-break-before: always;
        }
        .divider { text-align: center; margin: 50px 0; font-size: 1.5em; color: #777; letter-spacing: 5px; }
        p { 
            margin-top: 0; 
            margin-bottom: ${template === 'zen' ? '1.2em' : '0'}; 
            text-indent: ${template === 'zen' || template === 'typewriter' ? '0' : '1.8em'}; 
            text-align: ${template === 'zen' || template === 'typewriter' ? 'left' : 'justify'}; 
        }
        p:first-of-type { text-indent: 0; }
        .drop-cap {
            float: left;
            font-size: 3.4em;
            line-height: 0.82;
            margin-top: 0.08em;
            margin-right: 0.1em;
            font-weight: normal;
            font-family: ${template === 'romance' ? "'Playfair Display', serif" : 'inherit'};
            font-style: ${template === 'romance' ? 'italic' : 'normal'};
            color: ${template === 'romance' ? '#4338ca' : 'inherit'};
        }
        .drop-cap .drop-quote {
            font-size: 0.75em;
            vertical-align: top;
            margin-right: -0.05em;
        }
        @media print {
            .title-page, .copyright-page, .toc-page, h3 { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="title-page">
        <h1>${bookName}</h1>
        ${ornamentHtml}
        <div class="author">by ${author}</div>
    </div>
    
    <div class="copyright-page">
        <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt;">Copyright &copy; ${new Date().getFullYear()} by ${author}</p>
        <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt; max-width: 4.5in; margin-left: auto; margin-right: auto; font-size: 9pt; color: #333;">
            All rights reserved. No part of this publication may be reproduced, stored, or transmitted in any form or by any means, electronic, mechanical, photocopying, recording, scanning, or otherwise without written permission from the publisher. It is illegal to copy this book, post it to a website, or distribute it by any other means without permission.
        </p>
        <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt;">First edition</p>
        <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt; color: #555; font-size: 9pt;">
            This book was professionally typeset on Meridian.<br/>
            Find out more at meridian.com
        </p>
    </div>

    <div class="toc-page">
        <h2 style="text-align: center; font-size: 22pt; margin-bottom: 40pt; font-weight: normal; font-family: inherit;">Contents</h2>
        <div class="toc-list" style="max-width: 4in; margin: 0 auto; line-height: 2;">
            ${tocItemsHtml}
        </div>
    </div>`;

            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded && includeFolderNames) {
                        let folderClass = pageBreaksFolders ? 'class="folder-break"' : '';
                        html += `<h2 ${folderClass}>${folder.name}</h2>`;
                    }
                    let scenes = [];
                    nestedFiles.forEach((doc, idx) => {
                        let sceneText = `<div id="doc-${doc.id}" class="chapter-container">`;
                        if (includeDocTitles) {
                            sceneText += `<h3>${doc.title}</h3>\n`;
                        }
                        const processedContent = cleanContent(doc.content, true);
                        sceneText += `<div class="content">${processedContent}</div></div>\n`;
                        scenes.push(sceneText);
                    });
                    html += scenes.join(getSeparatorText('html'));
                }
            });

            const rootFiles = docs.filter(d => d.folderId === null);
            if (rootFiles.length > 0) {
                if (includeFolderNames) {
                    html += `<h2>Uncategorized</h2>`;
                }
                let scenes = [];
                rootFiles.forEach((doc, idx) => {
                    let sceneText = `<div id="doc-${doc.id}" class="chapter-container">`;
                    if (includeDocTitles) {
                        sceneText += `<h3>${doc.title}</h3>\n`;
                    }
                    const processedContent = cleanContent(doc.content, true);
                    sceneText += `<div class="content">${processedContent}</div></div>\n`;
                    scenes.push(sceneText);
                });
                html += scenes.join(getSeparatorText('html'));
            }

            html += `</body>\n</html>`;
            blobContent = html;
            contentType = 'text/html';
        } else if (format === 'rtf') {
            let fontTbl = '{\\fonttbl{\\f0\\froman\\fcharset0 Georgia;}{\\f1\\fswiss\\fcharset0 Arial;}}';
            if (template === 'typewriter') {
                fontTbl = '{\\fonttbl{\\f0\\fmodern\\fcharset0 Courier New;}{\\f1\\fmodern\\fcharset0 Courier;}}';
            } else if (template === 'zen') {
                fontTbl = '{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\fswiss\\fcharset0 Arial;}}';
            } else if (template === 'romance') {
                fontTbl = '{\\fonttbl{\\f0\\froman\\fcharset0 Georgia;}{\\f1\\froman\\fcharset0 Times New Roman;}}';
            }

            let rtf = `{\\rtf1\\ansi\\deff0${fontTbl}\n`;
            rtf += `\\paperw11906\\paperh16838\\margl1440\\margr1440\\margt1440\\margb1440\n`;

            const ornamentText = getOrnamentTextSymbol();
            
            // Title page
            rtf += `\\pard\\qc\\f0\\fs54\\b ${bookName}\\b0\\par\\fs28 ${ornamentText ? `${ornamentText}\\par ` : ''}by ${author}\\par\\page\n`;

            // Copyright page
            rtf += `\\pard\\qc\\f0\\fs20 Copyright \\u169? ${new Date().getFullYear()} by ${author}\\par\\par All rights reserved. No part of this publication may be reproduced, stored, or transmitted in any form or by any means without permission.\\par\\par First edition\\par\\par This book was professionally typeset on Meridian.\\par Find out more at meridian.com\\par\\page\n`;

            // Contents page
            rtf += `\\pard\\qc\\f0\\fs36\\b Contents\\b0\\par\\par `;
            let currentNum = 1;
            docs.forEach(doc => {
                rtf += `\\pard\\fi0\\sa120\\ql ${currentNum}. ${doc.title}\\par `;
                currentNum++;
            });
            rtf += `\\page\n`;

            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded) {
                        if (includeFolderNames) {
                            rtf += `\\page \\pard\\qc\\f0\\fs36\\b ${folder.name}\\b0\\par\\par\n`;
                        }
                    }
                    let scenes = [];
                    nestedFiles.forEach((doc, idx) => {
                        let sceneText = '';
                        if (includeDocTitles) {
                            sceneText += `\\page \\pard\\qc\\f0\\fs28\\b ${doc.title}\\b0\\par\\par\n`;
                        }
                        sceneText += convertHtmlToRtf(doc.content, true);
                        scenes.push(sceneText);
                    });
                    rtf += scenes.join('\n' + getSeparatorText('rtf') + '\n') + `\n`;
                }
            });

            const rootFiles = docs.filter(d => d.folderId === null);
            if (rootFiles.length > 0) {
                if (includeFolderNames) {
                    rtf += `\\page \\pard\\qc\\f0\\fs36\\b Uncategorized\\b0\\par\\par\n`;
                }
                let scenes = [];
                rootFiles.forEach((doc, idx) => {
                    let sceneText = '';
                    if (includeDocTitles) {
                        sceneText += `\\page \\pard\\qc\\f0\\fs28\\b ${doc.title}\\b0\\par\\par\n`;
                    }
                    sceneText += convertHtmlToRtf(doc.content, true);
                    scenes.push(sceneText);
                });
                rtf += scenes.join('\n' + getSeparatorText('rtf') + '\n') + `\n`;
            }

            rtf += `}`;
            blobContent = rtf;
            contentType = 'application/rtf';
        } else if (format === 'docx' || format === 'doc') {
            let ornamentHtml = '';
            if (titleOrnament === 'quill') {
                ornamentHtml = `<div class="title-ornament ornament-quill" style="margin: 20px 0; font-size: 22pt; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-feather"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg></div>`;
            } else if (titleOrnament === 'star') {
                ornamentHtml = `<div class="title-ornament ornament-star" style="margin: 20px 0; font-size: 22pt; text-align: center; color: #666;">✦</div>`;
            } else if (titleOrnament === 'flourish') {
                ornamentHtml = `<div class="title-ornament ornament-flourish" style="margin: 20px 0; font-size: 22pt; text-align: center; color: #4f46e5; font-family: Georgia, serif;">❧ ❦ ☙</div>`;
            }

            const cleanDocxContent = (html) => {
                if (!html) return '';
                let text = html;
                text = text.replace(/<span class="grammar-error[^>]*>(.*?)<\/span>/gi, '$1');
                text = text.replace(/<span style="white-space:\s*pre;?">\s*<\/span>/gi, '');
                text = text.replace(/(<[a-z0-9]+[^>]*)\s+style="[^"]*"/gi, '$1');
                text = text.replace(/<font[^>]*>/gi, '');
                text = text.replace(/<\/font>/gi, '');
                return text.trim();
            };

            const applyDocxDropCap = (htmlStr) => {
                if (!htmlStr) return '';
                let text = cleanDocxContent(htmlStr);

                if (!text.startsWith('<p') && !text.startsWith('<div')) {
                    text = `<p>${text.replace(/\n\n+/g, '</p><p>')}</p>`;
                }

                if (!dropCaps) return text;

                let i = 0;
                let letterIndex = -1;
                let punctuationStart = -1;

                while (i < text.length) {
                    if (text[i] === '<') {
                        const closeTag = text.indexOf('>', i);
                        if (closeTag === -1) break;
                        i = closeTag + 1;
                    } else if (text[i] === '&') {
                        const closeEntity = text.indexOf(';', i);
                        if (closeEntity === -1) break;
                        i = closeEntity + 1;
                    } else if (/\s/.test(text[i])) {
                        i++;
                    } else {
                        const char = text[i];
                        if (/[a-zA-Z0-9]/.test(char)) {
                            letterIndex = i;
                            break;
                        } else if (/[\u201C\u201D\u2018\u2019"'«»‘’“”]/.test(char)) {
                            if (punctuationStart === -1) {
                                punctuationStart = i;
                            }
                            i++;
                        } else {
                            break;
                        }
                    }
                }

                if (letterIndex !== -1) {
                    const startIdx = punctuationStart !== -1 ? punctuationStart : letterIndex;
                    const dropCapContent = text.slice(startIdx, letterIndex + 1);
                    return text.slice(0, startIdx) + `<span class="drop-cap">${dropCapContent}</span>` + text.slice(letterIndex + 1);
                }
                return text;
            };

            // Calculate TOC and page numbers dynamically
            let tocItemsHtml = '';
            let currentNumber = 1;
            const tocPagesNeeded = Math.ceil(docs.length / 20) || 1;
            let currentPage = 1 + 1 + tocPagesNeeded + 1; // start page of first chapter
            
            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded) {
                        nestedFiles.forEach(doc => {
                            let docWords = doc.content ? stripHtml(doc.content).split(/\s+/).filter(w => w.length > 0).length : 0;
                            let chapterPages = Math.max(1, Math.ceil(docWords / 280));
                            tocItemsHtml += `
                            <div style="display: flex; justify-content: space-between; font-size: 11pt; border-bottom: 1px dotted #ddd; margin-bottom: 6px;">
                                <span>${currentNumber} ${escapeXml(doc.title)}</span>
                                <span style="font-weight: bold;">${currentPage}</span>
                            </div>`;
                            currentPage += chapterPages;
                            currentNumber++;
                        });
                    }
                }
            });

            const rootFiles = docs.filter(d => d.folderId === null);
            if (rootFiles.length > 0) {
                rootFiles.forEach(doc => {
                    let docWords = doc.content ? stripHtml(doc.content).split(/\s+/).filter(w => w.length > 0).length : 0;
                    let chapterPages = Math.max(1, Math.ceil(docWords / 280));
                    tocItemsHtml += `
                    <div style="display: flex; justify-content: space-between; font-size: 11pt; border-bottom: 1px dotted #ddd; margin-bottom: 6px;">
                        <span>${escapeXml(doc.title)}</span>
                        <span style="font-weight: bold;">${currentPage}</span>
                    </div>`;
                    currentPage += chapterPages;
                });
            }

            let html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset="utf-8">
    <title>${bookName}</title>
    <style>
        body { 
            font-family: ${template === 'typewriter' ? "'Courier New', Courier, monospace" : (template === 'modern' ? "'Arial', sans-serif" : "'Times New Roman', serif")}; 
            font-size: 12pt; 
            line-height: ${template === 'typewriter' ? '2.0' : '1.5'}; 
        }
        .title-page { text-align: center; margin-top: 100pt; page-break-after: always; }
        .copyright-page { text-align: center; margin-top: 150pt; page-break-after: always; font-size: 10pt; line-height: 1.6; }
        .toc-page { margin-top: 100pt; page-break-after: always; }
        h1 { 
            font-family: ${template === 'romance' ? "'Times New Roman', serif" : "Arial, sans-serif"}; 
            font-size: 28pt; 
            font-weight: bold; 
            text-align: center; 
            font-style: ${template === 'romance' ? 'italic' : 'normal'};
        }
        .author { font-size: 16pt; text-align: center; margin-top: 20pt; }
        h2 { 
            font-family: Arial, sans-serif; 
            font-size: 18pt; 
            font-weight: bold; 
            margin-top: 24pt; 
            margin-bottom: 12pt; 
            text-align: ${template === 'modern' || template === 'zen' ? 'left' : 'center'};
        }
        .folder-break { page-break-before: always; }
        h3 { 
            font-family: Arial, sans-serif; 
            font-size: 14pt; 
            font-weight: bold; 
            margin-top: 18pt; 
            margin-bottom: 6pt; 
            page-break-before: always;
            text-align: ${template === 'modern' || template === 'zen' ? 'left' : 'center'};
        }
        p { 
            margin-top: 0; 
            margin-bottom: ${template === 'zen' ? '12pt' : '0'}; 
            text-indent: ${template === 'zen' ? '0' : '36pt'}; 
            text-align: ${template === 'zen' || template === 'typewriter' ? 'left' : 'justify'}; 
        }
        p:first-of-type { text-indent: 0; }
        .divider { text-align: center; margin: 24pt 0; font-size: 14pt; color: #888; letter-spacing: 5px; }
        .drop-cap {
            font-size: 32pt;
            font-weight: bold;
            float: left;
            margin-right: 6pt;
            color: ${template === 'romance' ? '#4f46e5' : '#000'};
            font-family: inherit;
        }
    </style>
</head>
<body>
    <div class="title-page">
        <div class="author" style="font-size: 14pt; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 120pt;">${author}</div>
        <h1>${bookName}</h1>
        ${ornamentHtml}
    </div>
    
    <div class="copyright-page">
        <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt;">Copyright &copy; ${new Date().getFullYear()} by ${author}</p>
        <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt; max-width: 4.5in; margin-left: auto; margin-right: auto; font-size: 9pt; color: #333;">
            All rights reserved. No part of this publication may be reproduced, stored, or transmitted in any form or by any means, electronic, mechanical, photocopying, recording, scanning, or otherwise without written permission from the publisher. It is illegal to copy this book, post it to a website, or distribute it by any other means without permission.
        </p>
        <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt;">First edition</p>
        <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt; color: #555; font-size: 9pt;">
            This book was professionally typeset on Meridian.<br/>
            Find out more at meridian.com
        </p>
    </div>
    
    <div class="toc-page">
        <h2 style="text-align: center; font-size: 22pt; margin-bottom: 40pt; font-weight: normal; font-family: inherit;">Contents</h2>
        <div class="toc-list" style="max-width: 4in; margin: 0 auto; line-height: 2;">
            ${tocItemsHtml}
        </div>
    </div>`;

            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded && includeFolderNames) {
                        let folderClass = pageBreaksFolders ? 'class="folder-break"' : '';
                        html += `<h2 ${folderClass}>${folder.name}</h2>`;
                    }
                    let scenes = [];
                    nestedFiles.forEach((doc, idx) => {
                        let sceneText = '';
                        if (includeDocTitles) {
                            sceneText += `<h3 style="page-break-before: always;">${doc.title}</h3>\n`;
                        }
                        const processedContent = applyDocxDropCap(doc.content);
                        sceneText += `<div>${processedContent}</div>\n`;
                        scenes.push(sceneText);
                    });
                    html += scenes.join(getSeparatorText('docx'));
                }
            });

            if (rootFiles.length > 0) {
                if (includeFolderNames) {
                    html += `<h2>Uncategorized</h2>`;
                }
                let scenes = [];
                rootFiles.forEach((doc, idx) => {
                    let sceneText = '';
                    if (includeDocTitles) {
                        sceneText += `<h3 style="page-break-before: always;">${doc.title}</h3>\n`;
                    }
                    const processedContent = applyDocxDropCap(doc.content);
                    sceneText += `<div>${processedContent}</div>\n`;
                    scenes.push(sceneText);
                });
                html += scenes.join(getSeparatorText('docx'));
            }

            html += `</body>\n</html>`;

            if (typeof JSZip === 'undefined') {
                alert("JSZip library failed to load. Please check your internet connection.");
                return;
            }

            const zip = new JSZip();

            zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="html" ContentType="text/html"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

            zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

            zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="htmlDoc.html"/>
</Relationships>`);

            zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:altChunk r:id="htmlChunk"/>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);

            zip.folder("word").file("htmlDoc.html", html);

            zip.generateAsync({ type: "blob" }).then(function (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${safeTitle || 'manuscript'}.${format}`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }).catch(err => {
                console.error("DOCX compile failed", err);
                alert("Failed to compile DOCX: " + err.message);
            });
            return;
        } else if (format === 'pdf') {
            const template = options.template || 'classic';
            const trimSize = options.trimSize || 'letter';
            const dropCaps = !!options.dropCaps;
            const runningHeaders = options.runningHeaders || 'none';
            const titleOrnament = options.titleOrnament || 'none';

            const cleanPdfContent = (html) => {
                if (!html) return '';
                let text = html;
                text = text.replace(/<span class="grammar-error[^>]*>(.*?)<\/span>/gi, '$1');
                text = text.replace(/<span style="white-space:\s*pre;?">\s*<\/span>/gi, '');
                text = text.replace(/(<[a-z0-9]+[^>]*)\s+style="[^"]*"/gi, '$1');
                text = text.replace(/<font[^>]*>/gi, '');
                text = text.replace(/<\/font>/gi, '');
                return text.trim();
            };

            const applyDropCap = (htmlStr) => {
                if (!htmlStr) return '';
                let text = cleanPdfContent(htmlStr);

                if (!text.startsWith('<p') && !text.startsWith('<div')) {
                    text = `<p>${text.replace(/\n\n+/g, '</p><p>')}</p>`;
                }

                if (!dropCaps) return text;

                let i = 0;
                let letterIndex = -1;
                let punctuationStart = -1;

                while (i < text.length) {
                    if (text[i] === '<') {
                        const closeTag = text.indexOf('>', i);
                        if (closeTag === -1) break;
                        i = closeTag + 1;
                    } else if (text[i] === '&') {
                        const closeEntity = text.indexOf(';', i);
                        if (closeEntity === -1) break;
                        i = closeEntity + 1;
                    } else if (/\s/.test(text[i])) {
                        i++;
                    } else {
                        const char = text[i];
                        if (/[a-zA-Z0-9]/.test(char)) {
                            letterIndex = i;
                            break;
                        } else if (/[\u201C\u201D\u2018\u2019"'«»‘’“”]/.test(char)) {
                            if (punctuationStart === -1) {
                                punctuationStart = i;
                            }
                            i++;
                        } else {
                            break;
                        }
                    }
                }

                if (letterIndex !== -1) {
                    const startIdx = punctuationStart !== -1 ? punctuationStart : letterIndex;
                    const dropCapContent = text.slice(startIdx, letterIndex + 1);
                    let formattedDropCap = dropCapContent;
                    if (/[\u201C\u201D\u2018\u2019"'«»‘’“”]/.test(dropCapContent.charAt(0))) {
                        formattedDropCap = `<span class="drop-quote">${dropCapContent.charAt(0)}</span>${dropCapContent.slice(1)}`;
                    }
                    return text.slice(0, startIdx) + `<span class="drop-cap">${formattedDropCap}</span>` + text.slice(letterIndex + 1);
                }
                return text;
            };

            let ornamentHtml = '';
            if (titleOrnament === 'quill') {
                ornamentHtml = `<div class="title-ornament ornament-quill"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-feather"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg></div>`;
            } else if (titleOrnament === 'star') {
                ornamentHtml = `<div class="title-ornament ornament-star">✦</div>`;
            } else if (titleOrnament === 'flourish') {
                ornamentHtml = `<div class="title-ornament ornament-flourish">❧ ❦ ☙</div>`;
            }

            // Calculate TOC and page numbers dynamically
            let tocItemsHtml = '';
            let currentNumber = 1;
            const tocPagesNeeded = Math.ceil(docs.length / 20) || 1;
            let currentPage = 1 + 1 + tocPagesNeeded + 1; // start page of first chapter
            
            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded) {
                        nestedFiles.forEach(doc => {
                            let docWords = doc.content ? stripHtml(doc.content).split(/\s+/).filter(w => w.length > 0).length : 0;
                            let chapterPages = Math.max(1, Math.ceil(docWords / 280));
                            tocItemsHtml += `
                            <div class="toc-item" style="display: flex; justify-content: space-between; font-size: 11pt; border-bottom: 1px dotted #ddd; margin-bottom: 6px; font-family: inherit;">
                                <span style="background: white; padding-right: 5px;">${currentNumber} ${escapeXml(doc.title)}</span>
                                <span style="background: white; padding-left: 5px; font-weight: bold;">${currentPage}</span>
                            </div>`;
                            currentPage += chapterPages;
                            currentNumber++;
                        });
                    }
                }
            });

            const rootFiles = docs.filter(d => d.folderId === null);
            if (rootFiles.length > 0) {
                rootFiles.forEach(doc => {
                    let docWords = doc.content ? stripHtml(doc.content).split(/\s+/).filter(w => w.length > 0).length : 0;
                    let chapterPages = Math.max(1, Math.ceil(docWords / 280));
                    tocItemsHtml += `
                    <div class="toc-item" style="display: flex; justify-content: space-between; font-size: 11pt; border-bottom: 1px dotted #ddd; margin-bottom: 6px; font-family: inherit;">
                        <span style="background: white; padding-right: 5px;">${escapeXml(doc.title)}</span>
                        <span style="background: white; padding-left: 5px; font-weight: bold;">${currentPage}</span>
                    </div>`;
                    currentPage += chapterPages;
                });
            }

            let html = `
<div class="title-page">
    <div class="author" style="font-size: 14pt; text-transform: uppercase; letter-spacing: 2px; margin-top: 1.5in; margin-bottom: 1.2in;">${author}</div>
    <h1>${bookName}</h1>
    ${ornamentHtml}
</div>

<div class="copyright-page" style="page-break-before: always; page-break-after: always; display: block; text-align: center; font-size: 10pt; line-height: 1.6; background: white; position: relative; z-index: 200; padding-top: 2in; box-sizing: border-box; min-height: 90vh;">
    <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt;">Copyright &copy; ${new Date().getFullYear()} by ${author}</p>
    <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt; max-width: 4.5in; margin-left: auto; margin-right: auto; font-size: 9pt; color: #333;">
        All rights reserved. No part of this publication may be reproduced, stored, or transmitted in any form or by any means, electronic, mechanical, photocopying, recording, scanning, or otherwise without written permission from the publisher. It is illegal to copy this book, post it to a website, or distribute it by any other means without permission.
    </p>
    <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt;">First edition</p>
    <p style="text-indent: 0 !important; text-align: center; margin-bottom: 24pt; color: #555; font-size: 9pt;">
        This book was professionally typeset on Meridian.<br/>
        Find out more at <a href="https://namle5696.gumroad.com/l/zmdin" style="color: #4f46e5; text-decoration: none;">meridian.com</a>
    </p>
</div>

<div class="toc-page" style="page-break-before: always; page-break-after: always; display: block; background: white; position: relative; z-index: 200; padding-top: 1.5in; box-sizing: border-box; min-height: 90vh;">
    <h2 style="text-align: center; font-size: 22pt; margin-bottom: 40pt; font-weight: normal; font-family: inherit;">Contents</h2>
    <div class="toc-list" style="max-width: 4in; margin: 0 auto; line-height: 2;">
        ${tocItemsHtml}
    </div>
</div>`;

            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded && includeFolderNames) {
                        let headerClass = pageBreaksFolders ? 'pdf-folder-header' : 'pdf-folder-header-nobreak';
                        html += `<div class="${headerClass}">${folder.name}</div>`;
                    }
                    let scenes = [];
                    nestedFiles.forEach((doc, idx) => {
                        let avoidBreakStyle = (idx === 0) ? 'style="page-break-before: avoid;"' : '';
                        let sceneText = `<div class="pdf-chapter-container" ${avoidBreakStyle}>`;
                        if (includeDocTitles) {
                            sceneText += `<div class="pdf-doc-header">${doc.title}</div>`;
                        }
                        const processedContent = applyDropCap(doc.content);
                        sceneText += `<div class="pdf-content">${processedContent}</div>`;
                        sceneText += '</div>';
                        scenes.push(sceneText);
                    });
                    html += scenes.join('');
                }
            });

            if (rootFiles.length > 0) {
                if (includeFolderNames) {
                    html += `<div class="pdf-folder-header-nobreak">Uncategorized</div>`;
                }
                let scenes = [];
                rootFiles.forEach((doc, idx) => {
                    let sceneText = '<div class="pdf-chapter-container">';
                    if (includeDocTitles) {
                        sceneText += `<div class="pdf-doc-header">${doc.title}</div>`;
                    }
                    const processedContent = applyDropCap(doc.content);
                    sceneText += `<div class="pdf-content">${processedContent}</div>`;
                    sceneText += '</div>';
                    scenes.push(sceneText);
                });
                html += scenes.join('');
            }

            const printContainer = document.getElementById('print-manuscript-container');
            printContainer.className = `print-only pdf-template-${template} pdf-trim-${trimSize} pdf-headers-${runningHeaders}`;
            printContainer.innerHTML = html;

            // Dynamically inject trim size page style
            let sizeStr = 'letter';
            let marginStr = '1.25in';
            if (trimSize === 'trade') {
                sizeStr = '6in 9in';
                marginStr = '0.85in';
            } else if (trimSize === 'digest') {
                sizeStr = '5.5in 8.5in';
                marginStr = '0.8in';
            } else if (trimSize === 'pocket') {
                sizeStr = '4.25in 6.87in';
                marginStr = '0.6in';
            }

            const tempPrintStyle = document.createElement('style');
            tempPrintStyle.id = 'temp-pdf-print-size-style';
            tempPrintStyle.innerHTML = `
                @page { size: ${sizeStr}; margin: ${marginStr}; }
                @page front-matter { size: ${sizeStr}; margin: 0; }
                .title-page, .copyright-page, .toc-page { page: front-matter; padding: 1.5in 1.0in 1.0in 1.0in; box-sizing: border-box; }
                .pdf-chapter-container, .pdf-folder-header, .pdf-folder-header-nobreak { page: chapter-page; }
            `;
            document.head.appendChild(tempPrintStyle);

            if (window.FS.printCleanupTimeout) {
                clearTimeout(window.FS.printCleanupTimeout);
                window.FS.printCleanupTimeout = null;
            }
            if (window.FS.printFallbackTimeout) {
                clearTimeout(window.FS.printFallbackTimeout);
                window.FS.printFallbackTimeout = null;
            }

            let headerTemplate = '<div></div>';
            let footerTemplate = '<div></div>';
            let displayHeaderFooter = false;
            let margins = { marginType: 'none' };

            if (runningHeaders === 'classic') {
                displayHeaderFooter = true;
                headerTemplate = `<div style="font-size: 8pt; font-family: 'Times New Roman', Georgia, serif; text-align: center; width: 100%; text-transform: uppercase; letter-spacing: 1px; color: #777; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 0 1in;">${escapeXml(bookName)}</div>`;
                footerTemplate = `<div style="font-size: 9pt; font-family: 'Times New Roman', Georgia, serif; text-align: center; width: 100%; color: #333; margin-bottom: 5px;"><span class="pageNumber"></span></div>`;
                margins = {
                    marginType: 'custom',
                    top: '1.2in',
                    bottom: '1.2in',
                    left: '1.0in',
                    right: '1.0in'
                };
            }

            if (window.electronAPI && window.electronAPI.printToPDF) {
                setTimeout(async () => {
                    try {
                        await window.electronAPI.printToPDF({ 
                            filename: filename,
                            displayHeaderFooter: displayHeaderFooter,
                            headerTemplate: headerTemplate,
                            footerTemplate: footerTemplate,
                            margins: margins
                        });
                    } catch (err) {
                        console.error('Direct PDF export failed:', err);
                        alert('Failed to export PDF: ' + err.message);
                    } finally {
                        printContainer.innerHTML = '';
                        const tempStyle = document.getElementById('temp-pdf-print-size-style');
                        if (tempStyle) tempStyle.remove();
                    }
                }, 100);
            } else {
                const cleanupPrint = () => {
                    window.removeEventListener('afterprint', cleanupPrint);
                    if (window.FS.printFallbackTimeout) {
                        clearTimeout(window.FS.printFallbackTimeout);
                        window.FS.printFallbackTimeout = null;
                    }

                    window.FS.printCleanupTimeout = setTimeout(() => {
                        printContainer.innerHTML = '';
                        const tempStyle = document.getElementById('temp-pdf-print-size-style');
                        if (tempStyle) tempStyle.remove();
                        window.FS.printCleanupTimeout = null;
                    }, 300000);
                };
                window.addEventListener('afterprint', cleanupPrint);
                window.print();

                // Fallback timeout in case afterprint event is not supported/fired
                window.FS.printFallbackTimeout = setTimeout(cleanupPrint, 300000);
            }
            return;
        } else if (format === 'epub') {
            if (typeof JSZip === 'undefined') {
                alert("JSZip library failed to load. Please check your internet connection.");
                return;
            }

            const zip = new JSZip();
            zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

            zip.folder("META-INF").file("container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`);

            const oebps = zip.folder("OEBPS");

            // Generate stylesheet matching selected template
            oebps.file("stylesheet.css", `body { 
    font-family: ${template === 'typewriter' ? "'Courier New', Courier, monospace" : (template === 'modern' ? "'Helvetica Neue', Arial, sans-serif" : "Georgia, serif")}; 
    padding: 5%; 
    line-height: ${template === 'typewriter' ? '1.8' : '1.5'};
}
h1 { text-align: center; font-size: 1.8em; margin-bottom: 1em; }
h2 { 
    text-align: ${template === 'modern' || template === 'zen' ? 'left' : 'center'}; 
    font-size: 1.4em; 
    margin-top: 1.5em; 
    margin-bottom: 1em; 
}
h3 { 
    font-size: 1.2em; 
    margin-top: 1.2em; 
    margin-bottom: 0.5em; 
    page-break-before: always;
    text-align: ${template === 'modern' || template === 'zen' ? 'left' : 'center'};
    font-style: ${template === 'classic' || template === 'romance' ? 'italic' : 'normal'};
}
p { 
    margin-top: 0;
    margin-bottom: ${template === 'zen' ? '1em' : '0'}; 
    text-indent: ${template === 'zen' || template === 'typewriter' ? '0' : '1.5em'}; 
    text-align: ${template === 'zen' || template === 'typewriter' ? 'left' : 'justify'}; 
}
p:first-of-type { text-indent: 0; }
.divider { text-align: center; margin: 1.5em 0; font-size: 1.2em; color: #777; letter-spacing: 5px; }
.drop-cap {
    float: left;
    font-size: 3em;
    line-height: 0.85;
    margin-top: 0.05em;
    margin-right: 0.1em;
    font-weight: bold;
    color: ${template === 'romance' ? '#4f46e5' : 'inherit'};
    font-family: ${template === 'romance' ? "'Playfair Display', Georgia, serif" : 'inherit'};
}`);

            let manifestItems = [];
            let spineItems = [];
            let navPoints = [
                `<navPoint id="copyright" playOrder="1">
                    <navLabel><text>Copyright</text></navLabel>
                    <content src="copyright.xhtml"/>
                </navPoint>`,
                `<navPoint id="toc" playOrder="2">
                    <navLabel><text>Contents</text></navLabel>
                    <content src="toc.xhtml"/>
                </navPoint>`
            ];
            let chapterIndex = 3;

            let ornamentHtml = '';
            if (titleOrnament === 'quill') {
                ornamentHtml = `<p style="text-indent: 0; text-align: center; font-size: 20pt; margin: 20px 0;">✒</p>`;
            } else if (titleOrnament === 'star') {
                ornamentHtml = `<p style="text-indent: 0; text-align: center; font-size: 20pt; margin: 20px 0;">✦</p>`;
            } else if (titleOrnament === 'flourish') {
                ornamentHtml = `<p style="text-indent: 0; text-align: center; font-size: 20pt; margin: 20px 0; color: #4f46e5;">❧ ❦ ☙</p>`;
            }

            oebps.file("title.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeXml(bookName)}</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
</head>
<body>
    <div style="text-align: center; margin-top: 25%;">
        <h1 style="${template === 'romance' ? "font-family: 'Playfair Display', Georgia, serif; font-style: italic;" : ''}">${escapeXml(bookName)}</h1>
        ${ornamentHtml}
        <p style="text-indent: 0; text-align: center; font-size: 1.2em;">by ${escapeXml(author)}</p>
        <p style="text-indent: 0; font-style: italic; text-align: center; margin-top: 50px;">Compiled EPUB Manuscript</p>
    </div>
</body>
</html>`);
            manifestItems.push(`<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`);
            spineItems.push(`<itemref idref="title"/>`);

            // Add copyright.xhtml
            oebps.file("copyright.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Copyright</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
</head>
<body>
    <div style="text-align: center; margin-top: 20%; font-size: 0.9em; line-height: 1.6;">
        <p style="text-indent: 0; text-align: center;">Copyright &copy; ${new Date().getFullYear()} by ${escapeXml(author)}</p>
        <p style="text-indent: 0; text-align: center; margin-top: 20px; margin-bottom: 20px; padding: 0 10%;">
            All rights reserved. No part of this publication may be reproduced, stored, or transmitted in any form or by any means, electronic, mechanical, photocopying, recording, scanning, or otherwise without written permission from the publisher. It is illegal to copy this book, post it to a website, or distribute it by any other means without permission.
        </p>
        <p style="text-indent: 0; text-align: center;">First edition</p>
        <p style="text-indent: 0; text-align: center; margin-top: 30px; color: #555;">
            This book was professionally typeset on Meridian.<br/>
            Find out more at meridian.com
        </p>
    </div>
</body>
</html>`);
            manifestItems.push(`<item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>`);
            spineItems.push(`<itemref idref="copyright"/>`);

            // Add toc.xhtml
            let epubTocHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Contents</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
</head>
<body>
    <div style="padding: 5%;">
        <h1 style="text-align: center; font-size: 1.6em; margin-bottom: 1.5em;">Contents</h1>
        <div style="max-width: 80%; margin: 0 auto; line-height: 1.8;">`;
            
            let epubChapterIdx = 3;
            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded) {
                        if (pageBreaksFolders) {
                            epubTocHtml += `<p style="text-indent: 0; font-weight: bold; margin-top: 10px;"><a href="chap_${epubChapterIdx}.xhtml" style="text-decoration: none; color: inherit;">${escapeXml(folder.name)}</a></p>\n`;
                            epubChapterIdx++;
                        }
                        nestedFiles.forEach(doc => {
                            epubTocHtml += `<p style="text-indent: 1.5em; margin-bottom: 4px;"><a href="chap_${epubChapterIdx}.xhtml" style="text-decoration: none; color: inherit;">${escapeXml(doc.title)}</a></p>\n`;
                            epubChapterIdx++;
                        });
                    }
                }
            });
            
            epubTocHtml += `
        </div>
    </div>
</body>
</html>`;

            oebps.file("toc.xhtml", epubTocHtml);
            manifestItems.push(`<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>`);
            spineItems.push(`<itemref idref="toc"/>`);

            folders.forEach(folder => {
                let nestedFiles = docs.filter(d => d.folderId === folder.id);
                if (nestedFiles.length > 0) {
                    const isFolderExcluded = exclusions.includes(folder.id);
                    if (!isFolderExcluded && pageBreaksFolders) {
                        const id = `chap_${chapterIndex}`;
                        const folderFilename = `chap_${chapterIndex}.xhtml`;

                        let folderHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeXml(folder.name)}</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
</head>
<body>
    <div style="text-align: center; margin-top: 35%;">
        <h2>${escapeXml(folder.name)}</h2>
    </div>
</body>
</html>`;

                        oebps.file(folderFilename, folderHtml);
                        manifestItems.push(`<item id="${id}" href="${folderFilename}" media-type="application/xhtml+xml"/>`);
                        spineItems.push(`<itemref idref="${id}"/>`);
                        navPoints.push(`<navPoint id="${id}" playOrder="${chapterIndex}">
                            <navLabel><text>${escapeXml(folder.name)}</text></navLabel>
                            <content src="${folderFilename}"/>
                        </navPoint>`);
                        chapterIndex++;
                    }

                    nestedFiles.forEach((doc, idx) => {
                        const id = `chap_${chapterIndex}`;
                        const docFilename = `chap_${chapterIndex}.xhtml`;

                        let docHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeXml(doc.title)}</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
</head>
<body>\n`;

                        if (!isFolderExcluded && !pageBreaksFolders && idx === 0 && includeFolderNames) {
                            docHtml += `<h2>${escapeXml(folder.name)}</h2>\n`;
                        }
                        if (includeDocTitles) {
                            docHtml += `<h3>${escapeXml(doc.title)}</h3>\n`;
                        }
                        const processedContent = (idx === 0) ? applyDropCap(doc.content) : doc.content;
                        docHtml += `${cleanXhtml(processedContent)}\n`;
                        docHtml += `</body>\n</html>`;

                        oebps.file(docFilename, docHtml);
                        manifestItems.push(`<item id="${id}" href="${docFilename}" media-type="application/xhtml+xml"/>`);
                        spineItems.push(`<itemref idref="${id}"/>`);
                        navPoints.push(`<navPoint id="${id}" playOrder="${chapterIndex}">
                            <navLabel><text>${!isFolderExcluded && !pageBreaksFolders && idx === 0 ? escapeXml(folder.name) + ' - ' : ''}${escapeXml(doc.title)}</text></navLabel>
                            <content src="${docFilename}"/>
                        </navPoint>`);
                        chapterIndex++;
                    });
                }
            });

            const rootFiles = docs.filter(d => d.folderId === null);
            if (rootFiles.length > 0) {
                rootFiles.forEach((doc, idx) => {
                    const id = `chap_${chapterIndex}`;
                    const docFilename = `chap_${chapterIndex}.xhtml`;

                    let docHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeXml(doc.title)}</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
</head>
<body>\n`;
                    if (includeDocTitles) {
                        docHtml += `<h2>${escapeXml(doc.title)}</h2>\n`;
                    }
                    const processedContent = (idx === 0) ? applyDropCap(doc.content) : doc.content;
                    docHtml += `${cleanXhtml(processedContent)}\n`;
                    docHtml += `</body>\n</html>`;

                    oebps.file(docFilename, docHtml);
                    manifestItems.push(`<item id="${id}" href="${docFilename}" media-type="application/xhtml+xml"/>`);
                    spineItems.push(`<itemref idref="${id}"/>`);
                    navPoints.push(`<navPoint id="${id}" playOrder="${chapterIndex}">
                        <navLabel><text>${escapeXml(doc.title)}</text></navLabel>
                        <content src="${docFilename}"/>
                    </navPoint>`);
                    chapterIndex++;
                });
            }

            oebps.file("toc.ncx", `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:flowstate-epub-${Date.now()}"/>
    </head>
    <docTitle><text>${escapeXml(bookName)}</text></docTitle>
    <navMap>
        ${navPoints.join("\n        ")}
    </navMap>
</ncx>`);

            oebps.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>${escapeXml(bookName)}</dc:title>
        <dc:identifier id="BookID">urn:uuid:flowstate-epub-${Date.now()}</dc:identifier>
        <dc:language>en</dc:language>
        <dc:creator opf:role="aut">${escapeXml(author)}</dc:creator>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="css" href="stylesheet.css" media-type="text/css"/>
        ${manifestItems.join("\n        ")}
    </manifest>
    <spine toc="ncx">
        ${spineItems.join("\n        ")}
    </spine>
</package>`);

            zip.generateAsync({ type: "blob" }).then(function (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${safeTitle || 'manuscript'}.epub`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            });
            return;
        }

        const blob = new Blob([blobContent], { type: `${contentType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}, 100);
    },

backupBook: function() {
    if (!window.FS.state.activeWorkspaceId) return;

    const workspaces = this.getWorkspaces();
    const ws = workspaces.find(w => w.id === window.FS.state.activeWorkspaceId);
    if (!ws) return;

    const folders = window.FS.storage.getFoldersFromStorage();
    const docs = window.FS.storage.getDocumentsFromStorage();

    const backupData = {
        version: 1,
        workspace: ws,
        folders: folders,
        documents: docs
    };

    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ws.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.fsb`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
},

importBook: function(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.workspace || !data.folders || !data.documents) {
                throw new Error("Invalid backup format");
            }

            // Add or update workspace in the list
            let workspaces = this.getWorkspaces();
            const existingIndex = workspaces.findIndex(w => w.id === data.workspace.id);
            if (existingIndex >= 0) {
                workspaces[existingIndex] = data.workspace;
            } else {
                workspaces.push(data.workspace);
            }
            this.saveWorkspaces(workspaces);

            // Save folders and documents
            localStorage.setItem(`flowstate_folders_${data.workspace.id}`, JSON.stringify(data.folders));
            localStorage.setItem(`flowstate_documents_${data.workspace.id}`, JSON.stringify(data.documents));

            // Open it
            this.openWorkspace(data.workspace.id);

            // Refresh list if on home view
            if (document.getElementById('view-home').classList.contains('active')) {
                this.renderWorkspacesList();
            }
        } catch (err) {
            alert("Failed to import book: " + err.message);
        }
    };
    reader.readAsText(file);
}
};

