const { app, BrowserWindow } = require('electron')
const path = require('path')

let win

function createWindow() {
    win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    // Load Next.js app
    win.loadURL('http://10.88.44.177/DicomWeb/')
    // win.loadFile('index.html');

    win.on('closed', () => {
        win = null
    })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})