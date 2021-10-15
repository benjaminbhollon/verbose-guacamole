// Include packages
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');
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
const addAPIMethods = require('./modules/addAPIMethods.js')(api, paths);

const page = path.parse(location.href.split('?')[0]).name;
const inEditor = page === 'editor';

addAPIMethods('default');

if (inEditor) {
  const simpleGit = require('simple-git');
  const Typo = require('typo-js');

  // Initialize variables
  api.params = querystring.parse(location.search.slice(1));
  api.projectPath = api.params.f;
  const git = simpleGit({
    baseDir: (api.params.new ? api.projectPath : path.dirname(api.projectPath))
  });
  let editors = [];
  let clearing = false;
  let currentlyDragging = null;
  let hoveringOver = null;
  let togglePreview = null;
  const events = {};

  // Dictionary
  const dictionary = new Typo('en_US');
  let customDictionary = [];

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

  addAPIMethods('editor', {
    project,
    events,
    editors,
    dictionary,
    git
  });
  addAPIMethods('editorFiletree', {
    project,
    editors,
    dictionary,
    git
  });
  addAPIMethods('editorSprints');
  addAPIMethods('editorGoals', {
    project
  });
  addAPIMethods('editorGit', {
    project,
    editors,
    git
  });
  addAPIMethods('editorExport', {
    project
  });

  project.index.push(
    {
      name: 'Title Page',
      path: './content/' + api.fileName(),
      words: 0
    }
  );
  ipcRenderer.on('toggleFullScreen', () => {
    toggleFullScreen(editors[0].instance);
  });

  ipcRenderer.send('appMenuEditor');
} else {
  ipcRenderer.send('appMenuDefault');
}

module.exports = api;
