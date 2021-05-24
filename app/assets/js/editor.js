const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const querystring = require('querystring');
const params = querystring.parse(location.search.slice(1));
let projectPath = params.f;
const git = simpleGit({
  baseDir: (params.new ? projectPath : path.dirname(projectPath))
});
const placeholders = [
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
  'There was no possibility of taking a walk that day. (Jane Eyre)'
];
let placeholderN = Math.floor(Math.random() * placeholders.length);
function fileName() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  return (new Array(16)).fill().map(l=>chars[Math.floor(Math.random() * chars.length)]).join('') + '.md';
}
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
    {
      name: 'New File',
      path: './content/' + fileName()
    }
  ]
};
let editor = null;
let currentFile = project.index[0];
let clearing = false;

function resetEditor() {
  clearing = true;
  if (editor) {
    editor.value('');
    editor.toTextArea();
  }
  placeholderN = (placeholderN + Math.floor(Math.random() * (placeholders.length - 1))) % placeholders.length;
  editor = new SimpleMDE({
    element: document.getElementById("editorTextarea"),
    spellChecker: false,
    hideIcons: ['side-by-side', 'fullscreen', 'image'],
    status: false,
    placeholder: placeholders[placeholderN],
  	insertTexts: {
  		image: ["![](https://", ")"],
  	},
    autofocus: true
  });
  editor.codemirror.on("change", function() {
  	if (!clearing) saveFile(currentFile.path);
  });
  clearing = false;
}
function openFile(p, n) {
  resetEditor();
  const value = fs.readFileSync(path.resolve(path.dirname(projectPath), p), {
    encoding:'utf8',
    flag:'r'
  });
  editor.value(value);
}
function saveFile(p) {
  const value = editor.value();

  fs.writeFileSync(path.resolve(path.dirname(projectPath), p), value);
}
function idFromPath(p) {
  return p.split('/').slice(-1)[0].split('.')[0];
}
function populateFiletree() {
  function drawLayer(layer, id) {
    let html = '';

    for (var item of layer) {
      if (typeof item.children !== 'undefined') {
        html += `
        <details
          onclick='focusItem(this)'
          id=${JSON.stringify(idFromPath(item.path))}
        >
          <summary>${item.name}</summary>
        </details>`;
        populateFiletree(item.children, idFromPath(item.path));
      } else {
        html += `
        <span
          onclick='focusItem(this)'
          ondblclick='openItem(this)'
          id=${JSON.stringify(idFromPath(item.path))}
        >
          ${item.name}
        </span>`;
      }
    }

    document.getElementById(id).innerHTML += html;
  }
  drawLayer(project.index, 'fileTree');
}

// Filetree items
function focusItem(e) {
  if (document.querySelector('#fileTree .active'))
    document.querySelector('#fileTree .active').classList.toggle('active');
  e.classList.toggle('active');
}
function openItem(e) {
  const file = project.index.flat(Infinity).find(i => idFromPath(i.path) === e.id);
  openFile(file.path, file.name);
}

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
    console.log('Creating initial file...');
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
          console.log('File written successfully!');
        }
      }
    );
    console.log('Done! Changing URL to avoid refresh-slipups.');
    history.replaceState(null, null, './editor.html?f=' + projectPath);
  } else {
    project = JSON.parse(fs.readFileSync(projectPath, {
      encoding:'utf8',
      flag:'r'
    }));
    currentFile = project.index.flat(Infinity)[0];
  }
})().finally(() => {
  openFile(currentFile.path, currentFile.name);
  populateFiletree();
});
