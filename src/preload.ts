const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", require("./api.js"));
