// Include packages
const path = require('path');
const fs = require('fs');
const { ipcRenderer } = require('electron');

// Get paths
let paths = {};
(async () => {
  // Get app data directory
  await (new Promise((resolve, reject) => {
    ipcRenderer.send('getDirs');
    ipcRenderer.on('getDirs', (event, data, novels) => {
      paths.data = data;
      paths.novels = novels;
      resolve();
    });
  }));
})();

// API methods
let api = {};
const apiLocation = './api/';
const apiCategories = fs.readdirSync(apiLocation);
function addAPIMethods(category) {
  if (apiCategories.indexOf(category) === -1) {
    console.error(`Could not add ${category} API methods: not found`);
    return [];
  }

  fs
    .readdirSync(path.resolve(apiLocation, category))
    .forEach(method => {
      api[path.parse(method).name] =
        require(path.resolve(apiLocation, category, method))(
          api,
          paths,
        );
    });

  return true;
}

const page = path.parse(location.href.split('?')[0]).name;
const inEditor = page === 'editor';

// Quick versions of document.querySelector and document.querySelectorAll
const {q, qA} = require('./modules/queries.js');

addAPIMethods('default');

if (inEditor) {
  const simpleGit = require('simple-git');
  const querystring = require('querystring');
  const marked = require('marked');
  const Typo = require('typo-js');
  const Editor = require('./classes/Editor.js')(api);

  // Initialize variables
  let git = null;
  let editors = [];
  let currentFile = null;
  let clearing = false;
  let currentlyDragging = null;
  let hoveringOver = null;
  let startingWords = 0;
  let sprint = {}
  let params = {};
  let readOnly = false;
  let togglePreview = null;
  let gitEnabled = true;
  const endSprintSound = new Audio('./assets/audio/sprintDone.mp3');
  const events = {};

  // Dictionary
  const dictionary = new Typo('en_US');
  let customDictionary = [];

  // Random int from min to max
  function rand(min, max) {
    return Math.floor((Math.random() * (max - min + 1)) + min);
  }

  // hex to hsl based on https://gist.github.com/xenozauros/f6e185c8de2a04cdfecf
  function hexToHSL(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      r = parseInt(result[1], 16);
      g = parseInt(result[2], 16);
      b = parseInt(result[3], 16);
      r /= 255, g /= 255, b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, l = (max + min) / 2;
      if(max == min){
        h = s = 0; // achromatic
      }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
    var HSL = new Object();
    HSL['hue']=Math.round(h*360);
    HSL['saturation']=Math.round(s*100);
    HSL['lightness']=Math.round(l*100);
    return HSL;
  }

  const editorAPI = {
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
      fs.writeFileSync(path.resolve(paths.data, './customDictionary.txt'), customDictionary.join('\n'));

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
        try {
          await git.stash(['apply']);
        } catch (err) {
          console.warn(err);
        }
      }

      project = JSON.parse(fs.readFileSync(api.projectPath, {
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
        folder.open = true;
        api.setOpenFolders();
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
          path.resolve(path.dirname(api.projectPath), filePath),
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
          if (!first) api.startRename(document.getElementById(api.idFromPath(filePath) + '__filename'));
        } else {
          document.getElementById(api.idFromPath(filePath)).click();
          document.getElementById(api.idFromPath(filePath)).open = true;
        }
      }, 0);
    },
    createLabel: (name, color, description = '') => {
      const label = {
        id: api.idFromPath(api.fileName()),
        name: name,
        description: '',
        color: hexToHSL(color)
      };

      project.labels.push(label);

      api.saveProject();
      api.populateFiletree();
      api.updateLabelCSS();
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
            fs.unlinkSync(path.resolve(path.dirname(api.projectPath), f.path));
          }
        }
      }

      if (item.tagName === 'SPAN') {
        fs.unlinkSync(path.resolve(path.dirname(api.projectPath), file.path));
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
    editorValue: (v, editorIndex = 0) => {
      if (v) {
        return editors[editorIndex].value(v);
      } else {
        if (editor === null) return;
        return editors[editorIndex].value();
      }
    },
    emit: (eventName, ...vars) => {
      if (events[eventName]) {
        events[eventName].forEach(callback => callback(...vars));
        return true;
      } else {
        return false;
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
      if (element.contentEditable === 'true' || element.classList.contains('editing')) return;
      if (element.classList.contains('active') && event.type !== 'contextmenu')
        return api.startRename(element.tagName === 'SPAN' ? element.querySelector('.filename') : element);
      if (q('#fileTree .active'))
        q('#fileTree .active').classList.toggle('active');
      element.classList.toggle('active');
    },
    getLabel: (id) => {
      return project.labels.find(l => l.id === id);
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
      api.openFile(currentFile.path, currentFile.name);
    },
    init: async (params) => {
      try {
        customDictionary = fs.readFileSync(path.resolve(paths.data, './customDictionary.txt'), {
          encoding:'utf8',
          flag:'r'
        }).split('\n').filter(l => l.length);
      } catch (err) {
        console.error(err);
        fs.writeFileSync(path.resolve(paths.data, './customDictionary.txt'), '');
      }

      params = querystring.parse(params);
      api.projectPath = params.f;

      // Create project directory if necessary
      if (params.new) {
        if (!fs.existsSync(paths.novels)){
          fs.mkdirSync(paths.novels);
        }
        if (!fs.existsSync(api.projectPath)){
          fs.mkdirSync(api.projectPath);
        }
      }

      // Initialize git in project directory
      git = simpleGit({
        baseDir: (params.new ? api.projectPath : path.dirname(api.projectPath))
      });
      try {
        await git.init();
      } catch (err) {
        console.warn('Git is not installed. Continuing without.');
        gitEnabled = false;
        q('#git').classList.add('disabled');
      }

      if (params.new) {
        console.info('New project alert! Let me get that set up for you...');
        project.metadata = {
          title: params['meta.title'],
          author: params['meta.author'],
          synopsis: params['meta.synopsis']
        }
        console.info('Creating project file...');
        api.projectPath = path.resolve(api.projectPath, 'project.vgp');
        await fs.writeFile(
          api.projectPath,
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
        console.info('Creating title page...');
        try {
          fs.mkdirSync(path.resolve(path.dirname(api.projectPath), './content'));
        } catch(err) {
          console.warn(err);
        }
        await fs.writeFile(
          path.resolve(path.dirname(api.projectPath), project.index[0].path),
          `# ${project.metadata.title}\nby ${project.metadata.author}`,
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
          await git.commit('Create project');
          await api.populateGitHistory();
        }

        console.info('Done! Changing URL to avoid refresh-slipups.');
        history.replaceState(null, null, './editor.html?f=' + api.projectPath);
        startingWords = 0;

        fs.writeFileSync(path.resolve(path.dirname(api.projectPath), '.gitignore'), '.lock');
      } else {
        if (gitEnabled) {
      	  if ((await git.branch()).all.length <= 0) { // Project started without git
      	    console.info('Creating initial commit...');
      	    await git.add('./*');
      	    await git.commit('Create project');
      	  }
          if ((await git.branch()).current !== 'master') await api.checkout('master', true);

          api.populateGitHistory();
        }

        project = JSON.parse(fs.readFileSync(api.projectPath, {
          encoding:'utf8',
          flag:'r'
        }));
        currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];

        // Calculate word counts
        api.flatten(project.index)
          .filter(i => typeof i.children === 'undefined')
          .forEach(file => {
            file.words = api.wordCount(fs.readFileSync(path.resolve(path.dirname(api.projectPath), file.path), {
              encoding:'utf8',
              flag:'r'
            }));
          });
        startingWords = api.wordCountTotal();

        /* Compatibility */

        // with v0.1.0
        if (typeof project.openFolders === 'undefined') project.openFolders = [];

        // with <v0.1.2
        if (typeof project.openFile === 'undefined') project.openFile = api.idFromPath(currentFile.path);

        const foundCurrent = api.flatten(project.index).find(f => api.idFromPath(f.path) === project.openFile);
        if (typeof foundCurrent !== 'undefined') currentFile = foundCurrent;

        // with <v0.2.1
        if (typeof project.metadata.title !== 'string')
          project.metadata.title = project.metadata.title.final;

        // with <v0.3.2
        if (typeof project.goals === 'undefined') project.goals = [];
        if (typeof project.history === 'undefined') project.history = {};
        if (typeof project.history.wordCount === 'undefined') project.history.wordCount = {};

        // with <v0.3.3
        if (typeof project.labels === 'undefined') project.labels = [];
      }

      // Lock project
      api.lockProject();

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

      // Create editor
      editors.push(new Editor(q('#editorTextarea')));

      api.populateFiletree();
      api.openFile(currentFile.path, currentFile.name, 0);
      api.updateLabelCSS();

      setTimeout(() => {
        document.getElementById(api.idFromPath(currentFile.path)).click();
      }, 1000);
    },
    isGitEnabled: () => gitEnabled,
    isReadOnly: () => readOnly,
    labelFile: (fileId, labelId) => {
      const file = api.flatten(project.index)
        .find(f => api.idFromPath(f.path) === fileId);

      if (api.getLabel(labelId) !== undefined || labelId === undefined) {
        file.label = labelId;
        api.populateFiletree();
      }
    },
    lockProject: () => {
      try {
        if (fs.statSync(path.resolve(api.projectPath, '../.lock'))) {
          readOnly = true;
          document.body.classList.add('locked');
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(err);
        }
      }

      fs.writeFileSync(path.resolve(api.projectPath, '../.lock'), '');
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
    on: (eventName, callback = () => undefined) => {
      if (typeof eventName === 'string') {
        if (typeof events[eventName] === 'array')
          events[eventName].push(callback);
        else
          events[eventName] = [callback];
      }
    },
    openFile: (p, n, editorIndex = 0) => {
      return editors[editorIndex].open(p);

      api.updateStats();
    },
    openItem: (id, editorIndex = 0) => {
      api.focusItem(id);
      const file = api.flatten(project.index).find(i => api.idFromPath(i.path) === id);
      api.openFile(file.path, file.name, editorIndex);
      project.openFile = id;
      api.saveProject();
      return document.getElementById(id);
    },
    populateFiletree: () => {
      document.getElementById('fileTree__list').innerHTML = '';

      function drawLayer(layer, id) {
        let html = '';

        for (var item of layer) {
          if (typeof item.children !== 'undefined') {
            html += `
            <details
              id="${api.idFromPath(item.path)}"
              ondragover='event.preventDefault()'
              ondrop='moveItem(event, getDraggingIndex())'
            >
              <summary
                class="folder"
                draggable="true"
                ondragstart="startMoveItem(event)"
                ondragend="stopMoveItem(event)"
                title="${item.name}"
                onclick='if (this.contentEditable !== "true") {setTimeout(api.setOpenFolders, 100);} else {event.preventDefault();console.log("hello?")}'
                ondblclick='api.startRename(this)'
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
              class="file"
              id="${api.idFromPath(item.path)}"
              draggable="true"
              ondragstart="startMoveItem(event)"
              ondragend="stopMoveItem(event)"
              ondragover="setHovering(this)"
              ondrag="updatePageXY(event)"
            >
              <span
                id="${api.idFromPath(item.path)}__filename"
                class="filename"
                title="${item.name}"
                onclick='event.preventDefault();api.openItem(this.parentNode.id)'
                ondblclick='api.startRename(this)'
                oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();api.focusItem(this.parentNode.id);"
              >
                ${item.name}
              </span>
              <span
                class="label"
                data-label="${typeof item.label === 'undefined' ? 'blank' : item.label}"
                title="${typeof item.label === 'undefined' ? 'Click to add label.' : 'Labeled "' + api.getLabel(item.label).name + '". Click to edit.'}"
              >
                <div class="contextMenu">
                  ${(project.labels.length) ?
                    project.labels.map(l =>
                      `<span
                        onclick="api.labelFile('${api.idFromPath(item.path)}', '${l.id}')"
                        data-label="${l.id}"
                      >${l.name}</span>`
                    ).join('') :
                    `<span class="--no-click">No labels.</span>`
                  }
                  ${typeof item.label === 'undefined' ? '' : `<span onclick="api.labelFile('${api.idFromPath(item.path)}', undefined)">Remove Label</span>`}
                  <hr>
                  <span onclick="api.showModal('createLabel')">Create Label</span>
                </div>
              </span>
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
    renameItem: (e) => {
      e.contentEditable = false;
      if (e.tagName === 'SPAN') e.parentNode.classList.remove('editing');

      const file = api.flatten(project.index).find(i => api.idFromPath(i.path) === e.parentNode.id);

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

      const confirmMessage = "Warning! Reverting will permanently remove any changes since the last commit. If you think you might want them later for any reason, make sure you create a commit before continuing!";
      if (!confirm(confirmMessage)) return;

      const range = `${where}..HEAD`;

      await git.reset({'--hard': null});

      await api.checkout('master', false, false);

      await git.stash();

      await git.revert(range, {'--no-commit': null});

      await api.commit(`Revert to "${q(`#commit-${where}`).innerText}"`);

      await api.checkout('master', true, false);
    },
    saveFile: (editorIndex = 0) => {
      return editors[editorIndex].save();
    },
    saveProject: () => {
      if (readOnly) return false;
      fs.writeFileSync(path.resolve(api.projectPath), JSON.stringify(project));
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
        case 'createLabel':
          modal = document.getElementById('createLabel');
          modal.classList.add('visible');
          break;
        default:
          throw new Error(`There is no modal named '${name}'`);
          break;
      }
    },
    startRename: (e) => {
      e.contentEditable = true;
      if (e.tagName === 'SPAN') e.parentNode.classList.add('editing');
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
      document.execCommand('selectAll', false, null);
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
        fs.unlinkSync(path.resolve(api.projectPath, '../.lock'));
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
    updateLabelCSS: () => {
      const css = project.labels
        .map(l => `
            [data-label="${l.id}"] {
              --hue: ${l.color.hue}deg;
              --saturation: ${l.color.saturation}%;
              --lightness: ${l.color.lightness}%;
            }
          `)
        .join('')
        .replace(/\s/g, '');

      q('#style__labelColors').innerText = css;
    },
    updateStats: async () => {
      let content = marked(api.editorValue());
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
      let value = typeof t === 'undefined' ? api.editorValue() : t;

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

  for (method of Object.keys(editorAPI)) {
    api[method] = editorAPI[method];
  }

  let project = {
    metadata: {
      title: 'Untitled Novel',
      author: '',
      synopsis: ''
    },
    index: [
      {
        name: 'Title Page',
        path: './content/' + api.fileName(),
        words: 0
      }
    ],
    openFolders: [],
    goals: [],
    history: {
      wordCount: {

      }
    },
    labels: []
  };

  ipcRenderer.on('updateProjectDetails', () => {
    api.showModal('projectDetails');
  });
  ipcRenderer.on('toggleFullScreen', () => {
    toggleFullScreen(editor);
  });
} else if (page === 'index') {
  const Parser = require('rss-parser');
  const parser = new Parser();
  (async () => {
    try {
      const feed = await parser.parseURL('https://github.com/benjaminbhollon/verbose-guacamole/releases.atom');
      const currentVersion = require('./package.json').version;
      document.getElementById('releases__list').innerHTML = feed.items.map(item => {
        const version = item.link.split('/').slice(-1)[0].slice(1);
        return `
        <div ${version === currentVersion ? 'class="current"' : ''}>
          <h3>${item.title}</h3>
          <details>
            <summary>Release Notes</summary>
            ${item.content.split('<hr>')[0]}
          </details>
          <p>${
            version === currentVersion ?
            `This is your current version.` :
            `<a href="javascript:api.openURI('${item.link}')">Download</a>`
          }</p>
        </div>
        `
      }).join('<br>');
    } catch (err) {
      setTimeout(() => {
        document.getElementById('releases__list').innerHTML = '<p>Can\'t get releases right now.</p>';
      }, 15);
    }
  })();
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
ipcRenderer.on('relocate', (event, to) => {
  if (inEditor) {
    // Save files
    api.saveFile();
    api.saveProject();

    // Unlock project for other sessions
    api.unlockProject();
  }
  location.href = to;
})
ipcRenderer.on('newProject', (event, to) => {
  if (inEditor) {
    // Save files
    api.saveFile();
    api.saveProject();

    // Unlock project for other sessions
    api.unlockProject();
  }

  api.newProject();
})
ipcRenderer.on('setTheme', (event, id) => {
  localStorage.theme = id;
  if (inEditor) {
    // Save files
    api.saveFile();
    api.saveProject();

    // Unlock project for other sessions
    api.unlockProject();
  }

  location.reload();
})

if (inEditor) {
  ipcRenderer.send('appMenuEditor');
}
else {
  ipcRenderer.send('appMenuDefault');
}

module.exports = api;

setTimeout(() => {
  // Add "Create Project" modal
  q('#modals').innerHTML += fs.readFileSync('./frontend/assets/html/newProjectModal.html');
  q('#newProject__author').value =
    localStorage.defaultAuthor ?
    localStorage.defaultAuthor :
    '';
  api.updateNewProjectModal();

  console.info('%cWARNING!', 'font-size: 3em;color:red', '\nDo not copy/paste code in here unless you know EXACTLY what you\'re doing! Running code from external sources could give hackers unexpected access to your device.');
}, 3000);
