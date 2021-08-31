// Include packages
import * as path from "path";
import * as fs from "fs";
import { shell, ipcRenderer } from "electron";
import simpleGit, {SimpleGit} from 'simple-git';
import marked from "marked";
import EasyMDE from "easymde";
import * as Typo from "typo-js";

// Types
type goal = {id: string; type: string; words: number; date: string; startingWords: number; archived: boolean; acknowledged?: boolean;history: {date: any, progress: any}[], final?: number, done?, completed?, daysCompleted?}
type label = {
  id: string;
  name: string;
  description: string;
  color: {hue?, saturation?, lightness?};
};

// Themes
let themeId = localStorage.theme ? localStorage.theme : "guacamole";
let themeLocations = {
  guacamole: path.resolve("./app/assets/css/themes/guacamole.css"),
};

let paths: { data: string; novels: string };
(async () => {
  // Get app data directory
  await new Promise<void>((resolve, reject) => {
    ipcRenderer.send("getDirs");
    ipcRenderer.on("getDirs", (event, data, novels) => {
      paths = {
        data,
        novels,
      };
      resolve();
    });
  });
})();

const page = path.parse(location.href.split("?")[0]).name;
const inEditor = page === 'editor';

let api = {
  openProject: () => {
    ipcRenderer.send("openProject");
  },
  openURI: (uri: string) => {
    shell.openExternal(uri);
  },
  newProject: () => {
    // TODO: this shouldn't return null but handle in case something goes really wrong
    document.getElementById("newProject")!.classList.add("visible");
  },
  updateNewProjectModal: () => {
    q("#newProject__saveLocation")!.innerText = (<HTMLInputElement>q(
      "#newProject__folder"
    )!).value = path.resolve(
      paths.novels,
      (<HTMLInputElement>q("#newProject__title")!).value.trim().length
        ? (<HTMLInputElement>q("#newProject__title")!).value.trim()
        : "Untitled Novel"
    );
    const newProjectAuthor = <HTMLInputElement>q("#newProject__author")!;
    localStorage.defaultAuthor = newProjectAuthor.value;
  },
  loadTheme: () => {
    let link = document.createElement("link");
    link.href = themeLocations[themeId];
    link.type = "text/css";
    link.rel = "stylesheet";

    document.getElementsByTagName("head")[0].appendChild(link);
  },
};

// Quick versions of document.querySelector and document.querySelectorAll
const q = (s: string): HTMLElement | HTMLInputElement | HTMLDetailsElement => document.querySelector(s)!;
const qA = (s: string): NodeListOf<Element> => document.querySelectorAll(s);

