"use strict";

// Import modules
const { shell, app, BrowserWindow, Menu, MenuItem, dialog, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
let projectsPath = path.resolve(app.getPath('documents'), './VerbGuac Projects/');
if (!fs.existsSync(projectsPath)){
  fs.mkdirSync(projectsPath);
}
let theme = 'guacamole';
if (fs.existsSync(path.resolve(app.getPath('appData'), 'verbose-guacamole', 'currentTheme.txt'))) {
  theme = fs.readFileSync(path.resolve(app.getPath('appData'), 'verbose-guacamole', 'currentTheme.txt'), {
    encoding:'utf8',
    flag:'r'
  }).trim();
} else {
  fs.writeFileSync(path.resolve(app.getPath('appData'), 'verbose-guacamole', 'currentTheme.txt'), 'guacamole');
}

// Manage electron-squirrel-startup
if (require('electron-squirrel-startup')) return app.quit();

let win = null;

function createWindow () {
  win = new BrowserWindow({
    webPreferences: {
      spellcheck: false,
      preload: path.join(app.getAppPath(), 'preload.js'),
      icon: path.join(app.getAppPath(), './icons/icon.png')
    }
  });

  win.on('close', (e) => {
    if (win) {
      e.preventDefault();
      win.webContents.send('app-close');
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
  win.webContents.send('newProject');
}
// Open project
function openProject() {
  dialog.showOpenDialog({
    defaultPath: projectsPath,
    filters: [
      {
        name: "Verbose Guacamole Project",
        extensions: ["vgp"]
      }
    ]
  }).then(result => {
    if (result.canceled !== true) {
      win.webContents.send('relocate', url.format({
        protocol: 'file',
        slashes: 'true',
        pathname: path.join(__dirname, `./app/editor.html`)
      }) + `?f=${encodeURIComponent(result.filePaths[0])}`);
    }
  });
}

/* Application menu */
let menus = {};
let themeNames = {
  guacamole: 'Guacamole',
};
function setTheme(id) {
  theme = id;
  fs.writeFileSync(path.resolve(app.getPath('appData'), 'verbose-guacamole', 'currentTheme.txt'), id);
  win.webContents.send('setTheme', id);
  updateMenus();
  console.info('Theme set to ' + themeNames[id]);
}
function updateMenus() {
  menus = {
    editor: Menu.buildFromTemplate([
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
          },
          {
            label: 'Back to Homepage',
            click() {
              win.webContents.send('relocate', './index.html');
            }
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
            label: 'Focus Mode',
            accelerator: 'F11',
            click() {
              win.webContents.send('toggleFullScreen');
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
        label: 'Preferences',
        submenu: [
          {
            label: 'Themes',
            submenu: Object.keys(themeNames).map(id => {
              return {
                label: themeNames[id],
                type: 'radio',
                click() {
                  setTheme(id);
                },
                checked: (id == theme)
              }
            }),
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
            click() {
              win.webContents.send('reload');
            },
            accelerator: 'CommandOrControl+R'
          },
          {
            label: 'Report a Bug',
            click() {
              shell.openExternal('https://github.com/benjaminbhollon/verbose-guacamole/issues/new')
            }
          }
        ]
      }
    ]),
    default: Menu.buildFromTemplate([
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
          }
        ]
      },
      /*{
        label: 'Tools',
        submenu: [
        ]
      },*/
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
        label: 'Preferences',
        submenu: [
          {
            label: 'Themes',
            submenu: Object.keys(themeNames).map(id => {
              return {
                label: themeNames[id],
                type: 'radio',
                click() {
                  setTheme(id);
                },
                checked: (id == theme)
              }
            }),
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
            accelerator: 'CommandOrControl+R',
            role: 'reload'
          },
          {
            label: 'Report a Bug',
            click() {
              shell.openExternal('https://github.com/benjaminbhollon/verbose-guacamole/issues/new')
            }
          }
        ]
      }
    ])
  };
}

updateMenus();
Menu.setApplicationMenu(menus.default);

/* Messages from renderer process */
ipcMain.on('openProject', (event) => {
  openProject();
});
ipcMain.on('newProject', (event) => {
  newProject();
});
ipcMain.on('appMenuDefault', (event) => {
  Menu.setApplicationMenu(menus.default);
});
ipcMain.on('appMenuEditor', (event) => {
  Menu.setApplicationMenu(menus.editor);
});
ipcMain.on('closed', (event) => {
  win = null;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Make appData directory
try {
  fs.mkdirSync(path.resolve(app.getPath('appData'), './verbose-guacamole/'));
} catch (err) {}

ipcMain.on('getDirs', (event) => {
  event.reply(
    'getDirs',
    path.resolve(app.getPath('appData'), './verbose-guacamole/'),
    projectsPath,
  );
});
