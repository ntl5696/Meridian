window.FS.editor = window.FS.editor || {};

// Private helper functions for XML escaping and XHTML cleaning
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

const generateDocxBlob = (title, htmlContent) => {
    if (typeof JSZip === 'undefined') {
        throw new Error("JSZip library is not loaded.");
    }
    const zip = new JSZip();
    
    // 1. [Content_Types].xml
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="html" ContentType="text/html"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    // 2. _rels/.rels
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    // 3. word/_rels/document.xml.rels
    zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="htmlDoc.html"/>
</Relationships>`);

    // 4. word/document.xml
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

    // 5. word/htmlDoc.html
    const documentHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
        p { margin-bottom: 12pt; text-indent: 36pt; }
        p:first-of-type { text-indent: 0; }
        h1 { font-family: Arial, sans-serif; font-size: 24pt; font-weight: bold; text-align: center; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div>${htmlContent}</div>
</body>
</html>`;
    
    zip.folder("word").file("htmlDoc.html", documentHtml);
    
    return zip.generateAsync({ type: "blob" });
};


window.FS.editor.downloadSessionText = function (format) {
    if (!window.FS.state.sessionText) return;

    const docs = window.FS.storage.getDocumentsFromStorage();
    const doc = docs.find(d => d.id === window.FS.state.activeDocId);
    const titleText = doc ? doc.title : 'untitled';

    const safeTitle = titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filename = `${safeTitle || 'flow-writing'}.${format}`;

    let blobContent = '';
    let contentType = 'text/plain';

    if (format === 'md') {
        const dateStr = new Date().toISOString();
        blobContent = `---
title: "${titleText}"
date: ${dateStr}
words: ${window.FS.state.wordsCount}
duration: ${window.FS.state.timeElapsed}s
avg_wpm: ${window.FS.state.averageWpm}
mode: ${window.FS.state.sessionMode}
---

${window.FS.state.sessionText}
`;
        contentType = 'text/markdown';
    } else if (format === 'txt') {
        const plainText = window.FS.state.sessionText.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
        blobContent = plainText;
        contentType = 'text/plain';
    } else if (format === 'html') {
        blobContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${titleText}</title>
    <style>
        body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 50px auto; padding: 20px; color: #333; }
        h1 { text-align: center; }
        p { margin-bottom: 1.2em; text-indent: 2em; }
        p:first-of-type { text-indent: 0; }
    </style>
</head>
<body>
    <h1>${titleText}</h1>
    <div>${window.FS.state.sessionText}</div>
</body>
</html>`;
        contentType = 'text/html';
    } else if (format === 'rtf') {
        let rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\froman\\fcharset0 Georgia;}{\\f1\\fswiss\\fcharset0 Arial;}}\n`;
        rtf += `\\paperw11906\\paperh16838\\margl1440\\margr1440\\margt1440\\margb1440\n`;
        rtf += `\\ql\\f1\\fs36\\b ${titleText}\\b0\\par\\par\n`;
        
        let txt = window.FS.state.sessionText;
        txt = txt.replace(/<b>/gi, '\\b ').replace(/<\/b>/gi, '\\b0 ');
        txt = txt.replace(/<strong>/gi, '\\b ').replace(/<\/strong>/gi, '\\b0 ');
        txt = txt.replace(/<i>/gi, '\\i ').replace(/<\/i>/gi, '\\i0 ');
        txt = txt.replace(/<em>/gi, '\\i ').replace(/<\/em>/gi, '\\i0 ');
        txt = txt.replace(/<p>/gi, '').replace(/<\/p>/gi, '\\par\\par ');
        txt = txt.replace(/<br\s*\/?>/gi, '\\par ');
        txt = txt.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
        
        rtf += txt + `}`;
        blobContent = rtf;
        contentType = 'application/rtf';
    } else if (format === 'docx' || format === 'doc') {
        if (typeof JSZip === 'undefined') {
            alert("JSZip library failed to load. Please check your internet connection.");
            return;
        }
        generateDocxBlob(titleText, window.FS.state.sessionText).then(function (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }).catch(err => {
            console.error("DOCX export failed", err);
            alert("Failed to export DOCX: " + err.message);
        });
        return;
    } else if (format === 'pdf') {
        const printContainer = document.getElementById('print-manuscript-container');
        printContainer.innerHTML = `<h1>${titleText}</h1><div>${window.FS.state.sessionText}</div>`;
        
        if (window.FS.printCleanupTimeout) {
            clearTimeout(window.FS.printCleanupTimeout);
            window.FS.printCleanupTimeout = null;
        }

        if (window.electronAPI && window.electronAPI.printToPDF) {
            setTimeout(async () => {
                try {
                    await window.electronAPI.printToPDF({ filename: filename });
                } catch (err) {
                    console.error('Direct PDF export failed:', err);
                    alert('Failed to export PDF: ' + err.message);
                } finally {
                    printContainer.innerHTML = '';
                }
            }, 100);
        } else {
            window.print();
            window.FS.printCleanupTimeout = setTimeout(() => {
                printContainer.innerHTML = '';
                window.FS.printCleanupTimeout = null;
            }, 300000);
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
        oebps.file("stylesheet.css", `body { font-family: Georgia, serif; padding: 5%; }
h1 { text-align: center; font-size: 1.8em; margin-bottom: 1em; }
p { margin-bottom: 0.8em; text-indent: 1.5em; line-height: 1.5; }`);

        oebps.file("content.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeXml(titleText)}</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
</head>
<body>
    <h1>${escapeXml(titleText)}</h1>
    ${cleanXhtml(window.FS.state.sessionText)}
</body>
</html>`);

        oebps.file("toc.ncx", `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:flowstate-epub-${Date.now()}"/>
    </head>
    <docTitle><text>${escapeXml(titleText)}</text></docTitle>
    <navMap>
        <navPoint id="content" playOrder="1">
            <navLabel><text>${escapeXml(titleText)}</text></navLabel>
            <content src="content.xhtml"/>
        </navPoint>
    </navMap>
</ncx>`);

        oebps.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>${escapeXml(titleText)}</dc:title>
        <dc:identifier id="BookID">urn:uuid:flowstate-epub-${Date.now()}</dc:identifier>
        <dc:language>en</dc:language>
        <dc:creator opf:role="aut">FlowState Writer</dc:creator>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="css" href="stylesheet.css" media-type="text/css"/>
        <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    </manifest>
    <spine toc="ncx">
        <itemref idref="content"/>
    </spine>
</package>`);

        zip.generateAsync({ type: "blob" }).then(function (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${safeTitle || 'flow-writing'}.epub`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        });
        return;
    }
};

window.FS.editor.downloadCurrentDocument = function (format) {
    if (!window.FS.state.activeDocId) return;

    const docs = window.FS.storage.getDocumentsFromStorage();
    const doc = docs.find(d => d.id === window.FS.state.activeDocId);
    if (!doc) return;

    const titleText = doc.title;
    const contentText = window.FS.dom.editorTextarea.innerHTML || '';

    const safeTitle = titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filename = `${safeTitle || 'document'}.${format}`;

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

    const convertHtmlToRtf = (html) => {
        if (!html) return '';
        let txt = html;
        txt = txt.replace(/<b>/gi, '\\b ').replace(/<\/b>/gi, '\\b0 ');
        txt = txt.replace(/<strong>/gi, '\\b ').replace(/<\/strong>/gi, '\\b0 ');
        txt = txt.replace(/<i>/gi, '\\i ').replace(/<\/i>/gi, '\\i0 ');
        txt = txt.replace(/<em>/gi, '\\i ').replace(/<\/em>/gi, '\\i0 ');
        txt = txt.replace(/<p>/gi, '').replace(/<\/p>/gi, '\\par\\par ');
        txt = txt.replace(/<br\s*\/?>/gi, '\\par ');
        txt = txt.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
        return txt;
    };

    if (format === 'md') {
        blobContent = `# ${titleText}\n\n${contentText}`;
        contentType = 'text/markdown';
    } else if (format === 'txt') {
        blobContent = stripHtml(contentText);
        contentType = 'text/plain';
    } else if (format === 'html') {
        blobContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${titleText}</title>
    <style>
        body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 50px auto; padding: 20px; color: #333; }
        h1 { text-align: center; }
        p { margin-bottom: 1.2em; text-indent: 2em; }
        p:first-of-type { text-indent: 0; }
    </style>
</head>
<body>
    <h1>${titleText}</h1>
    <div>${contentText}</div>
</body>
</html>`;
        contentType = 'text/html';
    } else if (format === 'rtf') {
        let rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\froman\\fcharset0 Georgia;}{\\f1\\fswiss\\fcharset0 Arial;}}\n`;
        rtf += `\\paperw11906\\paperh16838\\margl1440\\margr1440\\margt1440\\margb1440\n`;
        rtf += `\\ql\\f1\\fs36\\b ${titleText}\\b0\\par\\par\n`;
        rtf += convertHtmlToRtf(contentText) + `}`;
        blobContent = rtf;
        contentType = 'application/rtf';
    } else if (format === 'docx' || format === 'doc') {
        if (typeof JSZip === 'undefined') {
            alert("JSZip library failed to load. Please check your internet connection.");
            return;
        }
        generateDocxBlob(titleText, contentText).then(function (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }).catch(err => {
            console.error("DOCX export failed", err);
            alert("Failed to export DOCX: " + err.message);
        });
        return;
    } else if (format === 'pdf') {
        const printContainer = document.getElementById('print-manuscript-container');
        printContainer.innerHTML = `<h1>${titleText}</h1><div>${contentText}</div>`;
        
        if (window.FS.printCleanupTimeout) {
            clearTimeout(window.FS.printCleanupTimeout);
            window.FS.printCleanupTimeout = null;
        }

        if (window.electronAPI && window.electronAPI.printToPDF) {
            setTimeout(async () => {
                try {
                    await window.electronAPI.printToPDF({ filename: filename });
                } catch (err) {
                    console.error('Direct PDF export failed:', err);
                    alert('Failed to export PDF: ' + err.message);
                } finally {
                    printContainer.innerHTML = '';
                }
            }, 100);
        } else {
            window.print();
            window.FS.printCleanupTimeout = setTimeout(() => {
                printContainer.innerHTML = '';
                window.FS.printCleanupTimeout = null;
            }, 300000);
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
        oebps.file("stylesheet.css", `body { font-family: Georgia, serif; padding: 5%; }
h1 { text-align: center; font-size: 1.8em; margin-bottom: 1em; }
p { margin-bottom: 0.8em; text-indent: 1.5em; line-height: 1.5; }`);

        oebps.file("content.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeXml(titleText)}</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
</head>
<body>
    <h1>${escapeXml(titleText)}</h1>
    ${cleanXhtml(contentText)}
</body>
</html>`);

        oebps.file("toc.ncx", `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:flowstate-epub-${Date.now()}"/>
    </head>
    <docTitle><text>${escapeXml(titleText)}</text></docTitle>
    <navMap>
        <navPoint id="content" playOrder="1">
            <navLabel><text>${escapeXml(titleText)}</text></navLabel>
            <content src="content.xhtml"/>
        </navPoint>
    </navMap>
</ncx>`);

        oebps.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>${escapeXml(titleText)}</dc:title>
        <dc:identifier id="BookID">urn:uuid:flowstate-epub-${Date.now()}</dc:identifier>
        <dc:language>en</dc:language>
        <dc:creator opf:role="aut">FlowState Writer</dc:creator>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="css" href="stylesheet.css" media-type="text/css"/>
        <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    </manifest>
    <spine toc="ncx">
        <itemref idref="content"/>
    </spine>
</package>`);

        zip.generateAsync({ type: "blob" }).then(function (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${safeTitle || 'document'}.epub`;
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
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
};

window.FS.editor.showDocumentStatistics = function() {
    if (!window.FS.state.activeDocId) {
        alert("Please open a document first to view statistics.");
        return;
    }
    
    const docs = window.FS.storage.getDocumentsFromStorage();
    const doc = docs.find(d => d.id === window.FS.state.activeDocId);
    if (!doc) return;

    const titleText = doc.title;
    const contentText = window.FS.dom.editorTextarea.innerHTML || '';
    
    // Parse plaintext
    const plainText = contentText.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
    
    const charCountWithSpaces = plainText.length;
    const charCountNoSpaces = plainText.replace(/\s/g, '').length;
    
    const words = plainText.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    const paragraphs = plainText.split(/\n+/).filter(p => p.trim().length > 0).length;
    
    const readingTimeMin = Math.ceil(wordCount / 200);
    const speakingTimeMin = Math.ceil(wordCount / 130);
    
    // Populate modal fields
    document.getElementById('doc-stat-title').innerText = titleText;
    document.getElementById('doc-stat-words').innerText = wordCount.toLocaleString();
    document.getElementById('doc-stat-chars-spaces').innerText = charCountWithSpaces.toLocaleString();
    document.getElementById('doc-stat-chars-nospaces').innerText = charCountNoSpaces.toLocaleString();
    document.getElementById('doc-stat-paragraphs').innerText = paragraphs.toLocaleString();
    document.getElementById('doc-stat-reading').innerText = `${readingTimeMin} min`;
    document.getElementById('doc-stat-speaking').innerText = `${speakingTimeMin} min`;
    
    // Open modal
    if (window.FS.ui.openModal) {
        window.FS.ui.openModal('docStats');
    }
};