if (inEditor) {
  // Initialize variables
  let git: SimpleGit;
  let placeholders = [
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
  let editor: EasyMDE | null,
  currentFile: { path: any; name: string },
  currentlyDragging: any,
  hoveringOver: any,
  togglePreview: any;
  let sprint: { interval?: any; end?: any; total?: any; start?: number; startingWords?: any; } = {};
  let projectPath: fs.PathOrFileDescriptor;
  let clearing: boolean, readOnly = false;
  let gitEnabled = true;
  let startingWords = 0;

  const endSprintSound: HTMLAudioElement = new Audio("./assets/audio/sprintDone.mp3");
  const dictionary: any = new Typo("en_US");

  let customDictionary: any[];

  // Define what separates a word
  const rx_word = '!"“”#$%&()*+,-–—./:;<=>?@[\\]^_`{|}~ ';
  const _toggleFullScreen = inEditor ? EasyMDE.toggleFullScreen : () => null;

  // Random int from min to max
  function rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  // hex to hsl based on https://gist.github.com/xenozauros/f6e185c8de2a04cdfecf
  function hexToHSL(hex: string) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
    let r: number = parseInt(result[1], 16);
    let g: number = parseInt(result[2], 16);
    let b: number = parseInt(result[3], 16);
    (r /= 255), (g /= 255), (b /= 255);
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    var h: number = 0,
      s: number = 0,
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
    var HSL = new Object();
    HSL["hue"] = Math.round(h * 360);
    HSL["saturation"] = Math.round(s * 100);
    HSL["lightness"] = Math.round(l * 100);
    return HSL;
  }

  const editorAPI = {
    addGoal: (type: string, words: number) => {
      const allowedTypes = ["session", "daily", "project"];
      if (allowedTypes.indexOf(type) === -1) return false;
      if (typeof words !== "number" || words <= 0) return false;
      
      const newGoal: goal = {
        id: editorAPI.idFromPath(editorAPI.fileName()),
        type,
        words,
        history: [],
        date: new Date().toISOString(),
        startingWords: type === "project" ? 0 : editorAPI.wordCountTotal(),
        archived: false,
      };

      project.goals.push(newGoal);

      if (type === "daily") {
        newGoal['history'] = [];
      }

      (<HTMLDetailsElement>q("#wordGoal__addForm")!).open = false;

      editorAPI.updateGoals();
      editorAPI.saveProject();
      return true;
    },
    addToDictionary: (w: any) => {
      customDictionary.push(w);
      fs.writeFileSync(
        path.resolve(paths.data, "./customDictionary.txt"),
        customDictionary.join("\n")
      );

      return true;
    },
    archiveCompleteGoals: (includeProject = false) => {
      project.goals = project.goals.map((g: goal) => {
        let newGoal = g;
        if (editorAPI.wordCountTotal() - g.startingWords >= g.words) {
          if (g.type === "session" || (g.type === "project" && includeProject))
            newGoal.archived = true;
          if (g.type === "daily") newGoal.acknowledged = true;
        }

        return newGoal;
      });

      editorAPI.updateGoals(includeProject);

      editorAPI.saveProject();
    },
    archiveGoal: (id: any) => {
      const goal = project.goals.find((g) => g.id === id);
      if (typeof goal === "undefined") return false;

      if (goal.type === "daily") {
        goal.history?.push({
          date: goal.date,
          progress: editorAPI.wordCountTotal() - goal.startingWords,
        });
      }

      goal.archived = true;

      editorAPI.updateGoals();

      editorAPI.saveProject();
    },
    cancelSprint: () => {
      const currentWords = editorAPI.wordCountTotal();
      const written = currentWords - startingWords;

      q(
        "#wordSprint__status"
      ).innerText = `You wrote ${written.toLocaleString()} word${
        written !== 1 ? "s" : ""
      }. Impressive!`;

      (<any>q("#wordSprint")).style = "";
      q("#wordSprint__cancel").style.display = "none";
      q("#wordSprint").classList.remove("more");
      q("#wordSprint__popup").dataset.mode = "finished";
      q("#wordSprint").innerHTML = '<i class="fas fa-running"></i>';

      if (!(<HTMLInputElement>q("#wordSprint__checkbox")).checked) q("#wordSprint").click();

      clearInterval(sprint.interval);
      sprint = {};
    },
    checkout: async (what: string, editable: any, stash = true) => {
      if (!gitEnabled) {
        console.warn("Git is disabled!");
        return false;
      }
      if (!(what === "master" && editable) && stash) {
        await git.stash();
      }
      const result = await git.checkout(what);

      if (!editable) {
        readOnly = true;
        q("body").dataset.readonly = "true";
        q("#git__revertButton").dataset.hash = what;
      } else {
        readOnly = false;
        q("body").dataset.readonly = "false";
      }

      if (what === "master" && editable && stash) {
        await git.stash(["apply"]);
      }

      project = JSON.parse(
        fs.readFileSync(projectPath, {
          encoding: "utf8",
          flag: "r",
        })
      );
      currentFile = editorAPI
        .flatten(project.index)
        .filter((i: { children: any }) => typeof i.children === "undefined")[0];

      editorAPI.openFile(currentFile.path, currentFile.name, true);
      editorAPI.populateFiletree();
      editorAPI.populateGitHistory();
    },
    checkWord: (w: string) => {
      if (customDictionary.indexOf(w) !== -1) return true;
      return dictionary.check(w);
    },
    commit: async (m: any) => {
      if (!gitEnabled) {
        console.warn("Git is disabled!");
        return false;
      }
      const message = m ? m : (<HTMLInputElement>document.getElementById("git__commitText")).value;
      (<HTMLInputElement>document.getElementById("git__commitButton")).innerText = "Working...";

      try {
        await git.add("./*").commit(message);
        (<HTMLInputElement>document.getElementById("git__commitButton")).innerText = "Commit";
        (<HTMLInputElement>document.getElementById("git__commitText")).value = "";
      } catch (err) {
        window.alert(err);
      }

      setTimeout(editorAPI.populateGitHistory, 500);
    },
    createItem: (type: string, first = false) => {
      let folder = <any>q("#fileTree .active");
      let parent: Object[] = [];
      if (first) {
        parent = project.index;
      } else if (
        folder &&
        folder.tagName !== "DETAILS" &&
        folder.parentNode!.tagName === "DETAILS"
      ) {
        folder = folder.parentNode;
      } else if (folder === null || folder.tagName !== "DETAILS") {
        parent = project.index;
      }

      if (parent === null) {
        var parentFile = editorAPI
          .flatten(project.index)
          .find((i: { path: any }) => editorAPI.idFromPath(i.path) === folder.id);
        parent = parentFile.children;
      }

      const filePath = "./content/" + editorAPI.fileName();

      if (type === "file") {
        fs.writeFileSync(
          path.resolve(path.dirname(<string>projectPath), filePath),
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

      editorAPI.saveProject();

      editorAPI.populateFiletree();
      setTimeout(() => {
        if (type === "file") {
          editorAPI.openItem(editorAPI.idFromPath(filePath))!.click();
          if (!first)
            editorAPI.startRename(
              document.getElementById(editorAPI.idFromPath(filePath) + "__filename")
            );
        } else {
          // TODO: These types need to be set to be more accurate to the HTMLElement type we expect
          (<any>document.getElementById(editorAPI.idFromPath(filePath))).click();
          (<any>document.getElementById(editorAPI.idFromPath(filePath))).open = true;
        }
      }, 0);
    },
    createLabel: (name: any, color: any, description = "") => {
      const label: label = {
        id: editorAPI.idFromPath(editorAPI.fileName()),
        name: name,
        description: "",
        color: hexToHSL(color),
      };

      project.labels.push(label);

      editorAPI.saveProject();
      editorAPI.populateFiletree();
      editorAPI.updateLabelCSS();
    },
    debounce: (f: (arg0: any) => void, delay: number | undefined) => {
      let timeout: number;
      return (...args: any) => {
        if (timeout !== null) clearTimeout(timeout);
        setTimeout(() => f(args), delay);
      };
    },
    deleteItem: () => {
      let item = q("#fileTree .active");
      if (
        !confirm(
          `Do you really want to delete this ${
            item.tagName === "SPAN" ? "file" : "folder and everything in it"
          }? There is no undo.`
        )
      )
        return;

      let file = editorAPI
        .flatten(project.index)
        .find(
          (i: { path: any }) =>
            editorAPI.idFromPath(i.path) ===
            (item.tagName === "SPAN" ? item.id : (<HTMLElement>item.parentNode).id)
        );

      function deleteInFolder(folder: any) {
        for (const f of folder) {
          if (f.children) {
            deleteInFolder(f.children);
          } else {
            fs.unlinkSync(path.resolve(path.dirname(<string>projectPath), f.path));
          }
        }
      }

      if (item.tagName === "SPAN") {
        fs.unlinkSync(path.resolve(path.dirname(<string>projectPath), file.path));
      } else if (item.tagName === "SUMMARY") {
        deleteInFolder(file.children);
      }

      file.delete = true;

      project.index = project.index.filter((i) => !(<any>i).delete);

      (item.tagName === "SPAN" ? <HTMLElement>item : <HTMLElement>item.parentNode)!.remove();

      setTimeout(() => {
        const foundCurrent = editorAPI
          .flatten(project.index)
          .find(
            (f: { path: any }) => editorAPI.idFromPath(f.path) === project.openFile
          );
        if (typeof foundCurrent === "undefined") {
          if (
            editorAPI
              .flatten(project.index)
              .filter(
                (i: { children: any }) => typeof i.children === "undefined"
              ).length
          ) {
            currentFile = editorAPI
              .flatten(project.index)
              .filter(
                (i: { children: any }) => typeof i.children === "undefined"
              )[0];
            (<HTMLElement>document.getElementById(editorAPI.idFromPath(currentFile.path))).click();
            editorAPI.openFile(currentFile.path, currentFile.name, true);
          } else {
            editorAPI.createItem("file", true);
          }
        }
        editorAPI.saveProject();
      }, 0);
    },
    editorValue: (v: any) => {
      if (editor === null) return;

      if (v) {
        return editor.value(v);
      } else {
        return editor.value();
      }
    },
    fileName: () => {
      const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
      return (
        new Array(16)
          .map((l) => chars[Math.floor(Math.random() * chars.length)])
          .join("") + ".md"
      );
    },
    flatten: (arr: any[]) => {
      let newArr = arr;
      newArr = arr
        .map((i: { children: any }) => {
          // If there are children, add them to the top-level list
          if (i.children) return [i, editorAPI.flatten(i.children)];
          else return i;
        })
        .flat(Infinity);
      return newArr;
    },
    focusItem: (id: string) => {
      const element: HTMLElement =
        document.getElementById(id)!.tagName === "SPAN"
          ? document.getElementById(id)!
          : document.getElementById(id)!.querySelector("summary")!;
      if (
        element.contentEditable === "true" ||
        element.classList.contains("editing")
      )
        return;
      if (element.classList.contains("active") && event!.type !== "contextmenu")
        return editorAPI.startRename(
          element.tagName === "SPAN"
            ? element.querySelector(".filename")!
            : element
        );
      if (q("#fileTree .active"))
        q("#fileTree .active").classList.toggle("active");
      element.classList.toggle("active");
    },
    getLabel: (id: any) => {
      return project.labels.find((l) => l.id === id);
    },
    getProject: () => {
      return { ...project };
    },
    idFromPath: (p: string) => {
      return p.split("/").slice(-1)[0].split(".")[0];
    },
    ignoreLock: () => {
      readOnly = false;
      q("body").dataset.readonly = "false";
      editorAPI.openFile(currentFile.path, currentFile.name, true);
    },
    init: async (params) => {
      try {
        customDictionary = fs
          .readFileSync(path.resolve(paths.data, "./customDictionary.txt"), {
            encoding: "utf8",
            flag: "r",
          })
          .split("\n")
          .filter((l) => l.length);
      } catch (err) {
        console.error(err);
        fs.writeFileSync(
          path.resolve(paths.data, "./customDictionary.txt"),
          ""
        );
      }

      const urlparams = new URLSearchParams().get(params.x);
      const newProjectPath = params.f;

      // Create project directory if necessary
      if (params.new) {
        if (!fs.existsSync(paths.novels)) {
          fs.mkdirSync(paths.novels);
        }
        if (!fs.existsSync(newProjectPath)) {
          fs.mkdirSync(newProjectPath);
        }
      }

      // Initialize git in project directory
      git = simpleGit({
        baseDir: params.new ? <string>projectPath : path.dirname(<string>projectPath),
      });
      try {
        await git.init();
      } catch (err) {
        console.warn("Git is not installed. Continuing without.");
        gitEnabled = false;
        q("#git").classList.add("disabled");
      }

      if (params.new) {
        console.info("New project alert! Let me get that set up for you...");
        project.metadata = {
          title: params["meta.title"],
          author: params["meta.author"],
          synopsis: params["meta.synopsis"],
        };
        console.info("Creating project file...");
        projectPath = path.resolve(<string>projectPath, "project.vgp");
        fs.writeFile(
          projectPath,
          JSON.stringify(project),
          {
            encoding: "utf8",
            flag: "w",
          },
          (err) => {
            if (err)
              throw new Error(err.message);
            else {
              console.info("File written successfully!");
            }
          }
        );
        console.info("Creating title page...");
        try {
          fs.mkdirSync(path.resolve(path.dirname(projectPath), "./content"));
        } catch (err) {
          console.warn(err);
        }
        fs.writeFile(
          path.resolve(path.dirname(projectPath), project.index[0].path),
          `# ${project.metadata.title}\nby ${project.metadata.author}`,
          {
            encoding: "utf8",
            flag: "w",
          },
          (err) => {
            if (err)
              throw new Error(err.message);
            else {
              console.info("File written successfully!");
            }
          }
        );
        currentFile = editorAPI
          .flatten(project.index)
          .filter(
            (i: { children: any }) => typeof i.children === "undefined"
          )[0];
        if (gitEnabled) {
          console.info("Creating initial commit...");
          await git.add("./*");
          await git.commit("Create project");
          await editorAPI.populateGitHistory();
        }

        console.info("Done! Changing URL to avoid refresh-slipups.");
        history.replaceState(null, "", "./editor.html?f=" + projectPath);
        startingWords = 0;

        fs.writeFileSync(
          path.resolve(path.dirname(projectPath), ".gitignore"),
          ".lock"
        );
      } else {
        if (gitEnabled) {
          if ((await git.branch()).all.length <= 0) {
            // Project started without git
            console.info("Creating initial commit...");
            await git.add("./*");
            await git.commit("Create project");
          }
          if ((await git.branch()).current !== "master")
            await editorAPI.checkout("master", true);

          editorAPI.populateGitHistory();
        }

        project = JSON.parse(
          fs.readFileSync(projectPath, {
            encoding: "utf8",
            flag: "r",
          })
        );
        currentFile = editorAPI
          .flatten(project.index)
          .filter(
            (i: { children: any }) => typeof i.children === "undefined"
          )[0];

        // Calculate word counts
        editorAPI
          .flatten(project.index)
          .filter((i: { children: any }) => typeof i.children === "undefined")
          .forEach((file: { words: any; path: string }) => {
            file.words = editorAPI.wordCount(
              fs.readFileSync(
                path.resolve(path.dirname(<string>projectPath), file.path),
                {
                  encoding: "utf8",
                  flag: "r",
                }
              )
            );
          });
        startingWords = editorAPI.wordCountTotal();

        /* Compatibility */

        // with v0.1.0
        if (typeof project.openFolders === "undefined")
          project.openFolders = [];

        // with <v0.1.2
        if (typeof project.openFile === "undefined")
          project.openFile = editorAPI.idFromPath(currentFile.path);

        const foundCurrent = editorAPI
          .flatten(project.index)
          .find(
            (f: { path: any }) => editorAPI.idFromPath(f.path) === project.openFile
          );
        if (typeof foundCurrent !== "undefined") currentFile = foundCurrent;

        // with <v0.2.1
        // I really don't know what this does. Why does final exist on the title element?
        /*if (typeof project.metadata.title !== "string")
          project.metadata.title = project.metadata.title.final;*/

        // with <v0.3.2
        if (typeof project.goals === "undefined") project.goals = [];
        if (typeof project.history === "undefined") project.history = {};
        if (typeof project.history.wordCount === "undefined")
          project.history.wordCount = {};

        // with <v0.3.3
        if (typeof project.labels === "undefined") project.labels = [];
      }

      // Lock project
      editorAPI.lockProject();

      // Update goals
      project.goals = project.goals.map((g) => {
        let goal = g;
        if (!g.id) goal.id = editorAPI.idFromPath(editorAPI.fileName());
        if (goal.type === "session") {
          goal.archived = true;
          goal.final = editorAPI.wordCountTotal();
        } else if (
          goal.type === "daily" &&
          !goal.archived &&
          (!goal.history || !goal.history.length ||
            goal.date.split("T")[0] < new Date().toISOString().split("T")[0])
        ) {
          goal.history.push({
            date: g.date,
            progress: editorAPI.wordCountTotal() - g.startingWords,
          });
          goal.startingWords = editorAPI.wordCountTotal();
          goal.date = new Date().toISOString();
        }

        return goal;
      });

      editorAPI.populateFiletree();
      editorAPI.openFile(currentFile.path, currentFile.name, true);
      editorAPI.updateLabelCSS();

      setTimeout(() => {
        (<HTMLElement>document.getElementById(editorAPI.idFromPath(currentFile.path))).click();
      }, 1000);
    },
    isGitEnabled: () => gitEnabled,
    isReadOnly: () => readOnly,
    labelFile: (fileId: any, labelId: undefined) => {
      const file = editorAPI
        .flatten(project.index)
        .find((f: { path: any }) => editorAPI.idFromPath(f.path) === fileId);

      if (editorAPI.getLabel(labelId) !== undefined || labelId === undefined) {
        file.label = labelId;
        editorAPI.populateFiletree();
      }
    },
    lockProject: () => {
      try {
        if (fs.statSync(path.resolve(<string>projectPath, "../.lock"))) {
          readOnly = true;
          document.body.classList.add("locked");
        }
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(err);
        }
      }

      fs.writeFileSync(path.resolve(<string>projectPath, "../.lock"), "");
      return true;
    },
    moveItem: (
      p: any,
      t: any,
      c: any,
      index: any,
      order: any,
      main = false
    ) => {
      const parent = p
        ? editorAPI.flatten(project.index).find((f: { path: any }) => f.path === p)
        : { children: project.index };
      const target = t
        ? editorAPI.flatten(project.index).find((f: { path: any }) => f.path === t)
        : { children: project.index };
      const currentlyDragging = editorAPI
        .flatten(project.index)
        .find((f: { path: any }) => f.path === c);

      // Remove from parent
      parent.children.splice(parent.children.indexOf(currentlyDragging), 1);

      // Add to target
      if (order) {
        target.children.splice(index, 0, JSON.stringify(currentlyDragging));
      } else {
        target.children.push(currentlyDragging);
      }

      target.children = target.children.map((c: string) => {
        if (typeof c === "string") return JSON.parse(c);
        else return c;
      });

      project.index = project.index.map((c) => {
        if (typeof c === "string") return JSON.parse(c);
        else return c;
      });

      editorAPI.populateFiletree();

      // Save
      editorAPI.saveProject();
    },
    openFile: (p: string, n: any, first = false) => {
      if (
        currentFile ===
          editorAPI.flatten(project.index).find((i: { path: any }) => i.path === p) &&
        !first
      )
        return;
      editorAPI.resetEditor();
      clearing = true;
      const value = fs.readFileSync(
        path.resolve(path.dirname(<string>projectPath), p),
        {
          encoding: "utf8",
          flag: "r",
        }
      );
      editor!.value(value);
      currentFile = editorAPI
        .flatten(project.index)
        .find((i: { path: any }) => i.path === p);
      clearing = false;

      // Calculate word counts
      editorAPI
        .flatten(project.index)
        .filter((i: { children: any }) => typeof i.children === "undefined")
        .forEach((file: { words: any; path: string }) => {
          file.words = editorAPI.wordCount(
            fs.readFileSync(
              path.resolve(path.dirname(<string>projectPath), file.path),
              {
                encoding: "utf8",
                flag: "r",
              }
            )
          );
        });

      editorAPI.updateStats();
    },
    openItem: (id: string) => {
      const file = editorAPI
        .flatten(project.index)
        .find((i: { path: any }) => editorAPI.idFromPath(i.path) === id);
      editorAPI.openFile(file.path, file.name);
      project.openFile = id;
      editorAPI.saveProject();
      return document.getElementById(id);
    },
    placeholders,
    populateFiletree: () => {
      (<HTMLElement>document.getElementById("fileTree__list")).innerHTML = "";

      function drawLayer(
        layer: { name: string; path: string; words: number, children: { name: string; path: string; words: number; children: any; }[] | any, label: any }[],
        id: string
      ) {
        let html = "";

        for (var item of layer) {
          if (item.children) {
            html += `
            <details
              id="${editorAPI.idFromPath(item.path)}"
              ondragover='event.preventDefault()'
              ondrop='moveItem(event, getDraggingIndex())'
            >
              <summary
                class="folder"
                draggable="true"
                ondragstart="startMoveItem(event)"
                ondragend="stopMoveItem(event)"
                title="${item.name}"
                onclick='event.preventDefault();api.focusItem(this.parentNode.id);'
                ondblclick='this.parentNode.toggleAttribute("open");api.setOpenFolders();'
                oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();api.focusItem(this.parentNode.id);"
              >${item.name}</summary>
            </details>`;
            const itemClone = { ...item };
            setTimeout(() => {
              drawLayer(itemClone.children, editorAPI.idFromPath(itemClone.path));
            }, 0);
          } else {
            html += `
            <span
              class="file"
              id="${editorAPI.idFromPath(item.path)}"
              draggable="true"
              ondragstart="startMoveItem(event)"
              ondragend="stopMoveItem(event)"
              ondragover="setHovering(this)"
              ondrag="updatePageXY(event)"
            >
              <span
                id="${editorAPI.idFromPath(item.path)}__filename"
                class="filename"
                title="${item.name}"
                onclick='event.preventDefault();api.focusItem(this.parentNode.id)'
                ondblclick='api.openItem(this.parentNode.id)'
                oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();api.focusItem(this.parentNode.id);"
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
                      editorAPI.getLabel(item.label)!.name +
                      '". Click to edit.'
                }"
              >
                <div class="contextMenu">
                  ${
                    project.labels.length
                      ? project.labels
                          .map(
                            (l) =>
                              `<span
                        onclick="api.labelFile('${editorAPI.idFromPath(
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
                      : `<span onclick="api.labelFile('${editorAPI.idFromPath(
                          item.path
                        )}', undefined)">Remove Label</span>`
                  }
                  <hr>
                  <span onclick="api.showModal('createLabel')">Create Label</span>
                </div>
              </span>
            </span>`;
          }
        }

        (<HTMLElement>document.getElementById(id)).innerHTML += html;
      }
      drawLayer(project.index, "fileTree__list");

      editorAPI.restoreOpenFolders();
    },
    populateGitHistory: async () => {
      if (!gitEnabled) {
        console.warn("Git is disabled!");
        return false;
      }
      try {
        const log = await git.log();
        let html = log.all
          .map((h: { hash: any; message: any }) => {
            const preview = `<span class="preview" onclick="api.checkout('${h.hash}', false)"><i class="fa fa-eye"></i>`;
            return `<span id='commit-${h.hash}'>${h.message}${
              h.hash !== log.all[0].hash ? preview : ""
            }</span></span>`;
          })
          .reverse()
          .join("");
        q("#git__commits").innerHTML = html;

        q("#git").scrollTop = q("#git").scrollHeight;
      } catch (err) {
        console.error(err);
      }
    },
    resetEditor: () => {
      clearing = true;

      // If the editor already exists, clear it
      if (editor) {
        editor.value("");
        editor.toTextArea();
      }
      placeholderN = Date.now() % (editorAPI.placeholders.length - 1);
      let options: EasyMDE.Options = {
        element: <HTMLElement>document.getElementById("editorTextarea"),
        spellChecker: false,
        status: false,
        placeholder: editorAPI.placeholders[placeholderN],
        insertTexts: {
          image: ["![](https://", ")"],
        },
        hideIcons: [],
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
            action: <any>toggleFullScreen,
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
      if (readOnly) {
        options.hideIcons = ["side-by-side", "image", "preview"];
        options.placeholder = "";
      }

      editor = new EasyMDE(options);

      // Fullscreen
      const debouncedSaveFile = editorAPI.debounce(editorAPI.saveFile, 500);
      const throttledUpdateStats = editorAPI.throttle(editorAPI.updateStats, 50);
      editor.codemirror.on("change", () => {
        if (clearing) return;
        throttledUpdateStats();
        debouncedSaveFile();
      });
      clearing = false;

      editor.codemirror.addOverlay({
        token: function (stream: { peek: () => any; next: () => void }) {
          // Based on https://github.com/sparksuite/codemirror-spell-checker/blob/master/src/js/spell-checker.js
          var ch = stream.peek();
          var word = "";

          if (rx_word.includes(ch)) {
            stream.next();
            return null;
          }

          while ((ch = stream.peek()) != null && !rx_word.includes(ch)) {
            word += ch;
            stream.next();
          }

          if (editorAPI.checkWord(word.replace(/‘|’/g, "'")) !== true)
            return "spell-error"; // CSS class: cm-spell-error

          return null;
        },
      });

      // TODO: What the heck?
      togglePreview = (<any>editor).toolbar.find(
        (t: { name: string }) => t.name === "preview"
      ).action;
      if (readOnly && !editor.isPreviewActive())
        setTimeout(() => {
          togglePreview(<any>editor);
        }, 0);
    },
    renameItem: (e: {
      contentEditable: boolean;
      tagName: string;
      parentNode: { classList: { remove: (arg0: string) => void }; id: any };
      innerText: { trim: () => { (): any; new (): any; length: number } };
      title: any;
    }) => {
      e.contentEditable = false;
      if (e.tagName === "SPAN") e.parentNode.classList.remove("editing");

      const file = editorAPI
        .flatten(project.index)
        .find((i: { path: any }) => editorAPI.idFromPath(i.path) === e.parentNode.id);

      if (e.innerText.trim().length <= 0 || e.innerText.trim() === file.name) {
        e.innerText = file.name;
        return;
      }

      file.name = e.innerText.trim();
      e.title = e.innerText.trim();

      if (file.path === currentFile.path) editorAPI.updateStats();

      editorAPI.saveProject();
    },
    restoreOpenFolders: () => {
      const toOpen = project.openFolders;
      for (const folder of toOpen) {
        try {
          // TODO: I don't like these any types...
          (<any>document.getElementById(folder.id)).open = folder.open;
        } catch (err) {
          setTimeout(editorAPI.restoreOpenFolders, 0);
        }
      }
    },
    revertTo: async (where: any, name: any) => {
      if (!gitEnabled) {
        console.warn("Git is disabled!");
        return false;
      }

      const range = `${where}..HEAD`;

      await git.reset({ "--hard": null });

      await editorAPI.checkout("master", false, false);

      await git.stash();

      await git.revert(range, { "--no-commit": null });

      await editorAPI.commit(`Revert to "${q(`#commit-${where}`).innerText}"`);

      await editorAPI.checkout("master", true, false);
    },
    saveFile: (v: null) => {
      if (readOnly) return false;
      let p = currentFile.path;
      let value: string = "";
      if (!v) value = (<any>editor).value();

      fs.writeFileSync(path.resolve(path.dirname(<string>projectPath), p), value);
    },
    saveProject: () => {
      if (readOnly) return false;
      fs.writeFileSync(path.resolve(<string>projectPath), JSON.stringify(project));
    },
    setOpenFolders: () => {
      let folders = <any>[...qA("#fileTree__list details")];

      folders = folders.map((folder: { id: any; open: any; }) => {
        return {
          id: folder.id,
          open: folder.open,
        };
      });

      project.openFolders = [...folders];

      editorAPI.saveProject();
    },
    showModal: (name: any) => {
      let modal: HTMLElement;
      switch (name) {
        case "projectDetails":
          if (readOnly)
            return alert(
              "You cannot update novel details while in Read Only mode."
            );
          modal = <HTMLElement>document.getElementById("projectDetails");

          // Restore values
          (<HTMLInputElement>document.getElementById("projectDetails__title")).value =
            project.metadata.title;
          (<HTMLInputElement>document.getElementById("projectDetails__author")).value =
            project.metadata.author;
          (<HTMLInputElement>document.getElementById("projectDetails__synopsis")).value =
            project.metadata.synopsis;

          modal.classList.add("visible");
          break;
        case "projectGoalComplete":
          modal = <HTMLElement>document.getElementById("projectGoalComplete");
          modal.classList.add("visible");
          break;
        case "createLabel":
          modal = <HTMLElement>document.getElementById("createLabel");
          modal.classList.add("visible");
          break;
        default:
          throw new Error(`There is no modal named '${name}'`);
          break;
      }
    },
    startSprint: (s = 0, m = 0, h = 0) => {
      if (!(s + m + h)) return; // smh = shaking my head (because you set a timer for 0)

      const start = Date.now();
      const end = start + 1000 * s + 1000 * 60 * m + 1000 * 60 * 60 * h;

      q("#wordSprint").click();

      sprint = {
        start,
        end,
        startingWords: editorAPI.wordCountTotal(),
        total: end - start,
        interval: setInterval(() => {
          const currentWords = editorAPI.wordCountTotal();
          const written = currentWords - startingWords;
          q(
            "#wordSprint__status"
          ).innerText = `You've written ${written.toLocaleString()} word${
            written !== 1 ? "s" : ""
          }. Keep up the good work!`;

          let timeLeft = sprint.end - Date.now();

          let percent = 1 - timeLeft / sprint.total;

          (<any>q("#wordSprint")).style = `--percent:${percent};`;
          if (percent > 0.5) q("#wordSprint").classList.add("more");

          if (timeLeft < 0) {
            q(
              "#wordSprint__status"
            ).innerText = `You wrote ${written.toLocaleString()} word${
              written !== 1 ? "s" : ""
            }. Impressive!`;

            (<any>q("#wordSprint")).style = "";
            q("#wordSprint").classList.remove("more");
            q("#wordSprint__popup").dataset.mode = "finished";
            q("#wordSprint").innerHTML = '<i class="fas fa-running"></i>';

            if (!(<HTMLInputElement>q("#wordSprint__checkbox")).checked) q("#wordSprint").click();

            endSprintSound.play();

            clearInterval(sprint.interval);
            sprint = {};
            return;
          }

          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          timeLeft -= hoursLeft * 1000 * 60 * 60;
          const minutesLeft = Math.floor(timeLeft / (1000 * 60));
          timeLeft -= minutesLeft * 1000 * 60;
          const secondsLeft = Math.floor(timeLeft / 1000);

          (<HTMLElement>document.getElementById(
            "wordSprint__timeLeft"
          )).innerText = `${hoursLeft}:${
            minutesLeft < 10 ? 0 : ""
          }${minutesLeft}:${secondsLeft < 10 ? 0 : ""}${secondsLeft}`;
        }, Math.max(Math.floor(end - start) / 360, 25)),
      };

      (<HTMLElement>document.getElementById("wordSprint")).classList.add("pie-chart");

      (<HTMLElement>document.getElementById("wordSprint")).innerHTML =
        '<span class="pie"><span class="segment"></span></span>';
      document.getElementById("wordSprint__popup")!.dataset.mode = "running";
    },
    suggestWords: (w: any) => {
      return dictionary.suggest(w);
    },
    startRename: (e) => {
      const isOpen = e.tagName === "SUMMARY" ? e.parentNode.open : currentFile;
      setTimeout(() => {
        if (
          isOpen !== (e.tagName === "SUMMARY" ? e.parentNode.open : currentFile)
        )
          return;
        e.contentEditable = true;
        if (e.tagName === "SPAN") e.parentNode.classList.add("editing");
        e.focus();
        e.addEventListener(
          "keydown",
          (event: { key: string; preventDefault: () => void }) => {
            if (event.key === " " && e.tagName === "SUMMARY") {
              event.preventDefault();
              document.execCommand("insertText", false, " ");
            }
            if (event.key === "Enter") {
              event.preventDefault();
              e.blur();
            }
            if (event.key === "Escape") {
              const file = editorAPI
                .flatten(project.index)
                .find(
                  (i) =>
                  editorAPI.idFromPath(i.path) === (e.id || e.parentNode.id)
                );
              e.innerText = file.name;
              e.blur();
            }
          }
        );
        e.addEventListener("blur", editorAPI.renameItem.bind(this, e));
        document.execCommand("selectAll", false);
      }, 300);
    },
    throttle: (f: (arg0: any) => void, delay: number) => {
      // Based on https://www.geeksforgeeks.org/javascript-throttling/
      let prev = 0;
      let timeout: number;

      return (...args: any) => {
        let now = new Date().getTime();

        if (now - prev > delay) {
          if (timeout !== null) clearTimeout(timeout);
          prev = now;

          return f(args);
        } else {
          if (timeout !== null) clearTimeout(timeout);
          setTimeout(() => {
            prev = now;
            return f(args);
          }, delay);
        }
      };
    },
    unlockProject: () => {
      // Don't unlock if you've detected another window locked it
      if (document.body.classList.contains("locked")) return false;
      try {
        fs.unlinkSync(path.resolve(<string>projectPath, "../.lock"));
      } catch (err) {
        console.warn(err);
      }
      return true;
    },
    updateDetails: (toUpdate: { [x: string]: any }) => {
      if (readOnly)
        return alert(
          "You cannot update novel details while in Read Only mode."
        );
      for (var key of Object.keys(toUpdate)) {
        if (project.metadata[key] !== undefined)
          project.metadata[key] = toUpdate[key];
      }
      editorAPI.saveProject();
    },
    updateGoals: async (updateHTML = true) => {
      let goals = project.goals
        .filter((g) => !g.archived)
        .map((g) => {
          let newGoal = g;
          newGoal.done = Math.min(
            editorAPI.wordCountTotal() - g.startingWords,
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
        const goalDate = new Date(goals[0].date);

        q("#projectGoalComplete__wordCount").innerText =
          goals[0].words.toLocaleString();
        q("#projectGoalComplete__days").innerText = Math.floor(
          (Date.now() - goalDate.getTime()) / (1000 * 60 * 60 * 24)
        ).toLocaleString();
        setTimeout(editorAPI.showModal.bind(this, "projectGoalComplete"), 1500);
        return;
      }

      if (goals.length) {
        (<any>q("#wordGoal")).style = `--percent:${
          (100 * goals[0].done) / goals[0].words
        }%`;
        if (goals[0].completed) q("#wordGoal").classList.add("flash");
        else q("#wordGoal").classList.remove("flash");
      } else (<any>q("#wordGoal")).style = `--percent:0%`;

      const goalsElements = goals.map((g: goal) => {
        return `<div ${
          g.completed ? 'class="completed"' : ""
        } style="--percent:${(g.done * 100) / g.words}%">
            ${g.type} goal: ${g.done} / ${g.words} words
            <span title="Archive Goal" class="archive" onclick="api.archiveGoal('${
              g.id
            }')"><i class="far fa-trash-alt"></i></span>
          </div>`;
      });

      if (updateHTML) {
        /* Acknowledged goals */
        let acknowledged = project.goals
          .filter((g) => !g.archived && g.acknowledged)
          .map((g) => {
            let newGoal = g;
            newGoal.done = Math.min(
              editorAPI.wordCountTotal() - g.startingWords,
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
              <span title="Archive Goal" class="archive" onclick="api.archiveGoal('${
                g.id
              }')"><i class="far fa-trash-alt"></i></span>
            </div>`;
          });

        if (goals.length + acknowledged.length)
          q("#wordGoal__list").innerHTML =
            goals.join("") + acknowledged.join("");
        else q("#wordGoal__list").innerText = "You haven't set any goals yet.";

        /* Archived goals */
        let archived = project.goals
          .filter((g) => g.archived)
          .map((g) => {
            let newGoal: goal = g;
            let archivedGoal;

            if (g.type === "daily") {
              newGoal.daysCompleted = 0;
              g.history.forEach((h: { progress: number }) => {
                if (h.progress >= g.words) newGoal.daysCompleted++;
              });

              archivedGoal = `<div ${
                newGoal.daysCompleted === newGoal.history.length
                  ? 'class="completed"'
                  : ""
              } style="--percent:${
                (newGoal.daysCompleted * 100) / newGoal.history.length
              }%">
                ${g.type} goal: completed ${newGoal.daysCompleted}/${
                newGoal.history.length
              } days
              </div>`;
            } else {
              archivedGoal = `<div ${
                g.completed ? 'class="completed"' : ""
              } style="--percent:${(g.done * 100) / g.words}%">
                ${g.type} goal: ${g.done} / ${g.words} words
              </div>`;
            }
            return archivedGoal;
          });

        q("#wordGoal__archived")!.innerHTML = archived.join("");
      }
    },
    updateLabelCSS: () => {
      const css = project.labels
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

      q("#style__labelColors").innerText = css;
    },
    updateStats: async () => {
      let content = marked((<any>editor).value());
      var div = document.createElement("div");
      div.innerHTML = content;
      content = div.innerText;
      let stats = {words};

      stats.words = editorAPI.wordCount(content);

      api
        .flatten(project.index)
        .find((i: { path: any }) => i.path === currentFile.path).words =
        stats.words;

      // If in the future the current word count should be saved as it updates, create a debounced function for it.
      // Currently, the word count is updated on init(), so the editor doesn't need to update the file.

      stats.words = stats.words.toLocaleString() + " words";

      stats.lines =
        content.split("\n").filter((l: string | any[]) => l.length).length +
        " lines";

      // Update stats element
      document.getElementById("editor__stats")!.innerText =
        Object.values(stats).join(", ") + ".";

      // Update novel stats
      document.getElementById("novelStats__open")!.innerText = currentFile.name;
      let totalWords = editorAPI.wordCountTotal();
      project.history.wordCount[new Date().toISOString().split("T")[0]] =
        editorAPI.wordCountTotal();

      document.getElementById("novelStats__words")!.innerText =
        totalWords.toLocaleString() +
        ` (${
          (totalWords < startingWords ? "" : "+") +
          (totalWords - startingWords).toLocaleString()
        })`;

      editorAPI.updateGoals();
    },
    wordCount: (t: any) => {
      let value = typeof t === "undefined" ? (<any>editor).value() : t;

      let content = marked(value);
      var div = document.createElement("div");
      div.innerHTML = content;
      value = div.innerText;

      return value.split(/ |\n/).filter((w: string | any[]) => w.length).length;
    },
    wordCountTotal: (): number => {
      let wordCount: number;
      let totalWords = editorAPI
        .flatten(editorAPI.getProject().index)
        .filter((i: { words: any }) => i.words);
      if (!totalWords.length) wordCount = 0;
      else if (totalWords.length === 1) wordCount = totalWords[0].words;
      else {
        wordCount = totalWords.reduce(
          (a: { words: any }, b: { words: any }) =>
            (a.words ? a.words : a) + b.words
        );
      }

      return wordCount;
    },
  };

  api = { ...editorAPI, ...api };

  let project: {metadata: {title: string, author: string, synopsis: string}, index: {name: string, path: string, words: number}[] | any, openFolders: {id: string, open: any}[], goals: goal[], history: {wordCount?: { [x: string]: any; }}, labels: label[], openFile?: string}
  
  project = {
    metadata: {
      title: "Untitled Novel",
      author: "",
      synopsis: "",
    },
    index: [
      {
        name: "Title Page",
        path: "./content/" + editorAPI.fileName(),
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
  let placeholderN = Date.now() % editorAPI.placeholders.length;

  ipcRenderer.on("updateProjectDetails", () => {
    editorAPI.showModal("projectDetails");
  });
  ipcRenderer.on("toggleFullScreen", () => {
    toggleFullScreen(<any>editor);
  });
} else if (page === "index") {
  const Parser = require("rss-parser");
  const parser = new Parser();
  (async () => {
    try {
      const feed = await parser.parseURL(
        "https://github.com/benjaminbhollon/verbose-guacamole/releases.atom"
      );
      const currentVersion = require("./package.json").version;
      document.getElementById("releases__list")!.innerHTML = feed.items
        .map((item: { link: string; title: any; content: string }) => {
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
              : `<a href="javascript:api.openURI('${item.link}')">Download</a>`
          }</p>
        </div>
        `;
        })
        .join("<br>");
    } catch (err) {
      setTimeout(() => {
        document.getElementById("releases__list")!.innerHTML =
          "<p>Can't get releases right now.</p>";
      }, 15);
    }
  })();
}

// Fullscreen
const toggleFullScreen = (e: null): void => {
  document.body.classList.toggle("focusMode");
  function escapeFunction(event: { key: string; preventDefault: () => void }) {
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
  // TODO: figure out what this is supposed to do
  //if (e !== null) _toggleFullScreen(e);
};

// Respond to main process
ipcRenderer.on("app-close", () => {
  if (inEditor) {
    // Save files
    (<any>api).saveFile();
    (<any>api).saveProject();

    // Unlock project for other sessions
    (<any>api).unlockProject();
  }
  ipcRenderer.send("closed");
});
ipcRenderer.on("reload", () => {
  if (inEditor) {
    // Save files
    (<any>api).saveFile();
    (<any>api).saveProject();

    // Unlock project for other sessions
    (<any>api).unlockProject();
  }

  location.reload();
});
ipcRenderer.on("relocate", (event, to) => {
  if (inEditor) {
    // Save files
    (<any>api).saveFile();
    (<any>api).saveProject();

    // Unlock project for other sessions
    (<any>api).unlockProject();
  }
  location.href = to;
});
ipcRenderer.on("newProject", (event, to) => {
  if (inEditor) {
    // Save files
    (<any>api).saveFile();
    (<any>api).saveProject();

    // Unlock project for other sessions
    (<any>api).unlockProject();
  }

  api.newProject();
});
ipcRenderer.on("setTheme", (event, id) => {
  localStorage.theme = id;
  if (inEditor) {
    // Save files
    (<any>api).saveFile();
    (<any>api).saveProject();

    // Unlock project for other sessions
    (<any>api).unlockProject();
  }

  location.reload();
});

if (inEditor) {
  ipcRenderer.send("appMenuEditor");
} else {
  ipcRenderer.send("appMenuDefault");
}

module.exports = api;

setTimeout(() => {
  // Add "Create Project" modal
  q("#modals")!.innerHTML += fs.readFileSync(
    "./app/assets/html/newProjectModal.html"
  );
  q("#newProject__author")!.value = localStorage.defaultAuthor;
  api.updateNewProjectModal();

  console.info(
    "%cWARNING!",
    "font-size: 3em;color:red",
    "\nDo not copy/paste code in here unless you know EXACTLY what you're doing! Running code from external sources could give hackers unexpected access to your device."
  );
}, 3000);
}