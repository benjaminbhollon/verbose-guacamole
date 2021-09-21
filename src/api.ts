// Include packages
import path from "path";
import { shell, ipcRenderer } from "electron";
import fs from "fs";
import simpleGit from "simple-git";
import querystring from "querystring";
import marked from "marked";
import EasyMDE from "easymde";
import Typo from "typo-js";

const page = path.parse(location.href.split("?")[0]).name;
const inEditor = page === "editor";

interface Goal {
  id: string;
  type: any;
  words: any;
  date: string;
  startingWords: number;
  archived: boolean;
  history?: {
    progress: number;
    date: any;
  }[];
  acknowledged?: boolean;
  final?: any;
  done: number;
  completed?: boolean;
  daysCompleted?: number;
}

export class Api {
  git: any;
  placeholders: string[];
  editor: any;
  currentFile: any;
  clearing: boolean;
  appPath: any;
  startingWords: number;
  sprint: {
    interval?: number;
    start?: any;
    end?: any;
    startingWords?: number;
    total?: number;
  };
  projectPath: string;
  readOnly: boolean;
  togglePreview: any;
  gitEnabled: boolean;
  endSprintSound: HTMLAudioElement;
  dictionary: Typo;
  customDictionary: any[];
  q: Function;
  qA: Function;
  rx_word: string;
  project: {
    metadata: {
      title: string;
      author: string;
      synopsis: string;
    };
    index: {
      name: string;
      path: string;
      words: number;
      delete?: any;
    }[];
    openFolders: { id: string; open: any }[];
    goals: Goal[];
    history: {
      wordCount?: {};
    };
    labels: {
      id: any;
      name: any;
      description: string;
      color: { hue: any; saturation: any; lightness: any };
    }[];
    openFile?: any;
  };
  placeholderN: number;

  constructor() {
    // Initialize variables
    this.git = null;
    this.placeholders = [
      "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going to Heaven, we were all going direct the other way. (A Tale of Two Cities)",
      "It was a dark and stormy night. (A Wrinkle in Time)",
      "Call me Ishmael. (Moby Dick)",
      "It was a pleasure to burn. (Fahrenheit 451)",
      "It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife. (Pride and Prejudice)",
      "In a hole in the ground there lived a hobbit. (The Hobbit)",
      "Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small, unregarded yellow sun. (The Hitchhiker's Guide to the Galaxy)",
      "It was a bright cold day in April, and the clocks were striking thirteen. (1984)",
      "All children, except one, grow up. (Peter Pan)",
      "There was a boy called Eustace Clarence Scrubb, and he almost deserved it. (Voyage of the Dawn Treader)",
      "The drought had lasted now for ten million years, and the reign of the terrible lizards had long since ended. (2001: A Space Odyssey)",
      "When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow. (To Kill a Mockingbird)",
      "There was no possibility of taking a walk that day. (Jane Eyre)",
      "First the colors. Then the humans. (The Book Thief)",
      "“Where’s Papa going with that ax?” (Charlotte's Web)",
      "The thousand injuries of Fortunato I had borne as I best could, but when he ventured upon insult I vowed revenge. (The Cask of Amontillado)",
      "Happy families are all alike; every unhappy family is unhappy in its own way. (Anna Karenina)",
    ];
    this.editor = null;
    this.currentFile = null;
    this.clearing = false;
    this.appPath = null;
    this.startingWords = 0;
    this.sprint = {};
    this.projectPath = "";
    this.readOnly = false;
    this.togglePreview = null;
    this.gitEnabled = true;
    this.endSprintSound = new Audio("./assets/audio/sprintDone.mp3");
    this.dictionary = new Typo("en_US");

    this.customDictionary = [];

    // Quick versions of document.querySelector and document.querySelectorAll
    this.q = (s: any) => document.querySelector(s);
    this.qA = (s: any) => document.querySelectorAll(s);

    // Define what separates a word
    this.rx_word = '!"“”#$%&()*+,-–—./:;<=>?@[\\]^_`{|}~ ';

    this.project = {
      metadata: {
        title: "Untitled Novel",
        author: "",
        synopsis: "",
      },
      index: [
        {
          name: "New File",
          path: "./content/" + this.fileName(),
          words: 0,
        },
      ],
      openFolders: [],
      goals: [],
      history: {
        wordCount: {},
      },
      labels: [],
    };
    this.placeholderN = Date.now() % this.placeholders.length;

    ipcRenderer.on("updateProjectDetails", () => {
      this.showModal("projectDetails");
    });

    ipcRenderer.on("toggleFullScreen", () => {
      toggleFullScreen(this.editor);
    });
  }

  toJSON(proto: object | undefined = undefined) {
    let jsoned = {};
    let toConvert = proto || this;
    Object.getOwnPropertyNames(toConvert).forEach((prop) => {
      const val = toConvert[prop];
      // don't include those
      if (prop === "toJSON" || prop === "constructor") {
        return;
      }
      if (typeof val === "function") {
        jsoned[prop] = val.bind(jsoned);
        return;
      }
      jsoned[prop] = val;
    });

    const inherited = Object.getPrototypeOf(toConvert);
    if (inherited !== null) {
      Object.keys(this.toJSON(inherited)).forEach((key) => {
        if (!!jsoned[key] || key === "constructor" || key === "toJSON") return;
        if (typeof inherited[key] === "function") {
          jsoned[key] = inherited[key].bind(jsoned);
          return;
        }
        jsoned[key] = inherited[key];
      });
    }
    return jsoned;
  }

  // hex to hsl based on https://gist.github.com/xenozauros/f6e185c8de2a04cdfecf
  hexToHSL(hex: string): { hue: any; saturation: any; lightness: any } {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      let r = parseInt(result[1], 16);
      let g = parseInt(result[2], 16);
      let b = parseInt(result[3], 16);
      (r /= 255), (g /= 255), (b /= 255);
      var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      var h,
        s,
        l = (max + min) / 2;
      if (max == min) {
        h = s = 0; // achromatic
      } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }

