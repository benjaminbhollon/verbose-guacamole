const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const querystring = require('querystring');
let currentFile = "";
const params = querystring.parse(location.search.slice(1));
let projectPath = params.f;
const git = simpleGit({
  baseDir: path.dirname(projectPath)
});
let project = {
  metadata: {
    title: {
      working: 'Untitled Novel',
      final: 'Untitled Novel'
    },
    author: '',
    synopsis: ''
  },
  index: [

  ]
};

(async () => {
  if (params.new) {
    console.log('New project alert! Let me get that set up for you...');
    console.log('Initializing git repository...');
    await git.init();
    console.log('Creating project file...');
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
          console.log('File written successfully!');
        }
      }
    );
    console.log('Done!');
  } else {
    console.log('hello?');
    project = JSON.parse(fs.readFileSync(projectPath, {
      encoding:'utf8',
      flag:'r'
    }));
  }
})().finally(() => {
  let editor = new SimpleMDE({ element: document.getElementById("editorTextarea"), spellChecker: false, hideIcons: ['side-by-side', 'fullscreen'] });
});
