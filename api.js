// Include packages
const path = require('path');
const { ipcRenderer } = require('electron');

const inEditor = path.parse(location.href.split('?')[0]).name === 'editor';

let api = {};

if (inEditor) {
  const fs = require('fs');
  const simpleGit = require('simple-git');
  const querystring = require('querystring');
  const marked = require('marked');
  const EasyMDE = require('easymde');
  const Typo = require('typo-js');

  // Initialize variables
  let git = null;
  let placeholders = [
    'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going to Heaven, we were all going direct the other way. (A Tale of Two Cities)',
    'It was a dark and stormy night. (A Wrinkle in Time)',
    'Call me Ishmael. (Moby Dick)',
    'It was a pleasure to burn. (Fahrenheit 451)',
    'It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife. (Pride and Prejudice)',
    'In a hole in the ground there lived a hobbit. (The Hobbit)',
    'Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small, unregarded yellow sun. (The Hitchhiker\'s Guide to the Galaxy)',
    'It was a bright cold day in April, and the clocks were striking thirteen. (1984)',
    'All children, except one, grow up. (Peter Pan)',
    'There was a boy called Eustace Clarence Scrubb, and he almost deserved it. (Voyage of the Dawn Treader)',
    'The drought had lasted now for ten million years, and the reign of the terrible lizards had long since ended. (2001: A Space Odyssey)',
    'When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow. (To Kill a Mockingbird)',
    'There was no possibility of taking a walk that day. (Jane Eyre)',
    'First the colors. Then the humans. (The Book Thief)',
    '“Where’s Papa going with that ax?” (Charlotte\'s Web)',
    'The thousand injuries of Fortunato I had borne as I best could, but when he ventured upon insult I vowed revenge. (The Cask of Amontillado)',
    'Happy families are all alike; every unhappy family is unhappy in its own way. (Anna Karenina)',
  ];
  let editor = null;
  let currentFile = null;
  let clearing = false;
  let currentlyDragging = null;
  let hoveringOver = null;
  let appPath = null;
  let startingWords = 0;
  let sprint = {}
  let params = {};
  let projectPath = {};
  let readOnly = false;
  let togglePreview = null;
  let gitEnabled = true;
  const endSprintSound = new Audio('./assets/audio/sprintDone.mp3');
  const dictionary = new Typo('en_US');

  let customDictionary = [];

  // Quick versions of document.querySelector and document.querySelectorAll
  const q = s => document.querySelector(s);
  const qA = s => document.querySelectorAll(s);

  // Define what separates a word
  const rx_word = "!\"“”#$%&()*+,-–—./:;<=>?@[\\]^_`{|}~ ";
  _toggleFullScreen = inEditor ? EasyMDE.toggleFullScreen : () => null;

  api = {
    addGoal: (type, words) => {
      const allowedTypes = [
        'session',
        'daily',
        'project'
      ];
      if (allowedTypes.indexOf(type) === -1) return false;
      if (typeof words !== 'number' || words <= 0) return false;

      let newGoal = {
        id: api.idFromPath(api.fileName()),
        type,
        words,
        date: (new Date()).toISOString(),
        startingWords: (type === 'project' ? 0 : api.wordCountTotal()),
        archived: false
      }

      project.goals.push(newGoal);

      if (type === 'daily') {
        newGoal.history = [];
      }

      q('#wordGoal__addForm').open = false;

      api.updateGoals();
      api.saveProject();
      return true;
    },
    addToDictionary: (w) => {
      customDictionary.push(w);
      fs.writeFileSync(path.resolve(appPath, './customDictionary.txt'), customDictionary.join('\n'));

      return true;
    },
    archiveCompleteGoals: (includeProject = false) => {
      project.goals = project.goals.map(g => {
        let newGoal = g;
        if (api.wordCountTotal() - g.startingWords >= g.words) {
          if (g.type === 'session' || (g.type === 'project' && includeProject)) newGoal.archived = true;
          if (g.type === 'daily') newGoal.acknowledged = true;
        }

        return newGoal;
      });

      api.updateGoals(includeProject);

      api.saveProject();
    },
    archiveGoal: (id) => {
      const goal = project.goals.find(g => g.id === id);
      if (typeof goal === 'undefined') return false;

      if (goal.type === 'daily') {
        goal.history.push({
          date: goal.date,
          progress: api.wordCountTotal() - goal.startingWords
        });
      }

      goal.archived = true;

      api.updateGoals();

      api.saveProject();
    },
    cancelSprint: () => {
      const currentWords = api.wordCountTotal();
      const written = currentWords - startingWords;

      q('#wordSprint__status').innerText =
        `You wrote ${written.toLocaleString()} word${written !== 1 ? 's' : ''}. Impressive!`;

      q('#wordSprint').style = '';
      q('#wordSprint__cancel').style.display = 'none';
      q('#wordSprint').classList.remove('more');
      q('#wordSprint__popup').dataset.mode = 'finished';
      q('#wordSprint').innerHTML = '<i class="fas fa-running"></i>';

      if (!q('#wordSprint__checkbox').checked)
        q('#wordSprint').click();

      clearInterval(sprint.interval);
      sprint = {};
    },
    checkout: async (what, editable, stash = true) => {
      if (!gitEnabled) {
        console.warn('Git is disabled!');
        return false;
      }
      if (!(what === 'master' && editable) && stash) {
        await git.stash();
      }
      const result = await git.checkout(what);

      if (!editable) {
        readOnly = true;
        q('body').dataset.readonly = 'true';
        q('#git__revertButton').dataset.hash = what;
      } else {
        readOnly = false;
        q('body').dataset.readonly = 'false';
      }

      if (what === 'master' && editable && stash) {
        await git.stash(['apply']);
      }

      project = JSON.parse(fs.readFileSync(projectPath, {
        encoding:'utf8',
        flag:'r'
      }));
      currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];

      api.openFile(currentFile.path, currentFile.name, true);
      api.populateFiletree();
      api.populateGitHistory();
    },
    checkWord: (w) => {
      if (
        customDictionary.indexOf(w) !== -1 ||
        !isNaN(w)
      ) return true;
      return dictionary.check(w);
    },
    commit: async (m) => {
      if (!gitEnabled) {
        console.warn('Git is disabled!');
        return false;
      }
      const message = m ? m : document.getElementById('git__commitText').value;
      document.getElementById('git__commitButton').innerText = 'Working...';

      try {
        await git.add('./*').commit(message)._chain;
        document.getElementById('git__commitButton').innerText = 'Commit';
        document.getElementById('git__commitText').value = '';
      } catch (err) {
        window.alert(err);
      }

      setTimeout(api.populateGitHistory, 500);
    },
    createItem: (type, first = false) => {
      let folder = q('#fileTree .active');
      let parent = null;
      if (first) {
        parent = project.index;
      } else if (folder && folder.tagName !== 'DETAILS' && folder.parentNode.tagName === 'DETAILS') {
        folder = folder.parentNode;
      } else if (folder === null || folder.tagName !== 'DETAILS') {
        parent = project.index;
      }

      if (parent === null) {
        var parentFile = api.flatten(project.index).find(i => api.idFromPath(i.path) === folder.id);
        parent = parentFile.children;
      }

      const filePath = './content/' + api.fileName();

      if (type === 'file') {
        fs.writeFileSync(
          path.resolve(path.dirname(projectPath), filePath),
          '',
          {
            encoding: 'utf8',
            flag: 'w'
          }
        );

        const newItem = {
          name: 'Untitled File',
          path: filePath,
          words: 0
        };

        if (first) {
          parent.splice(0, 0, newItem);
        } else {
          parent.push(newItem);
        }
      }
      else if (type === 'folder') parent.push({
        name: 'Untitled Folder',
        path: filePath,
        children: []
      });

      api.saveProject();

      api.populateFiletree();
      setTimeout(() => {
        if (type === 'file') {
          api.openItem(api.idFromPath(filePath)).click();
          if (!first) api.startRename(document.getElementById(api.idFromPath(filePath)));
        } else {
          document.getElementById(api.idFromPath(filePath)).click();
          document.getElementById(api.idFromPath(filePath)).open = true;
        }
      }, 0);
    },
    debounce: (f, delay) => {
      let timeout = null;
      return (...args) => {
        if (timeout !== null) clearTimeout(timeout);
        timeout = setTimeout(() => f(...args), delay);
      }
    },
    deleteItem: () => {
      let item = q('#fileTree .active');
      if (!confirm(`Do you really want to delete this ${item.tagName === 'SPAN' ? 'file' : 'folder and everything in it'}? There is no undo.`)) return;

      let file = api.flatten(project.index).find(i => api.idFromPath(i.path) === (item.tagName === 'SPAN' ? item.id : item.parentNode.id));

      function deleteInFolder(folder) {
        for (f of folder) {
          if (f.children) {
            deleteInFolder(f.children);
          } else {
            fs.unlinkSync(path.resolve(path.dirname(projectPath), f.path));
          }
        }
      }

      if (item.tagName === 'SPAN') {
        fs.unlinkSync(path.resolve(path.dirname(projectPath), file.path));
      } else if (item.tagName === 'SUMMARY') {
        deleteInFolder(file.children);
      }

      file.delete = true;

      project.index = project.index.filter(i => !i.delete);

      (item.tagName === 'SPAN' ? item : item.parentNode).remove();

      setTimeout(() => {
        const foundCurrent = api.flatten(project.index).find(f => api.idFromPath(f.path) === project.openFile);
        if (typeof foundCurrent === 'undefined') {
          if (api.flatten(project.index).filter(i => typeof i.children === 'undefined').length) {
            currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];
            document.getElementById(api.idFromPath(currentFile.path)).click();
            api.openFile(currentFile.path, currentFile.name, true);
          } else {
            api.createItem('file', true);
          }
        }
        api.saveProject();
      }, 0);
    },
    editorValue: (v) => {
      if (v) {
        return editor.value(v);
      } else {
        if (editor === null) return;
        return editor.value();
      }
    },
    fileName: () => {
      const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
      return (new Array(16)).fill().map(l=>chars[Math.floor(Math.random() * chars.length)]).join('') + '.md';
    },
    flatten: (arr) => {
      let newArr = arr;
      newArr = arr.map(i => {
        // If there are children, add them to the top-level list
        if (i.children) return [i, api.flatten(i.children)];
        else return i;
      }).flat(Infinity);
      return newArr;
    },
    focusItem: (id) => {
      const element = document.getElementById(id).tagName === 'SPAN' ?
        document.getElementById(id) :
        document.getElementById(id).querySelector('summary');
      if (element.contentEditable === 'true') return;
      if (element.classList.contains('active') && event.type !== 'contextmenu') return api.startRename(element);
      if (q('#fileTree .active'))
        q('#fileTree .active').classList.toggle('active');
      element.classList.toggle('active');
    },
    getProject: () => {
      return {...project}
    },
    idFromPath: (p) => {
      return p.split('/').slice(-1)[0].split('.')[0];
    },
    ignoreLock: () => {
      readOnly = false;
      q('body').dataset.readonly = 'false';
      api.resetEditor();
    },
    init: async (params) => {
      // Get app data directory
      await (new Promise((resolve, reject) => {
        ipcRenderer.send('appDataDir');
        ipcRenderer.on('appDataDir', (event, args) => {
          appPath = args;
          resolve();
        });
      }));

      try {
        customDictionary = fs.readFileSync(path.resolve(appPath, './customDictionary.txt'), {
          encoding:'utf8',
          flag:'r'
        }).split('\n').filter(l => l.length);
      } catch (err) {
        console.error(err);
        fs.writeFileSync(path.resolve(appPath, './customDictionary.txt'), '');
      }

      params = querystring.parse(params);
      projectPath = params.f;

      // Lock project
      api.lockProject();

      // Initialize git in project directory
      git = simpleGit({
        baseDir: (params.new ? projectPath : path.dirname(projectPath))
      });
      try {
        await git.init();
      } catch (err) {
        console.warn('Git is not installed. Continuing without.');
        gitEnabled = false;
      }
      if (params.new) {
        console.info('New project alert! Let me get that set up for you...');
        console.info('Creating project file...');
        projectPath = path.resolve(projectPath, 'project.vgp');
        await fs.writeFile(
          projectPath,
          JSON.stringify(project),
          {
            encoding: 'utf8',
            flag: 'w'
          },
          (err) => {
            if (err) throw new Error(err);
            else {
              console.info('File written successfully!');
            }
          }
        );
        console.info('Creating initial file...');
        try {
          fs.mkdirSync(path.resolve(path.dirname(projectPath), './content'));
        } catch(err) {
          console.warn(err);
        }
        await fs.writeFile(
          path.resolve(path.dirname(projectPath), project.index[0].path),
          '',
          {
            encoding: 'utf8',
            flag: 'w'
          },
          (err) => {
            if (err) throw new Error(err);
            else {
              console.info('File written successfully!');
            }
          }
        );
        currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];
        if (gitEnabled) {
          console.info('Creating initial commit...');
          await git.add('./*');
          await git.commit('Create project')
          await api.populateGitHistory()
        }

        console.info('Done! Changing URL to avoid refresh-slipups.');
        history.replaceState(null, null, './editor.html?f=' + projectPath);
        startingWords = 0;
      } else {
        if (gitEnabled) {
          if ((await git.branch()).current !== 'master') await api.checkout('master', true);

          api.populateGitHistory();
        }

        project = JSON.parse(fs.readFileSync(projectPath, {
          encoding:'utf8',
          flag:'r'
        }));
        currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];

        // Calculate word counts
        api.flatten(project.index)
          .filter(i => typeof i.children === 'undefined')
          .forEach(file => {
            file.words = api.wordCount(fs.readFileSync(path.resolve(path.dirname(projectPath), file.path), {
              encoding:'utf8',
              flag:'r'
            }));
          });
        startingWords = api.wordCountTotal();

        // For compatibility with v0.1.0
        if (typeof project.openFolders === 'undefined') project.openFolders = [];

        // For compatibility with <v0.1.2
        if (typeof project.openFile === 'undefined') project.openFile = api.idFromPath(currentFile.path);

        const foundCurrent = api.flatten(project.index).find(f => api.idFromPath(f.path) === project.openFile);
        if (typeof foundCurrent !== 'undefined') currentFile = foundCurrent;

        // For compatibility with <v0.2.1
        if (typeof project.metadata.title !== 'string')
          project.metadata.title = project.metadata.title.final;

        // For compatibility with <v0.3.2
        if (typeof project.goals === 'undefined') project.goals = [];
        if (typeof project.history === 'undefined') project.history = {};
        if (typeof project.history.wordCount === 'undefined') project.history.wordCount = {};
      }

      fs.writeFileSync(path.resolve(path.dirname(projectPath), '.gitignore'), '.lock');

      // Update goals
      project.goals = project.goals.map(g => {
        let goal = g;
        if (!g.id) goal.id = api.idFromPath(api.fileName());
        if (goal.type === 'session') {
          goal.archived = true;
          goal.final = api.wordCountTotal();
        } else if (
          goal.type === 'daily' &&
          !goal.archived &&
          (
            !goal.history.length ||
            goal.date.split('T')[0] < (new Date()).toISOString().split('T')[0]
          )
        ) {
          goal.history.push({
            date: g.date,
            progress: api.wordCountTotal() - g.startingWords
          });
          goal.startingWords = api.wordCountTotal();
          goal.date = (new Date()).toISOString();
        }

        return goal;
      });

      api.populateFiletree();
      api.openFile(currentFile.path, currentFile.name, true);

      setTimeout(() => {
        document.getElementById(api.idFromPath(currentFile.path)).click();
      }, 1000);
    },
    isGitEnabled: () => gitEnabled,
    isReadOnly: () => readOnly,
    lockProject: () => {
      try {
        if (fs.statSync(path.resolve(projectPath, '../.lock'))) {
          readOnly = true;
          document.body.classList.add('locked');
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(err);
        }
      }

      fs.writeFileSync(path.resolve(projectPath, '../.lock'), '');
      return true;
    },
    moveItem: (p, t, c, index, order, main = false) => {
      const parent = p ? api.flatten(project.index).find(f => f.path === p) : {children: project.index};
      const target = t ? api.flatten(project.index).find(f => f.path === t) : {children: project.index};
      const currentlyDragging = api.flatten(project.index).find(f => f.path === c);

      // Remove from parent
      parent.children.splice(parent.children.indexOf(currentlyDragging), 1);

      // Add to target
      if (order) {
        target.children.splice(index, 0, JSON.stringify(currentlyDragging));
      } else {
        target.children.push(currentlyDragging);
      }

      target.children = target.children.map(c => {
        if (typeof c === 'string') return JSON.parse(c);
        else return c;
      });

      project.index = project.index.map(c => {
        if (typeof c === 'string') return JSON.parse(c);
        else return c;
      });

      api.populateFiletree();

      // Save
      api.saveProject();
    },
    newProject: () => {
      ipcRenderer.send('newProject');
    },
    openFile: (p, n, first = false) => {
      if (currentFile === api.flatten(project.index).find(i => i.path === p) && !first) return;
      api.resetEditor();
      clearing = true;
      const value = fs.readFileSync(path.resolve(path.dirname(projectPath), p), {
        encoding:'utf8',
        flag:'r'
      });
      editor.value(value);
      currentFile = api.flatten(project.index).find(i => i.path === p);
      clearing = false;

      // Calculate word counts
      api.flatten(project.index).filter(i => typeof i.children === 'undefined').forEach(file => {
        file.words = api.wordCount(fs.readFileSync(path.resolve(path.dirname(projectPath), file.path), {
          encoding:'utf8',
          flag:'r'
        }));
      });

      api.updateStats();
    },
    openItem: (id) => {
      const file = api.flatten(project.index).find(i => api.idFromPath(i.path) === id);
      api.openFile(file.path, file.name);
      project.openFile = id;
      api.saveProject();
      return document.getElementById(id);
    },
    openProject: () => {
      ipcRenderer.send('openProject');
    },
    placeholders,
    populateFiletree: () => {
      document.getElementById('fileTree__list').innerHTML = '';

      function drawLayer(layer, id) {
        let html = '';

        for (var item of layer) {
          if (typeof item.children !== 'undefined') {
            html += `
            <details
              id=${JSON.stringify(api.idFromPath(item.path))}
              ondragover='event.preventDefault()'
              ondrop='moveItem(event, getDraggingIndex())'
            >
              <summary
                draggable="true"
                ondragstart="startMoveItem(event)"
                ondragend="stopMoveItem(event)"
                title="${item.name}"
                onclick='event.preventDefault();api.focusItem(this.parentNode.id);'
                ondblclick='this.parentNode.toggleAttribute("open");api.setOpenFolders();'
                oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();api.focusItem(this.parentNode.id);"
              >${item.name}</summary>
            </details>`;
            const itemClone = {...item};
            setTimeout(
              () => {drawLayer(itemClone.children, api.idFromPath(itemClone.path))},
              0
            );
          } else {
            html += `
            <span
              title="${item.name}"
              onclick='event.preventDefault();api.focusItem(this.id)'
              ondblclick='api.openItem(this.id)'
              oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();api.focusItem(this.id);"
              draggable="true"
              ondragstart="startMoveItem(event)"
              ondragend="stopMoveItem(event)"
              ondragover="setHovering(this)"
              ondrag="updatePageXY(event)"
              id=${JSON.stringify(api.idFromPath(item.path))}
            >
              ${item.name}
            </span>`;
          }
        }

        document.getElementById(id).innerHTML += html;
      }
      drawLayer(project.index, 'fileTree__list');

      api.restoreOpenFolders();
    },
    populateGitHistory: async () => {
      if (!gitEnabled) {
        console.warn('Git is disabled!');
        return false;
      }
      try {
        const log = await git.log();
        let html = log.all.map(h => {
          const preview = `<span class="preview" onclick="api.checkout('${h.hash}', false)"><i class="fa fa-eye"></i>`;
          return `<span id='commit-${h.hash}'>${h.message}${h.hash !== log.all[0].hash ? preview : ''}</span></span>`;
        }).reverse().join('');
        q('#git__commits').innerHTML = html;

        q('#git').scrollTop = q('#git').scrollHeight;
      } catch (err) {
        console.error(err);
      }
    },
    resetEditor: () => {
      clearing = true;

      // If the editor already exists, clear it
      if (editor) {
        editor.value('');
        editor.toTextArea();
      }
      placeholderN = Date.now() % (api.placeholders.length - 1);
      let options = {
        element: document.getElementById("editorTextarea"),
        spellChecker: false,
        status: false,
        placeholder: api.placeholders[placeholderN],
      	insertTexts: {
      		image: ["![](https://", ")"],
      	},
        autofocus: true,
        autoDownloadFontAwesome: false,
        toolbar: [
          'bold',
          'italic',
          'heading',
          '|',
          'quote',
          'unordered-list',
          'ordered-list',
          'link',
          '|',
          'preview',
          {
            name: 'fullscreen',
            action: toggleFullScreen,
            className: 'fa fa-arrows-alt no-disable',
            title: 'Focus Mode (F11)'
          },
          '|',
          'guide'
        ],
        shortcuts: {
          toggleFullScreen: null
        }
      };
      if (readOnly) {
        options.hideIcons = ['side-by-side', 'image', 'preview'];
        options.placeholder = '';
      }
      editor = new EasyMDE(options);

      // Fullscreen
      const debouncedSaveFile = api.debounce(api.saveFile, 500);
      const throttledUpdateStats = api.throttle(api.updateStats, 50);
      editor.codemirror.on("change", () => {
        if (clearing) return;
        throttledUpdateStats();
        debouncedSaveFile();
      });
      clearing = false;

      editor.codemirror.addOverlay({
        token: function(stream) {
          // Based on https://github.com/sparksuite/codemirror-spell-checker/blob/master/src/js/spell-checker.js
  				var ch = stream.peek();
  				var word = "";

  				if(rx_word.includes(ch)) {
  					stream.next();
  					return null;
  				}

  				while((ch = stream.peek()) != null && !rx_word.includes(ch)) {
  					word += ch;
  					stream.next();
  				}

  				if(api.checkWord(word.replace(/‘|’/g, "'")) !== true)
  					return "spell-error"; // CSS class: cm-spell-error

  				return null;
  			}
      });


      togglePreview = editor.toolbar.find(t => t.name === 'preview').action;
      if (readOnly && !editor.isPreviewActive()) setTimeout(() => {togglePreview(editor)}, 0);
    },
    renameItem: (e) => {
      e.contentEditable = false;

      const file = api.flatten(project.index).find(i => api.idFromPath(i.path) === (e.tagName === 'SUMMARY' ? e.parentNode.id : e.id));

      if (e.innerText.trim().length <= 0 || e.innerText.trim() === file.name) {
        e.innerText = file.name;
        return;
      }

      file.name = e.innerText.trim();
      e.title = e.innerText.trim();

      if (file.path === currentFile.path) api.updateStats();

      api.saveProject();
    },
    restoreOpenFolders: () => {
      const toOpen = project.openFolders;
      for (const folder of toOpen) {
        try {
          document.getElementById(folder.id).open = folder.open;
        } catch (err) {
          setTimeout(api.restoreOpenFolders, 0);
        }
      }
    },
    revertTo: async (where, name) => {
      if (!gitEnabled) {
        console.warn('Git is disabled!');
        return false;
      }

      const range = `${where}..HEAD`;

      await git.reset({'--hard': null});

      await api.checkout('master', false, false);

      await git.stash();

      await git.revert(range, {'--no-commit': null});

      await api.commit(`Revert to "${q(`#commit-${where}`).innerText}"`);

      await api.checkout('master', true, false);
    },
    saveFile: (v) => {
      if (readOnly) return false;
      let p = currentFile.path;
      let value = null;
      if (!v) value = editor.value();
      else value = v;

      fs.writeFileSync(path.resolve(path.dirname(projectPath), p), value);
    },
    saveProject: () => {
      if (readOnly) return false;
      fs.writeFileSync(path.resolve(projectPath), JSON.stringify(project));
    },
    setOpenFolders: () => {
      let folders = [...qA('#fileTree__list details')];

      folders = folders.map(folder => {
        return {
          id: folder.id,
          open: folder.open
        };
      });

      project.openFolders = [...folders];

      api.saveProject();
    },
    showModal: (name) => {
      let modal = null;
      switch (name) {
        case 'projectDetails':
          if (readOnly) return alert('You cannot update novel details while in Read Only mode.');
          modal = document.getElementById('projectDetails');

          // Restore values
          document.getElementById('projectDetails__title').value = project.metadata.title;
          document.getElementById('projectDetails__author').value = project.metadata.author;
          document.getElementById('projectDetails__synopsis').value = project.metadata.synopsis;

          modal.classList.add('visible');
          break;
        case 'projectGoalComplete':
          modal = document.getElementById('projectGoalComplete');
          modal.classList.add('visible');
          break;
        default:
          throw new Error(`There is no modal named '${name}'`);
          break;
      }
    },
    startSprint: (s = 0, m = 0, h = 0) => {
      if (!(s+m+h)) return; // smh = shaking my head (because you set a timer for 0)

      const start = Date.now();
      const end = start + (1000 * s) + (1000 * 60 * m) + (1000 * 60 * 60 * h);

      q('#wordSprint').click();

      sprint = {
        start,
        end,
        startingWords: api.wordCountTotal(),
        total: end - start,
        interval: setInterval(() => {
          const currentWords = api.wordCountTotal();
          const written = currentWords - startingWords;
          q('#wordSprint__status').innerText =
            `You've written ${written.toLocaleString()} word${written !== 1 ? 's' : ''}. Keep up the good work!`;

          let timeLeft = sprint.end - Date.now();

          let percent = 1 - (timeLeft / sprint.total);

          q('#wordSprint').style = `--percent:${percent};`;
          if (percent > 0.5) q('#wordSprint').classList.add('more');

          if (timeLeft < 0) {
            q('#wordSprint__status').innerText =
              `You wrote ${written.toLocaleString()} word${written !== 1 ? 's' : ''}. Impressive!`;

            q('#wordSprint').style = '';
            q('#wordSprint').classList.remove('more');
            q('#wordSprint__popup').dataset.mode = 'finished';
            q('#wordSprint').innerHTML = '<i class="fas fa-running"></i>';

            if (!q('#wordSprint__checkbox').checked)
              q('#wordSprint').click();

            endSprintSound.play();

            clearInterval(sprint.interval);
            sprint = {};
            return;
          }

          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          timeLeft -= hoursLeft * 1000 * 60 * 60;
          const minutesLeft = Math.floor(timeLeft / (1000 * 60));
          timeLeft -= minutesLeft * 1000 * 60;
          const secondsLeft = Math.floor(timeLeft / (1000));

          document.getElementById('wordSprint__timeLeft').innerText = `${hoursLeft}:${minutesLeft < 10 ? 0 : ''}${minutesLeft}:${secondsLeft < 10 ? 0 : ''}${secondsLeft}`;
        }, Math.max(Math.floor((end - start)) / 360, 25)),
      };

      document.getElementById('wordSprint').classList.add('pie-chart');

      document.getElementById('wordSprint').innerHTML = '<span class="pie"><span class="segment"></span></span>'
      document.getElementById('wordSprint__popup').dataset.mode = 'running';
    },
    suggestWords: (w) => {
      return dictionary.suggest(w);
    },
    startRename: (e) => {
      const isOpen = (e.tagName === 'SUMMARY' ? e.parentNode.open : currentFile);
      setTimeout(() => {
        if (isOpen !== (e.tagName === 'SUMMARY' ? e.parentNode.open : currentFile)) return;
        e.contentEditable = true;
        e.focus();
        e.addEventListener('keydown', (event) => {
          if (event.key === ' ' && e.tagName === 'SUMMARY') {
            event.preventDefault();
            document.execCommand('insertText', false, ' ');
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            e.blur();
          }
          if (event.key === 'Escape') {
            const file = api.flatten(project.index).find(i => api.idFromPath(i.path) === (e.id || e.parentNode.id));
            e.innerText = file.name;
            e.blur();
          }
        });
        e.addEventListener('blur', api.renameItem.bind(this, e));
        document.execCommand('selectAll', false, null)
      }, 300);
    },
    throttle: (f, delay) => {
      // Based on https://www.geeksforgeeks.org/javascript-throttling/
      let prev = 0;
      let timeout = null;

      return (...args) => {
        let now = new Date().getTime();

        if(now - prev > delay){
          if (timeout !== null) clearTimeout(timeout);
          prev = now;

          return f(...args);
        } else {
          if (timeout !== null) clearTimeout(timeout);
          timeout = setTimeout(() => {
            prev = now;
            return f(...args);
          }, delay);
        }
      }
    },
    unlockProject: () => {
      // Don't unlock if you've detected another window locked it
      if (document.body.classList.contains('locked')) return false;
      try {
        fs.unlinkSync(path.resolve(projectPath, '../.lock'));
      } catch (err) {
        console.warn(err);
      }
      return true;
    },
    updateDetails: (toUpdate) => {
      if (readOnly) return alert('You cannot update novel details while in Read Only mode.');
      for (var key of Object.keys(toUpdate)) {
        if (project.metadata[key] !== undefined) project.metadata[key] = toUpdate[key];
      }
      api.saveProject();
    },
    updateGoals: async (updateHTML = true) => {
      let goals = project.goals
        .filter(g => !g.archived)
        .map(g => {
          let newGoal = g;
          newGoal.done = Math.min(api.wordCountTotal() - g.startingWords, g.words);
          newGoal.completed = newGoal.done >= g.words;

          return newGoal;
        })
        .filter(g => !g.acknowledged)
        .sort((a, b) => {
          return (a.words - a.done) - (b.words - b.done)
        })

      if (goals.length && goals[0].type === 'project' && goals[0].completed) {
        q('#projectGoalComplete__wordCount').innerText = goals[0].words.toLocaleString();
        q('#projectGoalComplete__days').innerText =
          Math.floor(
            (Date.now() - (new Date(goals[0].date))) / (1000 * 60 * 60 * 24)
          ).toLocaleString();
        setTimeout(api.showModal.bind(this, 'projectGoalComplete'), 1500);
        return;
      }

      if (goals.length) {
        q('#wordGoal').style = `--percent:${100*goals[0].done / goals[0].words}%`;
        if (goals[0].completed) q('#wordGoal').classList.add('flash');
        else q('#wordGoal').classList.remove('flash');
      } else q('#wordGoal').style = `--percent:0%`;

      goals = goals
        .map(g => {
          return `<div ${g.completed ? 'class="completed"' : ''} style="--percent:${g.done * 100 / g.words}%">
            ${g.type} goal: ${g.done} / ${g.words} words
            <span title="Archive Goal" class="archive" onclick="api.archiveGoal('${g.id}')"><i class="far fa-trash-alt"></i></span>
          </div>`
        });

      if (updateHTML) {

        /* Acknowledged goals */
        let acknowledged = project.goals
          .filter(g => !g.archived && g.acknowledged)
          .map(g => {
            let newGoal = g;
            newGoal.done = Math.min(api.wordCountTotal() - g.startingWords, g.words);
            newGoal.completed = newGoal.done >= g.words;
            if (!newGoal.completed) newGoal.acknowledged = false;

            return newGoal;
          })
          .sort((a, b) => {
            return a.words - b.words
          })
          .map(g => {
            return `<div ${g.completed ? 'class="completed"' : ''} style="--percent:${g.done * 100 / g.words}%">
              ${g.type} goal: ${g.done} / ${g.words} words
              <span title="Archive Goal" class="archive" onclick="api.archiveGoal('${g.id}')"><i class="far fa-trash-alt"></i></span>
            </div>`
          });

        if (goals.length + acknowledged.length) q('#wordGoal__list').innerHTML = goals.join('') + acknowledged.join('');
        else q('#wordGoal__list').innerText = "You haven't set any goals yet.";

        /* Archived goals */
        let archived = project.goals
          .filter(g => g.archived)
          .map(g => {
            let newGoal = g;
            if (g.type === 'daily') {
              newGoal.daysCompleted = 0;
              g.history.forEach(h => {
                if (h.progress >= g.words) newGoal.daysCompleted++;
              });

              newGoal = `<div ${newGoal.daysCompleted === newGoal.history.length ? 'class="completed"' : ''} style="--percent:${newGoal.daysCompleted * 100 / newGoal.history.length}%">
                ${g.type} goal: completed ${newGoal.daysCompleted}/${newGoal.history.length} days
              </div>`;
            } else {
              newGoal = `<div ${g.completed ? 'class="completed"' : ''} style="--percent:${g.done * 100 / g.words}%">
                ${g.type} goal: ${g.done} / ${g.words} words
              </div>`;
            }
            return newGoal;
          });

          q('#wordGoal__archived').innerHTML = archived.join('');
      }
    },
    updateStats: async () => {
      let content = marked(editor.value());
      var div = document.createElement("div");
      div.innerHTML = content;
      content = div.innerText;
      let stats = {};

      stats.words = api.wordCount(content);

      api.flatten(project.index).find(i => i.path === currentFile.path).words = stats.words;

      // If in the future the current word count should be saved as it updates, create a debounced function for it.
      // Currently, the word count is updated on init(), so the editor doesn't need to update the file.

      stats.words = stats.words.toLocaleString() + ' words';

      stats.lines = content.split('\n').filter(l => l.length).length + ' lines';

      // Update stats element
      document.getElementById('editor__stats').innerText = Object.values(stats).join(', ') + '.';

      // Update novel stats
      document.getElementById('novelStats__open').innerText = currentFile.name;
      let totalWords = api.wordCountTotal();
      project.history.wordCount[(new Date()).toISOString().split('T')[0]] = api.wordCountTotal();

      document.getElementById('novelStats__words').innerText = totalWords.toLocaleString() +
        ` (${(totalWords < startingWords ? '' : '+') + (totalWords - startingWords).toLocaleString()})`;

      api.updateGoals();
    },
    wordCount: (t) => {
      let value = typeof t === 'undefined' ? editor.value() : t;

      let content = marked(value);
      var div = document.createElement("div");
      div.innerHTML = content;
      value = div.innerText;

      return value
        .split(/ |\n/)
        .filter(w => w.length)
        .length;
    },
    wordCountTotal: () => {
      let totalWords = api
        .flatten(api.getProject().index)
        .filter(i => i.words);
      if (!totalWords.length) totalWords = 0;
      else if (totalWords.length === 1) totalWords = totalWords[0].words;
      else {
        totalWords = totalWords.reduce((a, b) => (a.words ? a.words : a) + b.words);
      }

      return totalWords;
    },
  };

  let project = {
    metadata: {
      title: 'Untitled Novel',
      author: '',
      synopsis: ''
    },
    index: [
      {
        name: 'New File',
        path: './content/' + api.fileName(),
        words: 0
      }
    ],
    openFolders: [],
    goals: [],
    history: {
      wordCount: {

      }
    }
  };
  let placeholderN = Date.now() % api.placeholders.length;

  ipcRenderer.on('updateProjectDetails', () => {
    api.showModal('projectDetails');
  });
  ipcRenderer.on('toggleFullScreen', () => {
    toggleFullScreen(editor);
  });
}

