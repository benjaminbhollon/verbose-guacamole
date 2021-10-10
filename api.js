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
function addAPIMethods(category, extra = {}) {
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
          extra,
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
  let clearing = false;
  let currentlyDragging = null;
  let hoveringOver = null;
  let startingWords = 0;
  let params = {};
  let togglePreview = null;
  const events = {};

  // Dictionary
  const dictionary = new Typo('en_US');
  let customDictionary = [];

  const editorAPI = {
    checkout: async (what, editable, stash = true) => {
      if (!api.gitEnabled) {
        console.warn('Git is disabled!');
        return false;
      }
      if (!(what === 'master' && editable) && stash) {
        await git.stash();
      }
      const result = await git.checkout(what);

      if (!editable) {
        api.readOnly = true;
        q('body').dataset.readonly = 'true';
        q('#git__revertButton').dataset.hash = what;
      } else {
        api.readOnly = false;
        q('body').dataset.readonly = 'false';
      }

      if (what === 'master' && editable && stash) {
        try {
          await git.stash(['apply']);
        } catch (err) {
          console.warn(err);
        }
      }

      updatedProject = JSON.parse(fs.readFileSync(api.projectPath, {
        encoding:'utf8',
        flag:'r'
      }));
      for (let key of Object.keys(updatedProject)) {
        project[key] = updatedProject[key];
      }
      api.currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];

      api.openFile(api.idFromPath(api.currentFile.path), api.currentFile.name, true);
      api.populateFiletree();
      api.populateGitHistory();
    },
    commit: async (m) => {
      if (!api.gitEnabled) {
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
    init: async (params) => {
      api.readOnly = false;

      try {
        api.customDictionary = fs.readFileSync(path.resolve(paths.data, './customDictionary.txt'), {
          encoding:'utf8',
          flag:'r'
        }).split('\n').filter(l => l.length);
      } catch (err) {
        console.error(err);
        fs.writeFileSync(path.resolve(paths.data, './customDictionary.txt'), '');
        api.customDictionary = [];
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
        api.gitEnabled = true;
      } catch (err) {
        console.warn('Git is not installed. Continuing without.');
        api.gitEnabled = false;
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
        api.currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];
        if (api.gitEnabled) {
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
        if (api.gitEnabled) {
      	  if ((await git.branch()).all.length <= 0) { // Project started without git
      	    console.info('Creating initial commit...');
      	    await git.add('./*');
      	    await git.commit('Create project');
      	  }
          if ((await git.branch()).current !== 'master') await api.checkout('master', true);

          api.populateGitHistory();
        }

        updatedProject = JSON.parse(fs.readFileSync(api.projectPath, {
          encoding:'utf8',
          flag:'r'
        }));
        for (let key of Object.keys(updatedProject)) {
          project[key] = updatedProject[key];
        }
        api.currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];

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
        if (typeof project.openFile === 'undefined') project.openFile = api.idFromPath(api.currentFile.path);

        const foundCurrent = api.flatten(project.index).find(f => api.idFromPath(f.path) === project.openFile);
        if (typeof foundCurrent !== 'undefined') api.currentFile = foundCurrent;

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
      api.openFile(api.idFromPath(api.currentFile.path), api.currentFile.name, 0);
      api.updateLabelCSS();

      setTimeout(() => {
        document.getElementById(api.idFromPath(api.currentFile.path)).click();
      }, 1000);
    },
    populateGitHistory: async () => {
      if (!api.gitEnabled) {
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
    revertTo: async (where, name) => {
      if (!api.gitEnabled) {
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
  };

  for (method of Object.keys(editorAPI)) {
    api[method] = editorAPI[method];
  }

  const project = {
    metadata: {
      title: 'Untitled Novel',
      author: '',
      synopsis: ''
    },
    index: [],
    openFolders: [],
    goals: [],
    history: {
      wordCount: {

      }
    },
    labels: []
  };

  addAPIMethods('editor', {project, events, editors, dictionary});

  project.index.push(
    {
      name: 'Title Page',
      path: './content/' + api.fileName(),
      words: 0
    }
  );

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
}, 1000);
