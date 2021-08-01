"use strict";

// Import modules
const { app, BrowserWindow, Menu, MenuItem, dialog } = require('electron');
const url = require('url');
const path = require('path');

let win = null;

function createWindow () {
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      spellcheck: false
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

/* Application menu */
const appMenu = Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [
      {
        label: 'Open Project',
        accelerator: 'CommandOrControl+O',
        click() {
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
      },
      {
        label: 'New Project',
        accelerator: 'CommandOrControl+Shift+N',
        click() {
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
      },
      {
        type: 'separator'
      }
    ]
  },
  {
    label: 'Window',
    submenu: [
      {
        label: 'Reload',
        role: 'reload'
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