// Fullscreen
toggleFullScreen = (e) => {
  document.body.classList.toggle('focusMode');
  function escapeFunction(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      document.exitFullscreen();
      document.body.classList.remove('focusMode');
      document.removeEventListener('keydown', escapeFunction);
    }
  }
  if (!document.body.classList.contains('focusMode')) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
  document.body.addEventListener('keydown', escapeFunction);
  if (e !== null) _toggleFullScreen(e);
}

// Respond to main process
ipcRenderer.on('app-close', () => {
  if (inEditor) {
    // Save files
    api.saveFile();
    api.saveProject();

    // Unlock project for other sessions
    api.unlockProject();
  }
  ipcRenderer.send('closed');
});
ipcRenderer.on('reload', () => {
  if (inEditor) {
    // Save files
    api.saveFile();
    api.saveProject();

    // Unlock project for other sessions
    api.unlockProject();
  }

  location.reload();
});

if (inEditor) {
  ipcRenderer.send('appMenuEditor');
  module.exports = api;
}
else {
  ipcRenderer.send('appMenuDefault');
  module.exports = {
    openProject: () => {
      ipcRenderer.send('openProject');
    },
    newProject: () => {
      ipcRenderer.send('newProject');
    },
  };
}

console.info('%cWARNING!', 'font-size: 3em;color:red', '\nDo not copy/paste code in here unless you know EXACTLY what you\'re doing! Running code from external sources could give hackers unexpected access to your device.');
