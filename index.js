"use strict";

// Import modules
const { app, BrowserWindow, Menu, MenuItem, dialog, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');

// Manage electron-squirrel-startup
if (require('electron-squirrel-startup')) return app.quit();

let win = null;

function createWindow () {
  win = new BrowserWindow({
    webPreferences: {
      spellcheck: false,
      preload: path.join(app.getAppPath(), 'preload.js'),
      icon: './icons/icon.png'
    }
  });
  win.hide();
  win.maximize();

  win.loadFile('./app/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/* Projects */
// Create project
function newProject() {
  dialog.showMessageBox(win, {
    message: 'You will need to select an empty folder to place your files in.'
  }).then(() => {
    dialog.showOpenDialog(
      {
        "properties": [ 'openDirectory' ]
      }).then(result => {
      if (result.canceled !== true) {
        win.loadURL(url.format({
          protocol: 'file',
          slashes: 'true',
          pathname: path.join(__dirname, `./app/editor.html`)
        }) + `?f=${encodeURIComponent(result.filePaths[0])}&new=true`);
      }
    });
  });
}
function openProject() {
  dialog.showOpenDialog({
    "filters": [
      {
        "name": "Verbose Guacamole Project",
        "extensions": ["vgp"]
      }
    ]
  }).then(result => {
    if (result.canceled !== true) {
      win.loadURL(url.format({
        protocol: 'file',
        slashes: 'true',
        pathname: path.join(__dirname, `./app/editor.html`)
      }) + `?f=${encodeURIComponent(result.filePaths[0])}`);
    }
  });
}

/* Application menu */
const appMenu = Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [
      {
        label: 'Open Project',
        accelerator: 'CommandOrControl+O',
        click() {
          openProject();
        }
      },
      {
        label: 'New Project',
        accelerator: 'CommandOrControl+Shift+N',
        click() {
          newProject();
        }
      },
      {
        type: 'separator'
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Update Project Details',
        click() {
          win.webContents.send('updateProjectDetails');
        }
      }
    ]
  },
  {
    label: 'Tools',
    submenu: [
      {
        label: 'Preferences',
        accelerator: 'CommandOrControl+,',
        click() {
          dialog.showMessageBox({
            message: 'Preferences coming soon to a VerbGuac outlet near you!'
          });
        }
      }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Git',
        submenu: [
          {
            label: 'What are commits?',
            click() {
              const help = new BrowserWindow({
                webPreferences: {
                  nodeIntegration: false,
                  enableRemoteModule: false,
                  contextIsolation: true
                }
              });

              help.loadFile('./app/help/git/commits.html');
            }
          }
        ]
      }
    ]
  },
  {
    label: 'Debug',
    submenu: [
      {
        label: 'Dev Tools',
        role: 'toggleDevTools'
      },
      {
        label: 'Reload',
        role: 'reload'
      },
      {
        label: 'Report Bug',
        click() {
          const report = new BrowserWindow({
            webPreferences: {
              nodeIntegration: false,
              enableRemoteModule: false,
              contextIsolation: true
            }
          });

          report.loadURL('https://github.com/benjaminbhollon/verbose-guacamole/issues/new');
        }
      }
    ]
  }
])

Menu.setApplicationMenu(appMenu);

/* Messages from renderer process */
ipcMain.on('openProject', (event) => {
  openProject();
});
ipcMain.on('newProject', (event) => {
  newProject();
});

// Make appData directory
try {
  fs.mkdirSync(path.resolve(app.getPath('appData'), './verbose-guacamole/'));
} catch (err) {}

ipcMain.on('appDataDir', (event) => {
  event.reply('appDataDir', path.resolve(app.getPath('appData'), './verbose-guacamole/'));
});
