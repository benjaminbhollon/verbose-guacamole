module.exports = async () => {
  // Include packages
  const path = require('path');
  const fs = require('fs');
  const querystring = require('querystring');
  const { ipcRenderer } = require('electron');

  // Get paths
  const pathsPromise = new Promise(function(resolve, reject) {
    ipcRenderer.send('getDirs');
    ipcRenderer.on('getDirs', (event, data, novels) => {
      resolve({
        data,
        novels
      });
    });
  });

  const paths = await pathsPromise;


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

    // Create project directory if necessary
    if (api.params.new) {
      if (!fs.existsSync(paths.novels)){
        fs.mkdirSync(paths.novels);
      }
      if (!fs.existsSync(api.projectPath)){
        fs.mkdirSync(api.projectPath);
      }
    }

    let git = null;
    /*try {
      git = simpleGit({
        baseDir: (api.params.new ? api.projectPath : path.dirname(api.projectPath))
      });
    } catch(err) {
      // The project has been deleted (it was probably opened from the "Recent Projects" page)
      setTimeout(() => {
        document.getElementById('projectDeletedError').classList.add('visible');
        api.readOnly = true;
      }, 100);
      return api;
    }*/

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

  return api;
};