      return {
        hue: Math.round(h * 360),
        saturation: Math.round(s * 100),
        lightness: Math.round(l * 100),
      };
    }

    return {
      hue: 0,
      saturation: 0,
      lightness: 0,
    };
  }

  addGoal(type, words) {
    const allowedTypes = ["session", "daily", "project"];
    if (allowedTypes.indexOf(type) === -1) return false;
    if (typeof words !== "number" || words <= 0) return false;

    let newGoal: Goal = {
      id: this.idFromPath(this.fileName()),
      type,
      words,
      done: 0,
      date: new Date().toISOString(),
      startingWords: type === "project" ? 0 : this.wordCountTotal(),
      archived: false,
    };

    this.project.goals.push(newGoal);

    if (type === "daily") {
      newGoal.history = [];
    }

    this.q("#wordGoal__addForm").open = false;

    this.updateGoals();
    this.saveProject();
    return true;
  }

  addToDictionary(w: any) {
    this.customDictionary.push(w);
    fs.writeFileSync(
      path.resolve(this.appPath, "./customDictionary.txt"),
      this.customDictionary.join("\n")
    );

    return true;
  }

  archiveCompleteGoals(includeProject = false) {
    this.project.goals = this.project.goals.map((g) => {
      let newGoal = g;
      if (this.wordCountTotal() - g.startingWords >= g.words) {
        if (g.type === "session" || (g.type === "project" && includeProject))
          newGoal.archived = true;
        if (g.type === "daily") newGoal.acknowledged = true;
      }

      return newGoal;
    });

    this.updateGoals(includeProject);

    this.saveProject();
  }

  archiveGoal(id) {
    const goal = this.project.goals.find((g) => g.id === id);
    if (typeof goal === "undefined") return false;

    if (goal.type === "daily") {
      goal.history!.push({
        date: goal.date,
        progress: this.wordCountTotal() - goal.startingWords,
      });
    }

    goal.archived = true;

    this.updateGoals();

    this.saveProject();
  }

  cancelSprint() {
    const currentWords = this.wordCountTotal();
    const written = currentWords - this.startingWords;

    this.q(
      "#wordSprint__status"
    ).innerText = `You wrote ${written.toLocaleString()} word${
      written !== 1 ? "s" : ""
    }. Impressive!`;

    this.q("#wordSprint").style = "";
    this.q("#wordSprint__cancel").style.display = "none";
    this.q("#wordSprint").classList.remove("more");
    this.q("#wordSprint__popup").dataset.mode = "finished";
    this.q("#wordSprint").innerHTML = '<i class="fas fa-running"></i>';

    if (!this.q("#wordSprint__checkbox").checked) this.q("#wordSprint").click();

    clearInterval(this.sprint.interval);
    this.sprint = {};
  }

  async checkout(what, editable, stash = true) {
    if (!this.gitEnabled) {
      console.warn("Git is disabled!");
      return false;
    }
    if (!(what === "master" && editable) && stash) {
      await this.git.stash();
    }

    if (!editable) {
      this.readOnly = true;
      this.q("body").dataset.readonly = "true";
      this.q("#git__revertButton").dataset.hash = what;
    } else {
      this.readOnly = false;
      this.q("body").dataset.readonly = "false";
    }

    if (what === "master" && editable && stash) {
      await this.git.stash(["apply"]);
    }

    this.project = JSON.parse(
      fs.readFileSync(this.projectPath, {
        encoding: "utf8",
        flag: "r",
      })
    );
    this.currentFile = this.flatten(this.project.index).filter(
      (i) => typeof i.children === "undefined"
    )[0];

    this.openFile(this.currentFile.path, this.currentFile.name, true);
    this.populateFiletree();
    this.populateGitHistory();
  }

  checkWord(w) {
    if (this.customDictionary.indexOf(w) !== -1 || !isNaN(w)) return true;
    return this.dictionary.check(w);
  }

  async commit(m) {
    if (!this.gitEnabled) {
      console.warn("Git is disabled!");
      return false;
    }
    const message = m
      ? m
      : (<HTMLTextAreaElement>document.getElementById("git__commitText")).value;
    document.getElementById("git__commitButton")!.innerText = "Working...";

    try {
      await this.git.add("./*").commit(message)._chain;
      document.getElementById("git__commitButton")!.innerText = "Commit";
      (<HTMLTextAreaElement>document.getElementById("git__commitText")).value =
        "";
    } catch (err) {
      window.alert(err);
    }

    setTimeout(this.populateGitHistory, 500);
  }

  createItem(type, first = false) {
    let folder = this.q("#fileTree .active");
    let parent: {
      name: string;
      path: string;
      words?: number;
      children?: any;
      delete?: any;
    }[] = [];

    if (first) {
      parent = this.project.index;
    } else if (
      folder &&
      folder.tagName !== "DETAILS" &&
      folder.parentNode.tagName === "DETAILS"
    ) {
      folder = folder.parentNode;
    } else if (folder === null || folder.tagName !== "DETAILS") {
      parent = this.project.index;
    }

    if (parent === null) {
      var parentFile = this.flatten(this.project.index).find(
        (i) => this.idFromPath(i.path) === folder.id
      );
      parent = parentFile.children;
    }

    const filePath = "./content/" + this.fileName();

    if (type === "file") {
      fs.writeFileSync(
        path.resolve(path.dirname(this.projectPath), filePath),
        "",
        {
          encoding: "utf8",
          flag: "w",
        }
      );

      const newItem = {
        name: "Untitled File",
        path: filePath,
        words: 0,
      };

      if (first) {
        parent.splice(0, 0, newItem);
      } else {
        parent.push(newItem);
      }
    } else if (type === "folder")
      parent.push({
        name: "Untitled Folder",
        path: filePath,
        children: [],
      });

    this.saveProject();

    this.populateFiletree();
    setTimeout(() => {
      if (type === "file") {
        const item = this.openItem(this.idFromPath(filePath));

        // TODO: Return error if item does not exist
        if (item) item.click();
        if (!first)
          this.startRename(
            document.getElementById(this.idFromPath(filePath) + "__filename")
          );
      } else {
        const item = document.getElementById(this.idFromPath(filePath));

        // TODO: Return error if item does not exist
        if (item) item.click();
        // TODO: This may be wrong
        (<HTMLFormElement>(
          document.getElementById(this.idFromPath(filePath))
        )).open = true;
      }
    }, 0);
  }

  createLabel(name, color, description = "") {
    const label = {
      id: this.idFromPath(this.fileName()),
      name: name,
      description: "",
      color: this.hexToHSL(color),
    };

    this.project.labels.push(label);

    this.saveProject();
    this.populateFiletree();
    this.updateLabelCSS();
  }

  debounce(f, delay) {
    let timeout: NodeJS.Timeout | null;
    return (...args) => {
      if (timeout !== null) clearTimeout(timeout);
      timeout = setTimeout(() => f(...args), delay);
    };
  }

  deleteInFolder(folder) {
    for (const f of folder) {
      if (f.children) {
        this.deleteInFolder(f.children);
      } else {
        fs.unlinkSync(path.resolve(path.dirname(this.projectPath), f.path));
      }
    }
  }

  deleteItem() {
    let item = this.q("#fileTree .active");
    if (
      !confirm(
        `Do you really want to delete this ${
          item.tagName === "SPAN" ? "file" : "folder and everything in it"
        }? There is no undo.`
      )
    )
      return;

    let file = this.flatten(this.project.index).find(
      (i) =>
        this.idFromPath(i.path) ===
        (item.tagName === "SPAN" ? item.id : item.parentNode.id)
    );

    if (item.tagName === "SPAN") {
      fs.unlinkSync(path.resolve(path.dirname(this.projectPath), file.path));
    } else if (item.tagName === "SUMMARY") {
      this.deleteInFolder(file.children);
    }

    file.delete = true;

    this.project.index = this.project.index.filter((i) => !i.delete);

    (item.tagName === "SPAN" ? item : item.parentNode).remove();

    setTimeout(() => {
      const foundCurrent = this.flatten(this.project.index).find(
        (f) => this.idFromPath(f.path) === this.project.openFile
      );
      if (typeof foundCurrent === "undefined") {
        if (
          this.flatten(this.project.index).filter(
            (i) => typeof i.children === "undefined"
          ).length
        ) {
          this.currentFile = this.flatten(this.project.index).filter(
            (i) => typeof i.children === "undefined"
          )[0];
          const item = document.getElementById(
            this.idFromPath(this.currentFile.path)
          );

          // TODO: Return error if item does not exist
          if (item) item.click();
          this.openFile(this.currentFile.path, this.currentFile.name, true);
        } else {
          this.createItem("file", true);
        }
      }
      this.saveProject();
    }, 0);
  }
  editorValue(v) {
    if (v) {
      return this.editor.value(v);
    } else {
      if (this.editor === null) return;
      return this.editor.value();
    }
  }
  fileName() {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    return (
      new Array(16)
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join("") + ".md"
    );
  }
  flatten(arr) {
    let newArr = arr;
    newArr = arr
      .map((i) => {
        // If there are children, add them to the top-level list
        if (i.children) return [i, this.flatten(i.children)];
        else return i;
      })
      .flat(Infinity);
    return newArr;
  }

  focusItem(id) {
    const item = document.getElementById(id);

    // TODO: Return error message if item or element are undefined
    if (item) {
      const element =
        item.tagName === "SPAN" ? item : item.querySelector("summary");

      if (element) {
        if (
          element.contentEditable === "true" ||
          element.classList.contains("editing")
        )
          return;

        // TODO: Remove deprecated event
        if (
          element.classList.contains("active") &&
          event &&
          event.type !== "contextmenu"
        )
          return this.startRename(
            element.tagName === "SPAN"
              ? element.querySelector(".filename")
              : element
          );
        if (this.q("#fileTree .active"))
          this.q("#fileTree .active").classList.toggle("active");
        element.classList.toggle("active");
      }
    }
  }

  getLabel(id) {
    return this.project.labels.find((l) => l.id === id);
  }

  /**
   * @deprecated You should reference the object's project attribute
   */
  getProject() {
    return { ...this.project };
  }

  idFromPath(p) {
    return p.split("/").slice(-1)[0].split(".")[0];
  }

  ignoreLock() {
    this.readOnly = false;
    this.q("body").dataset.readonly = "false";
    this.resetEditor();
  }

  async init(params) {
    // Get app data directory
    await new Promise<void>((resolve) => {
      ipcRenderer.send("appDataDir");
      ipcRenderer.on("appDataDir", (event, args) => {
        this.appPath = args;
        resolve();
      });
    });

    try {
      this.customDictionary = fs
        .readFileSync(path.resolve(this.appPath, "./customDictionary.txt"), {
          encoding: "utf8",
          flag: "r",
        })
        .split("\n")
        .filter((l) => l.length);
    } catch (err) {
      console.error(err);
      fs.writeFileSync(
        path.resolve(this.appPath, "./customDictionary.txt"),
        ""
      );
    }

    params = querystring.parse(params);
    this.projectPath = params.f;

    // Initialize git in project directory
    this.git = simpleGit({
      baseDir: params.new ? this.projectPath : path.dirname(this.projectPath),
    });
    try {
      await this.git.init();
    } catch (err) {
      console.warn("Git is not installed. Continuing without.");
      this.gitEnabled = false;
      this.q("#git").classList.add("disabled");
    }

    if (params.new) {
      console.info("New project alert! Let me get that set up for you...");
      console.info("Creating project file...");
      this.projectPath = path.resolve(this.projectPath, "project.vgp");
      fs.writeFile(
        this.projectPath,
        JSON.stringify(this.project),
        {
          encoding: "utf8",
          flag: "w",
        },
        (err) => {
          if (err) throw new Error(err.message);
          else {
            console.info("File written successfully!");
          }
        }
      );
      console.info("Creating initial file...");
      try {
        fs.mkdirSync(path.resolve(path.dirname(this.projectPath), "./content"));
      } catch (err) {
        console.warn(err);
      }
      fs.writeFile(
        path.resolve(
          path.dirname(this.projectPath),
          this.project.index[0].path
        ),
        "",
        {
          encoding: "utf8",
          flag: "w",
        },
        (err) => {
          if (err) throw new Error(err.message);
          else {
            console.info("File written successfully!");
          }
        }
      );
      this.currentFile = this.flatten(this.project.index).filter(
        (i) => typeof i.children === "undefined"
      )[0];
      if (this.gitEnabled) {
        console.info("Creating initial commit...");
        await this.git.add("./*");
        await this.git.commit("Create project");
        await this.populateGitHistory();
      }

      console.info("Done! Changing URL to avoid refresh-slipups.");
      history.replaceState(null, "", "./editor.html?f=" + this.projectPath);
      this.startingWords = 0;

      fs.writeFileSync(
        path.resolve(path.dirname(this.projectPath), ".gitignore"),
        ".lock"
      );
    } else {
      if (this.gitEnabled) {
        if ((await this.git.branch()).all.length <= 0) {
          // Project started without git
          console.info("Creating initial commit...");
          await this.git.add("./*");
          await this.git.commit("Create project");
        }
        if ((await this.git.branch()).current !== "master")
          await this.checkout("master", true);

        this.populateGitHistory();
      }

      this.project = JSON.parse(
        fs.readFileSync(this.projectPath, {
          encoding: "utf8",
          flag: "r",
        })
      );
      this.currentFile = this.flatten(this.project.index).filter(
        (i) => typeof i.children === "undefined"
      )[0];

      // Calculate word counts
      this.flatten(this.project.index)
        .filter((i) => typeof i.children === "undefined")
        .forEach((file) => {
          file.words = this.wordCount(
            fs.readFileSync(
              path.resolve(path.dirname(this.projectPath), file.path),
              {
                encoding: "utf8",
                flag: "r",
              }
            )
          );
        });
      this.startingWords = this.wordCountTotal();

      /* Compatibility */

      // with v0.1.0
      if (typeof this.project.openFolders === "undefined")
        this.project.openFolders = [];

      // with <v0.1.2
      if (typeof this.project.openFile === "undefined")
        this.project.openFile = this.idFromPath(this.currentFile.path);

      const foundCurrent = this.flatten(this.project.index).find(
        (f) => this.idFromPath(f.path) === this.project.openFile
      );
      if (typeof foundCurrent !== "undefined") this.currentFile = foundCurrent;

      // with <v0.2.1
      if (typeof this.project.metadata.title !== "string")
        this.project.metadata.title = this.project.metadata.title;

      // with <v0.3.2
      if (typeof this.project.goals === "undefined") this.project.goals = [];
      if (typeof this.project.history === "undefined")
        this.project.history = {};
      if (typeof this.project.history.wordCount === "undefined")
        this.project.history.wordCount = {};

      // with <v0.3.3
      if (typeof this.project.labels === "undefined") this.project.labels = [];
    }

    // Lock project
    this.lockProject();

    // Update goals
    this.project.goals = this.project.goals.map((g) => {
      let goal = g;
      if (!g.id) goal.id = this.idFromPath(this.fileName());
      if (goal.type === "session") {
        goal.archived = true;
        goal.final = this.wordCountTotal();
      } else if (
        goal.type === "daily" &&
        goal.history &&
        !goal.archived &&
        (!goal.history.length ||
          goal.date.split("T")[0] < new Date().toISOString().split("T")[0])
      ) {
        goal.history.push({
          date: g.date,
          progress: this.wordCountTotal() - g.startingWords,
        });
        goal.startingWords = this.wordCountTotal();
        goal.date = new Date().toISOString();
      }

      return goal;
    });

    this.populateFiletree();
    this.openFile(this.currentFile.path, this.currentFile.name, true);
    this.updateLabelCSS();

    setTimeout(() => {
      const item = document.getElementById(
        this.idFromPath(this.currentFile.path)
      );

      if (item) item.click();
    }, 1000);
  }

  isGitEnabled() {
    return this.gitEnabled;
  }

  isReadOnly() {
    this.readOnly;
  }

  labelFile(fileId, labelId) {
    const file = this.flatten(this.project.index).find(
      (f) => this.idFromPath(f.path) === fileId
    );

    if (this.getLabel(labelId) !== undefined || labelId === undefined) {
      file.label = labelId;
      this.populateFiletree();
    }
  }

  lockProject() {
    try {
      if (fs.statSync(path.resolve(this.projectPath, "../.lock"))) {
        this.readOnly = true;
        document.body.classList.add("locked");
      }
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.error(err);
      }
    }

    fs.writeFileSync(path.resolve(this.projectPath, "../.lock"), "");
    return true;
  }

  moveItem(p, t, c, index, order, main = false) {
    const parent = p
      ? this.flatten(this.project.index).find((f) => f.path === p)
      : { children: this.project.index };
    const target = t
      ? this.flatten(this.project.index).find((f) => f.path === t)
      : { children: this.project.index };
    const currentlyDragging = this.flatten(this.project.index).find(
      (f) => f.path === c
    );

    // Remove from parent
    parent.children.splice(parent.children.indexOf(currentlyDragging), 1);

    // Add to target
    if (order) {
      target.children.splice(index, 0, JSON.stringify(currentlyDragging));
    } else {
      target.children.push(currentlyDragging);
    }

    target.children = target.children.map((c) => {
      if (typeof c === "string") return JSON.parse(c);
      else return c;
    });

    this.project.index = this.project.index.map((c) => {
      if (typeof c === "string") return JSON.parse(c);
      else return c;
    });

    this.populateFiletree();

    // Save
    this.saveProject();
  }

  newProject() {
    ipcRenderer.send("newProject");
  }

  openFile(p, n, first = false) {
    if (
      this.currentFile ===
        this.flatten(this.project.index).find((i) => i.path === p) &&
      !first
    )
      return;
    this.resetEditor();
    this.clearing = true;
    const value = fs.readFileSync(
      path.resolve(path.dirname(this.projectPath), p),
      {
        encoding: "utf8",
        flag: "r",
      }
    );
    this.editor.value(value);
    this.currentFile = this.flatten(this.project.index).find(
      (i) => i.path === p
    );
    this.clearing = false;

    // Calculate word counts
    this.flatten(this.project.index)
      .filter((i) => typeof i.children === "undefined")
      .forEach((file) => {
        file.words = this.wordCount(
          fs.readFileSync(
            path.resolve(path.dirname(this.projectPath), file.path),
            {
              encoding: "utf8",
              flag: "r",
            }
          )
        );
      });

    this.updateStats();
  }

  openItem(id) {
    const file = this.flatten(this.project.index).find(
      (i) => this.idFromPath(i.path) === id
    );
    this.openFile(file.path, file.name);
    this.project.openFile = id;
    this.saveProject();
    return document.getElementById(id);
  }

  openProject() {
    ipcRenderer.send("openProject");
  }

  openURI(uri) {
    shell.openExternal(uri);
  }

  populateFiletree() {
    document.getElementById("fileTree__list")!.innerHTML = "";

    const drawLayer = (layer, id) => {
      let html = "";

      for (var item of layer) {
        if (typeof item.children !== "undefined") {
          html += `
          <details
            id="${this.idFromPath(item.path)}"
            ondragover='event.preventDefault()'
            ondrop='moveItem(event, getDraggingIndex())'
          >
            <summary
              class="folder"
              draggable="true"
              ondragstart="startMoveItem(event)"
              ondragend="stopMoveItem(event)"
              title="${item.name}"
              onclick='event.preventDefault();this.focusItem(this.parentNode.id);'
              ondblclick='this.parentNode.toggleAttribute("open");this.setOpenFolders();'
              oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();this.focusItem(this.parentNode.id);"
            >${item.name}</summary>
          </details>`;
          const itemClone = { ...item };
          setTimeout(() => {
            drawLayer(itemClone.children, this.idFromPath(itemClone.path));
          }, 0);
        } else {
          html += `
          <span
            class="file"
            id="${this.idFromPath(item.path)}"
            draggable="true"
            ondragstart="startMoveItem(event)"
            ondragend="stopMoveItem(event)"
            ondragover="setHovering(this)"
            ondrag="updatePageXY(event)"
          >
            <span
              id="${this.idFromPath(item.path)}__filename"
              class="filename"
              title="${item.name}"
              onclick='event.preventDefault();this.focusItem(this.parentNode.id)'
              ondblclick='this.openItem(this.parentNode.id)'
              oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();this.focusItem(this.parentNode.id);"
            >
              ${item.name}
            </span>
            <span
              class="label"
              data-label="${
                typeof item.label === "undefined" ? "blank" : item.label
              }"
              title="${
                typeof item.label === "undefined"
                  ? "Click to add label."
                  : 'Labeled "' +
                    this.getLabel(item.label)?.name +
                    '". Click to edit.'
              }"
            >
              <div class="contextMenu">
                ${
                  this.project.labels.length
                    ? this.project.labels
                        .map(
                          (l) =>
                            `<span
                      onclick="this.labelFile('${this.idFromPath(
                        item.path
                      )}', '${l.id}')"
                      data-label="${l.id}"
                    >${l.name}</span>`
                        )
                        .join("")
                    : `<span class="--no-click">No labels.</span>`
                }
                ${
                  typeof item.label === "undefined"
                    ? ""
                    : `<span onclick="this.labelFile('${this.idFromPath(
                        item.path
                      )}', undefined)">Remove Label</span>`
                }
                <hr>
                <span onclick="this.showModal('createLabel')">Create Label</span>
              </div>
            </span>
          </span>`;
        }
      }

      const element = document.getElementById(id);

      if (element) element.innerHTML += html;
    };
    drawLayer(this.project.index, "fileTree__list");

    this.restoreOpenFolders();
  }

  async populateGitHistory() {
    if (!this.gitEnabled) {
      console.warn("Git is disabled!");
      return false;
    }
    try {
      const log = await this.git.log();
      let html = log.all
        .map((h) => {
          const preview = `<span class="preview" onclick="this.checkout('${h.hash}', false)"><i class="fa fa-eye"></i>`;
          return `<span id='commit-${h.hash}'>${h.message}${
            h.hash !== log.all[0].hash ? preview : ""
          }</span></span>`;
        })
        .reverse()
        .join("");
      this.q("#git__commits").innerHTML = html;

      this.q("#git").scrollTop = this.q("#git").scrollHeight;
    } catch (err) {
      console.error(err);
    }
  }

  resetEditor() {
    this.clearing = true;

    // If the editor already exists, clear it
    if (this.editor) {
      this.editor.value("");
      this.editor.toTextArea();
    }
    this.placeholderN = Date.now() % (this.placeholders.length - 1);
    const editorTextarea = document.getElementById("editorTextarea");

    // TODO: Show error if textarea is not found
    if (editorTextarea) {
      let options: EasyMDE.Options = {
        element: editorTextarea,
        spellChecker: false,
        status: false,
        placeholder: this.placeholders[this.placeholderN],
        insertTexts: {
          image: ["![](https://", ")"],
        },
        autofocus: true,
        autoDownloadFontAwesome: false,
        toolbar: [
          "bold",
          "italic",
          "heading",
          "|",
          "quote",
          "unordered-list",
          "ordered-list",
          "link",
          "|",
          "preview",
          {
            name: "fullscreen",
            action: toggleFullScreen,
            className: "fa fa-arrows-alt no-disable",
            title: "Focus Mode (F11)",
          },
          "|",
          "guide",
        ],
        shortcuts: {
          toggleFullScreen: null,
        },
      };
      if (this.readOnly) {
        options.hideIcons = ["side-by-side", "image", "preview"];
        options.placeholder = "";
      }
      this.editor = new EasyMDE(options);
    }

    // Fullscreen
    const debouncedSaveFile = this.debounce(this.saveFile, 500);
    const throttledUpdateStats = this.throttle(this.updateStats, 50);
    this.editor.codemirror.on("change", () => {
      if (this.clearing) return;
      throttledUpdateStats();
      debouncedSaveFile();
    });
    this.clearing = false;

    this.editor.codemirror.addOverlay({
      token: function (stream) {
        // Based on https://github.com/sparksuite/codemirror-spell-checker/blob/master/src/js/spell-checker.js
        var ch = stream.peek();
        var word = "";

        if (this.rx_word.includes(ch)) {
          stream.next();
          return null;
        }

        while ((ch = stream.peek()) != null && !this.rx_word.includes(ch)) {
          word += ch;
          stream.next();
        }

        if (this.checkWord(word.replace(/‘|’/g, "'")) !== true)
          return "spell-error"; // CSS class: cm-spell-error

        return null;
      },
    });

    this.togglePreview = this.editor.toolbar.find(
      (t) => t.name === "preview"
    ).action;
    if (this.readOnly && !this.editor.isPreviewActive())
      setTimeout(() => {
        this.togglePreview(this.editor);
      }, 0);
  }

  renameItem(e) {
    e.contentEditable = false;
    if (e.tagName === "SPAN") e.parentNode.classList.remove("editing");

    const file = this.flatten(this.project.index).find(
      (i) => this.idFromPath(i.path) === e.parentNode.id
    );

    if (e.innerText.trim().length <= 0 || e.innerText.trim() === file.name) {
      e.innerText = file.name;
      return;
    }

    file.name = e.innerText.trim();
    e.title = e.innerText.trim();

    if (file.path === this.currentFile.path) this.updateStats();

    this.saveProject();
  }

  restoreOpenFolders() {
    const toOpen = this.project.openFolders;
    for (const folder of toOpen) {
      try {
        // This may be wrong
        (<HTMLFormElement>document.getElementById(folder.id)).open =
          folder.open;
      } catch (err) {
        setTimeout(this.restoreOpenFolders, 0);
      }
    }
  }

  async revertTo(where) {
    if (!this.gitEnabled) {
      console.warn("Git is disabled!");
      return false;
    }

    const range = `${where}..HEAD`;

    await this.git.reset({ "--hard": null });

    await this.checkout("master", false, false);

    await this.git.stash();

    await this.git.revert(range, { "--no-commit": null });

    await this.commit(`Revert to "${this.q(`#commit-${where}`).innerText}"`);

    await this.checkout("master", true, false);
  }

  saveFile(v: undefined) {
    if (this.readOnly) return false;
    let p = this.currentFile.path;
    let value: string | NodeJS.ArrayBufferView;
    if (!v) value = this.editor.value();
    else value = v;

    fs.writeFileSync(path.resolve(path.dirname(this.projectPath), p), value);
  }

  saveProject() {
    if (this.readOnly) return false;
    fs.writeFileSync(
      path.resolve(this.projectPath),
      JSON.stringify(this.project)
    );
  }

  setOpenFolders() {
    let folders = [...this.qA("#fileTree__list details")];

    folders = folders.map((folder) => {
      return {
        id: folder.id,
        open: folder.open,
      };
    });

    this.project.openFolders = [...folders];

    this.saveProject();
  }

  showModal(name) {
    let modal: HTMLElement | null;
    switch (name) {
      case "projectDetails":
        if (this.readOnly)
          return alert(
            "You cannot update novel details while in Read Only mode."
          );
        modal = document.getElementById("projectDetails");

        // TODO: Show error if any modal cannot be found
        if (modal) {
          // Restore values
          (<HTMLTextAreaElement>(
            document.getElementById("projectDetails__title")
          )).value = this.project.metadata.title;
          (<HTMLTextAreaElement>(
            document.getElementById("projectDetails__author")
          )).value = this.project.metadata.author;
          (<HTMLTextAreaElement>(
            document.getElementById("projectDetails__synopsis")
          )).value = this.project.metadata.synopsis;

          modal.classList.add("visible");
        }

        break;
      case "projectGoalComplete":
        modal = document.getElementById("projectGoalComplete");

        if (modal) {
          modal.classList.add("visible");
        }

        break;
      case "createLabel":
        modal = document.getElementById("createLabel");

        if (modal) {
          modal.classList.add("visible");
        }

        break;
      default:
        throw new Error(`There is no modal named '${name}'`);
    }
  }

  startSprint(s = 0, m = 0, h = 0) {
    if (!(s + m + h)) return; // smh = shaking my head (because you set a timer for 0)

    const start = Date.now();
    const end = start + 1000 * s + 1000 * 60 * m + 1000 * 60 * 60 * h;

    this.q("#wordSprint").click();

    this.sprint = {
      start,
      end,
      startingWords: this.wordCountTotal(),
      total: end - start,
      interval: window.setInterval(() => {
        const currentWords = this.wordCountTotal();
        const written = currentWords - this.startingWords;
        this.q(
          "#wordSprint__status"
        ).innerText = `You've written ${written.toLocaleString()} word${
          written !== 1 ? "s" : ""
        }. Keep up the good work!`;

        let timeLeft = this.sprint.end - Date.now();

        // TODO: Return error if sprint does not exist
        if (this.sprint) {
          let percent = this.sprint.total
            ? 1 - timeLeft / this.sprint.total
            : 0;

          this.q("#wordSprint").style = `--percent:${percent};`;
          if (percent > 0.5) this.q("#wordSprint").classList.add("more");

          if (timeLeft < 0) {
            this.q(
              "#wordSprint__status"
            ).innerText = `You wrote ${written.toLocaleString()} word${
              written !== 1 ? "s" : ""
            }. Impressive!`;

            this.q("#wordSprint").style = "";
            this.q("#wordSprint").classList.remove("more");
            this.q("#wordSprint__popup").dataset.mode = "finished";
            this.q("#wordSprint").innerHTML = '<i class="fas fa-running"></i>';

            if (!this.q("#wordSprint__checkbox").checked)
              this.q("#wordSprint").click();

            this.endSprintSound.play();

            clearInterval(this.sprint.interval);
            this.sprint = {};
            return;
          }

          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          timeLeft -= hoursLeft * 1000 * 60 * 60;
          const minutesLeft = Math.floor(timeLeft / (1000 * 60));
          timeLeft -= minutesLeft * 1000 * 60;
          const secondsLeft = Math.floor(timeLeft / 1000);

          const timeleft = document.getElementById("wordSprint__timeLeft");

          if (timeleft)
            timeleft.innerText = `${hoursLeft}:${
              minutesLeft < 10 ? 0 : ""
            }${minutesLeft}:${secondsLeft < 10 ? 0 : ""}${secondsLeft}`;
        }
      }, Math.max(Math.floor(end - start) / 360, 25)),
    };

    const wordsprint = document.getElementById("wordSprint");
    const wordsprint__popup = document.getElementById("wordSprint__popup");

    if (wordsprint && wordsprint__popup) {
      wordsprint.classList.add("pie-chart");

      wordsprint.innerHTML =
        '<span class="pie"><span class="segment"></span></span>';
      wordsprint__popup.dataset.mode = "running";
    }
  }

  suggestWords(w) {
    return this.dictionary.suggest(w);
  }

  startRename(e) {
    const isOpen =
      e.tagName === "SUMMARY" ? e.parentNode.open : this.currentFile;
    setTimeout(() => {
      if (
        isOpen !==
        (e.tagName === "SUMMARY" ? e.parentNode.open : this.currentFile)
      )
        return;
      e.contentEditable = true;
      if (e.tagName === "SPAN") e.parentNode.classList.add("editing");
      e.focus();
      e.addEventListener("keydown", (event) => {
        if (event.key === " " && e.tagName === "SUMMARY") {
          event.preventDefault();
          document.execCommand("insertText", false, " ");
        }
        if (event.key === "Enter") {
          event.preventDefault();
          e.blur();
        }
        if (event.key === "Escape") {
          const file = this.flatten(this.project.index).find(
            (i) => this.idFromPath(i.path) === (e.id || e.parentNode.id)
          );
          e.innerText = file.name;
          e.blur();
        }
      });
      e.addEventListener("blur", this.renameItem.bind(this, e));

      // TODO: Remove deprecated code
      document.execCommand("selectAll", false, "");
    }, 300);
  }

  throttle(f, delay) {
    // Based on https://www.geeksforgeeks.org/javascript-throttling/
    let prev = 0;
    let timeout: number;

    return (...args) => {
      let now = new Date().getTime();

      if (now - prev > delay) {
        if (timeout !== null) clearTimeout(timeout);
        prev = now;

        return f(...args);
      } else {
        if (timeout !== null) clearTimeout(timeout);
        timeout = window.setTimeout(() => {
          prev = now;
          return f(...args);
        }, delay);
      }
    };
  }
  unlockProject() {
    // Don't unlock if you've detected another window locked it
    if (document.body.classList.contains("locked")) return false;
    try {
      fs.unlinkSync(path.resolve(this.projectPath, "../.lock"));
    } catch (err) {
      console.warn(err);
    }
    return true;
  }
  updateDetails(toUpdate) {
    if (this.readOnly)
      return alert("You cannot update novel details while in Read Only mode.");
    for (var key of Object.keys(toUpdate)) {
      if (this.project.metadata[key] !== undefined)
        this.project.metadata[key] = toUpdate[key];
    }
    this.saveProject();
  }
  async updateGoals(updateHTML = true) {
    let goals = this.project.goals
      .filter((g) => !g.archived)
      .map((g) => {
        let newGoal = g;
        newGoal.done = Math.min(
          this.wordCountTotal() - g.startingWords,
          g.words
        );
        newGoal.completed = newGoal.done >= g.words;

        return newGoal;
      })
      .filter((g) => !g.acknowledged)
      .sort((a, b) => {
        return a.words - a.done - (b.words - b.done);
      });

    if (goals.length && goals[0].type === "project" && goals[0].completed) {
      this.q("#projectGoalComplete__wordCount").innerText =
        goals[0].words.toLocaleString();
      this.q("#projectGoalComplete__days").innerText = Math.floor(
        (Date.now() - new Date(goals[0].date).getTime()) / (1000 * 60 * 60 * 24)
      ).toLocaleString();
      setTimeout(this.showModal.bind(this, "projectGoalComplete"), 1500);
      return;
    }

    if (goals.length) {
      this.q("#wordGoal").style = `--percent:${
        (100 * goals[0].done) / goals[0].words
      }%`;
      if (goals[0].completed) this.q("#wordGoal").classList.add("flash");
      else this.q("#wordGoal").classList.remove("flash");
    } else this.q("#wordGoal").style = `--percent:0%`;

    var goals_element = goals.map((g) => {
      return `<div ${g.completed ? 'class="completed"' : ""} style="--percent:${
        (g.done * 100) / g.words
      }%">
          ${g.type} goal: ${g.done} / ${g.words} words
          <span title="Archive Goal" class="archive" onclick="this.archiveGoal('${
            g.id
          }')"><i class="far fa-trash-alt"></i></span>
        </div>`;
    });
    var newGoals_element: string;

    if (updateHTML) {
      /* Acknowledged goals */
      let acknowledged = this.project.goals
        .filter((g) => !g.archived && g.acknowledged)
        .map((g) => {
          let newGoal = g;
          newGoal.done = Math.min(
            this.wordCountTotal() - g.startingWords,
            g.words
          );
          newGoal.completed = newGoal.done >= g.words;
          if (!newGoal.completed) newGoal.acknowledged = false;

          return newGoal;
        })
        .sort((a, b) => {
          return a.words - b.words;
        })
        .map((g) => {
          return `<div ${
            g.completed ? 'class="completed"' : ""
          } style="--percent:${(g.done * 100) / g.words}%">
            ${g.type} goal: ${g.done} / ${g.words} words
            <span title="Archive Goal" class="archive" onclick="this.archiveGoal('${
              g.id
            }')"><i class="far fa-trash-alt"></i></span>
          </div>`;
        });

      if (goals.length + acknowledged.length)
        this.q("#wordGoal__list").innerHTML =
          goals.join("") + acknowledged.join("");
      else
        this.q("#wordGoal__list").innerText = "You haven't set any goals yet.";

      /* Archived goals */
      let archived = this.project.goals
        .filter((g) => g.archived)
        .map((g) => {
          let newGoal = g;

          if (g.history) {
            if (g.type === "daily") {
              newGoal.daysCompleted = 0;
              g.history.forEach((h) => {
                if (h.progress >= g.words) {
                  if (newGoal.daysCompleted) newGoal.daysCompleted++;
                  else newGoal.daysCompleted = 0;
                }
              });

              newGoals_element = `<div ${
                newGoal.daysCompleted === newGoal.history!.length
                  ? 'class="completed"'
                  : ""
              } style="--percent:${
                (newGoal.daysCompleted * 100) / newGoal.history!.length
              }%">
                ${g.type} goal: completed ${newGoal.daysCompleted}/${
                newGoal.history!.length
              } days
              </div>`;
            } else {
              newGoals_element = `<div ${
                g.completed ? 'class="completed"' : ""
              } style="--percent:${(g.done * 100) / g.words}%">
                ${g.type} goal: ${g.done} / ${g.words} words
              </div>`;
            }
          }

          return newGoals_element;
        });

      this.q("#wordGoal__archived").innerHTML = archived.join("");
    }
  }

  updateLabelCSS() {
    const css = this.project.labels
      .map(
        (l) => `
          [data-label="${l.id}"] {
            --hue: ${l.color.hue}deg;
            --saturation: ${l.color.saturation}%;
            --lightness: ${l.color.lightness}%;
          }
        `
      )
      .join("")
      .replace(/\s/g, "");

    this.q("#style__labelColors").innerText = css;
  }
  async updateStats() {
    let content = marked(this.editor.value());
    var div = document.createElement("div");
    div.innerHTML = content;
    content = div.innerText;

    let stats: { words: string; lines: string } = {
      words: this.wordCount(content),
      lines: "",
    };

    this.flatten(this.project.index).find(
      (i: { path: any }) => i.path === this.currentFile.path
    ).words = stats.words;

    // If in the future the current word count should be saved as it updates, create a debounced function for it.
    // Currently, the word count is updated on init(), so the editor doesn't need to update the file.

    stats.words = stats.words.toLocaleString() + " words";

    stats.lines = content.split("\n").filter((l) => l.length).length + " lines";

    // Update stats element
    const editor__stats = document.getElementById("editor__stats");
    const novelStats__open = document.getElementById("editor__stats");
    const novelStats__words = document.getElementById("novelStats__words");

    if (editor__stats && novelStats__open && novelStats__words) {
      editor__stats.innerText = Object.values(stats).join(", ") + ".";

      // Update novel stats
      novelStats__open.innerText = this.currentFile.name;
      let totalWords = this.wordCountTotal();
      if (this.project.history.wordCount)
        this.project.history.wordCount[new Date().toISOString().split("T")[0]] =
          this.wordCountTotal();

      novelStats__words.innerText =
        totalWords.toLocaleString() +
        ` (${
          (totalWords < this.startingWords ? "" : "+") +
          (totalWords - this.startingWords).toLocaleString()
        })`;
    }

    this.updateGoals();
  }

  wordCount(t) {
    let value = typeof t === "undefined" ? this.editor.value() : t;

    let content = marked(value);
    var div = document.createElement("div");
    div.innerHTML = content;
    value = div.innerText;

    return value.split(/ |\n/).filter((w) => w.length).length;
  }

  wordCountTotal() {
    let totalWords = this.flatten(this.getProject().index).filter(
      (i: { words: any }) => i.words
    );
    if (!totalWords.length) totalWords = 0;
    else if (totalWords.length === 1) totalWords = totalWords[0].words;
    else {
      totalWords = totalWords.reduce(
        (a, b) => (a.words ? a.words : a) + b.words
      );
    }

    return totalWords;
  }
}

if (inEditor) {
} else if (page === "index") {
  const Parser = require("rss-parser");
  const parser = new Parser();
  (async () => {
    const releases__list = document.getElementById("releases__list");

    if (releases__list) {
      try {
        const feed = await parser.parseURL(
          "https://github.com/benjaminbhollon/verbose-guacamole/releases.atom"
        );
        const currentVersion = require("./package.json").version;
        releases__list.innerHTML = feed.items
          .map((item) => {
            const version = item.link.split("/").slice(-1)[0].slice(1);
            return `
          <div ${version === currentVersion ? 'class="current"' : ""}>
            <h3>${item.title}</h3>
            <details>
              <summary>Release Notes</summary>
              ${item.content.split("<hr>")[0]}
            </details>
            <p>${
              version === currentVersion
                ? `This is your current version.`
                : `<a href="javascript:this.openURI('${item.link}')">Download</a>`
            }</p>
          </div>
          `;
          })
          .join("<br>");
      } catch (err) {
        setTimeout(() => {
          releases__list.innerHTML = "<p>Can't get releases right now.</p>";
        }, 15);
      }
    }
  })();
}

// Fullscreen
const toggleFullScreen = (e) => {
  document.body.classList.toggle("focusMode");
  function escapeFunction(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      document.exitFullscreen();
      document.body.classList.remove("focusMode");
      document.removeEventListener("keydown", escapeFunction);
    }
  }
  if (!document.body.classList.contains("focusMode")) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
  document.body.addEventListener("keydown", escapeFunction);
  if (e !== null) toggleFullScreen(e);
};

const API = new Api();

// Respond to main process
ipcRenderer.on("app-close", () => {
  if (inEditor) {
    // Save files
    API.saveProject();

    // Unlock project for other sessions
    API.unlockProject();
  }
  ipcRenderer.send("closed");
});
ipcRenderer.on("reload", () => {
  if (inEditor) {
    // Save files
    API.saveFile(undefined);
    API.saveProject();

    // Unlock project for other sessions
    API.unlockProject();
  }

  location.reload();
});
ipcRenderer.on("relocate", (event, to) => {
  if (inEditor) {
    // Save files
    API.saveFile(undefined);
    API.saveProject();

    // Unlock project for other sessions
    API.unlockProject();
  }
  location.href = to;
});

if (inEditor) {
  ipcRenderer.send("appMenuEditor");
} else {
  ipcRenderer.send("appMenuDefault");
  // module.exports = {
  //   openProject() {
  //     ipcRenderer.send('openProject');
  //   },
  //   openURI(uri)  {
  //     shell.openExternal(uri);
  //   },
  //   newProject() {
  //     ipcRenderer.send('newProject');
  //   },
  // };
}

setTimeout(
  () =>
    console.info(
      "%cWARNING!",
      "font-size: 3em;color:red",
      "\nDo not copy/paste code in here unless you know EXACTLY what you're doing! Running code from external sources could give hackers unexpected access to your device."
    ),
  1500
);
