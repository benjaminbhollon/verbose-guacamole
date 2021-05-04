const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const querystring = require('querystring');
let currentFile = "";
const params = querystring.parse(location.search.slice(1));
const projectPath = params.f;
const git = simpleGit({
  baseDir: projectPath
});
(async () => {
  if (params.new) {
    console.log('New project alert! Let me get that set up for you...');
    console.log('Initializing git repository.');
    console.log(await git.init());
    console.log('Done!');
  }
})().then(() => {
  let editor = new SimpleMDE({ element: document.getElementById("editorTextarea"), spellChecker: false, hideIcons: ['side-by-side', 'fullscreen'] });
})
