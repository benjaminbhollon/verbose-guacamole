import { contextBridge } from "electron";
import { Api } from "./api";

contextBridge.exposeInMainWorld("api", new Api().toJSON());
