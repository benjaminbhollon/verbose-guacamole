// Import modules
import {
  shell,
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
} from "electron";
import path from "path";
import fs from "fs";

// Manage electron-squirrel-startup
if (require("electron-squirrel-startup")) app.quit();

let win: BrowserWindow;

function createWindow() {
  win = new BrowserWindow({
    webPreferences: {
      spellcheck: false,
      preload: path.join(app.getAppPath(), "/dist/preload.js"),
    },
    icon: path.join(app.getAppPath(), "./icons/icon.png"),
  });

  win.on("close", (e) => {
    if (win) {
      e.preventDefault();
      win.webContents.send("app-close");
    }
  });

  win.hide();
  win.maximize();

  win.loadFile("./app/index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/* Projects */
// Create project
function newProject() {
  dialog
    .showMessageBox(win, {
      message:
        "You will need to select an empty folder to place your files in.",
    })
    .then(() => {
      dialog
        .showOpenDialog({
          properties: ["openDirectory"],
        })
        .then((result) => {
          if (result.canceled !== true) {
            const url = new URL(
              path.join(
                __dirname,
                `./app/editor.html`,
                `?f=${encodeURIComponent(result.filePaths[0])}&new=true`
              )
            );

            win.loadURL(url.href);
            win.webContents.send("relocate", url);
          }
        });
    });
}
function openProject() {
  dialog
    .showOpenDialog({
      filters: [
        {
          name: "Verbose Guacamole Project",
          extensions: ["vgp"],
        },
      ],
    })
    .then((result) => {
      if (result.canceled !== true) {
        const url = new URL(
          path.join(
            __dirname,
            `./app/editor.html`,
            `?f=${encodeURIComponent(result.filePaths[0])}&new=true`
          )
        );

        win.webContents.send("relocate", url);
      }
    });
}

/* Application menu */
const menus = {
  editor: Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Open Project",
          accelerator: "CommandOrControl+O",
          click() {
            openProject();
          },
        },
        {
          label: "New Project",
          accelerator: "CommandOrControl+Shift+N",
          click() {
            newProject();
          },
        },
        {
          type: "separator",
        },
        {
          label: "Back to Homepage",
          click() {
            win.webContents.send("relocate", "./index.html");
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Update Project Details",
          click() {
            win.webContents.send("updateProjectDetails");
          },
        },
      ],
    },
    {
      label: "Tools",
      submenu: [
        {
          label: "Focus Mode",
          accelerator: "F11",
          click() {
            win.webContents.send("toggleFullScreen");
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Git",
          submenu: [
            {
              label: "What are commits?",
              click() {
                const help = new BrowserWindow({
                  webPreferences: {
                    nodeIntegration: false,
                    enableRemoteModule: false,
                    contextIsolation: true,
                  },
                });

                help.loadFile("./app/help/git/commits.html");
              },
            },
          ],
        },
      ],
    },
    {
      label: "Preferences",
      submenu: [
        {
          label: "Themes",
          submenu: [
            {
              label: "Coming soon!",
            },
          ],
        },
      ],
    },
    {
      label: "Debug",
      submenu: [
        {
          label: "Dev Tools",
          role: "toggleDevTools",
        },
        {
          label: "Reload",
          click() {
            win.webContents.send("reload");
          },
          accelerator: "CommandOrControl+R",
        },
        {
          label: "Report a Bug",
          click() {
            shell.openExternal(
              "https://github.com/benjaminbhollon/verbose-guacamole/issues/new"
            );
          },
        },
      ],
    },
  ]),
  default: Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Open Project",
          accelerator: "CommandOrControl+O",
          click() {
            openProject();
          },
        },
        {
          label: "New Project",
          accelerator: "CommandOrControl+Shift+N",
          click() {
            newProject();
          },
        },
      ],
    },
    /*{
      label: 'Tools',
      submenu: [
      ]
    },*/
    {
      label: "Help",
      submenu: [
        {
          label: "Git",
          submenu: [
            {
              label: "What are commits?",
              click() {
                const help = new BrowserWindow({
                  webPreferences: {
                    nodeIntegration: false,
                    enableRemoteModule: false,
                    contextIsolation: true,
                  },
                });

                help.loadFile("./app/help/git/commits.html");
              },
            },
          ],
        },
      ],
    },
    {
      label: "Preferences",
      submenu: [
        {
          label: "Themes",
          submenu: [
            {
              label: "Coming soon!",
            },
          ],
        },
      ],
    },
    {
      label: "Debug",
      submenu: [
        {
          label: "Dev Tools",
          role: "toggleDevTools",
        },
        {
          label: "Reload",
          accelerator: "CommandOrControl+R",
          role: "reload",
        },
        {
          label: "Report a Bug",
          click() {
            shell.openExternal(
              "https://github.com/benjaminbhollon/verbose-guacamole/issues/new"
            );
          },
        },
      ],
    },
  ]),
};

Menu.setApplicationMenu(menus.default);

/* Messages from renderer process */
ipcMain.on("openProject", (event) => {
  openProject();
});
ipcMain.on("newProject", (event) => {
  newProject();
});
ipcMain.on("appMenuDefault", (event) => {
  Menu.setApplicationMenu(menus.default);
});
ipcMain.on("appMenuEditor", (event) => {
  Menu.setApplicationMenu(menus.editor);
});
ipcMain.on("closed", (event) => {
  (<any>win) = null;
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Make appData directory
try {
  fs.mkdirSync(path.resolve(app.getPath("appData"), "./verbose-guacamole/"));
} catch (err) {}

ipcMain.on("appDataDir", (event) => {
  event.reply(
    "appDataDir",
    path.resolve(app.getPath("appData"), "./verbose-guacamole/")
  );
});
