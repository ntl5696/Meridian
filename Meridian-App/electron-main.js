const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', click: () => win.webContents.send('menu-action', 'new-project') },
        { label: 'Open Project', click: () => win.webContents.send('menu-action', 'open-project') },
        { label: 'Close Project', click: () => win.webContents.send('menu-action', 'close-project') },
        { type: 'separator' },
        { label: 'New Writing File', click: () => win.webContents.send('menu-action', 'new-file'), accelerator: 'CmdOrCtrl+N' },
        { label: 'New Folder', click: () => win.webContents.send('menu-action', 'new-folder') },
        { label: 'Rename Current File', click: () => win.webContents.send('menu-action', 'rename-active-file'), accelerator: 'F2' },
        { label: 'Delete Current File', click: () => win.webContents.send('menu-action', 'delete-active-file') },
        { type: 'separator' },
        { label: 'Save (Backup)', click: () => win.webContents.send('menu-action', 'save-backup'), accelerator: 'CmdOrCtrl+S' },
        { label: 'Save As (.fsb)', click: () => win.webContents.send('menu-action', 'save-as'), accelerator: 'CmdOrCtrl+Shift+S' },
        { type: 'separator' },
        { label: 'Compile Manuscript...', click: () => win.webContents.send('menu-action', 'compile-manuscript'), accelerator: 'CmdOrCtrl+Shift+E' },
        {
          label: 'Download Current Document As',
          submenu: [
            { label: 'Markdown (.md)', click: () => win.webContents.send('menu-action', 'download-document-md') },
            { label: 'Plain Text (.txt)', click: () => win.webContents.send('menu-action', 'download-document-txt') },
            { label: 'Web Page (.html)', click: () => win.webContents.send('menu-action', 'download-document-html') },
            { label: 'Rich Text (.rtf)', click: () => win.webContents.send('menu-action', 'download-document-rtf') },
            { label: 'Word Document (.docx)', click: () => win.webContents.send('menu-action', 'download-document-docx') },
            { label: 'EPUB Publication (.epub)', click: () => win.webContents.send('menu-action', 'download-document-epub') },
            { label: 'PDF Document (.pdf)', click: () => win.webContents.send('menu-action', 'download-document-pdf') }
          ]
        },
        { type: 'separator' },
        { label: 'Document Statistics', click: () => win.webContents.send('menu-action', 'show-document-stats') },
        { type: 'separator' },
        { label: 'Print Current Document', click: () => win.webContents.send('menu-action', 'download-document-pdf'), accelerator: 'CmdOrCtrl+P' },
        { label: 'Print Manuscript', click: () => win.webContents.send('menu-action', 'export-manuscript-pdf') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find and Replace', click: () => win.webContents.send('menu-action', 'find-and-replace'), accelerator: 'CmdOrCtrl+F' },
        { label: 'Clear Document Text', click: () => win.webContents.send('menu-action', 'clear-document-text') },
        { label: 'Insert Current Date & Time', click: () => win.webContents.send('menu-action', 'insert-datetime'), accelerator: 'CmdOrCtrl+T' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Left Sidebar', click: () => win.webContents.send('menu-action', 'toggle-left-sidebar'), accelerator: 'CmdOrCtrl+B' },
        { label: 'Toggle Settings Sidebar', click: () => win.webContents.send('menu-action', 'toggle-right-sidebar'), accelerator: 'CmdOrCtrl+I' },
        { label: 'Toggle Daily Stats Calendar', click: () => win.webContents.send('menu-action', 'toggle-calendar-stats'), accelerator: 'CmdOrCtrl+H' },
        { type: 'separator' },

        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => win.setAlwaysOnTop(menuItem.checked)
        },
        { label: 'Reset Window Size', click: () => win.setSize(1200, 800) },
        { type: 'separator' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Load the index.html of the app.
  win.loadFile('index.html');

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('print-to-pdf', async (event, options = {}) => {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  
  const pdfOptions = {
    margins: options.margins || { marginType: 'none' },
    pageSize: options.pageSize || 'Letter',
    printBackground: options.printBackground !== false,
    displayHeaderFooter: !!options.displayHeaderFooter,
    headerTemplate: options.headerTemplate || '<div></div>',
    footerTemplate: options.footerTemplate || '<div></div>'
  };
  
  try {
    const data = await webContents.printToPDF(pdfOptions);
    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Save PDF',
      defaultPath: options.filename || 'manuscript.pdf',
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    });
    
    if (filePath) {
      fs.writeFileSync(filePath, data);
      return { success: true, filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error('Failed to write PDF:', error);
    return { success: false, error: error.message };
  }
});
