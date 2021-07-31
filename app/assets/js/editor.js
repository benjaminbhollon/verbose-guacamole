// Include packages
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const querystring = require('querystring');
const marked = require('marked');
const SimpleMDE = require('simplemde');

// Get path parameters
const params = querystring.parse(location.search.slice(1));
let projectPath = params.f;

// Initialize Git with the project directory
const git = simpleGit({
  baseDir: (params.new ? projectPath : path.dirname(projectPath))
});

// Each placeholder is a famous first line from a novel in the format "quote (Book title)"
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
  'There was no possibility of taking a walk that day. (Jane Eyre)',
  'First the colors. Then the humans. (The Book Thief)',
  '“Where’s Papa going with that ax?” (Charlotte\'s Web)',
  'The thousand injuries of Fortunato I had borne as I best could, but when he ventured upon insult I vowed revenge. (The Cask of Amontillado)'
];
let placeholderN = Date.now() % placeholders.length;

// Creates a random filename--36^16=7,958,661,109,946,400,884,391,936 possible
function fileName() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  return (new Array(16)).fill().map(l=>chars[Math.floor(Math.random() * chars.length)]).join('') + '.md';
}

// Initialize the project object for new projects
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
  ],
  openFolders: []
};

// Initialize other variables
let editor = null;
let currentFile = project.index[0];
let clearing = false;
let currentlyDragging = null;
let hoveringOver = null;
let cursorX = 0;
let cursorY = 0;

// Store the current mouse location for draggable events
function updatePageXY(event) {
  cursorX = event.clientX;
  cursorY = event.clientY;
}
document.onmousemove = updatePageXY;

// Reset the editor (usually to open a file)
function resetEditor() {
  clearing = true;

  // If the editor already exists, clear it
  if (editor) {
    editor.value('');
    editor.toTextArea();
  }
  placeholderN = Date.now() % (placeholders.length - 1);
  editor = new SimpleMDE({
    element: document.getElementById("editorTextarea"),
    spellChecker: false,
    hideIcons: ['side-by-side', 'image'],
    status: false,
    placeholder: placeholders[placeholderN],
  	insertTexts: {
  		image: ["![](https://", ")"],
  	},
    autofocus: true
  });
  editor.toolbarElements.fullscreen.addEventListener('click', () => {
    document.exitFullscreen();
    document.documentElement.requestFullscreen();
  });
  editor.codemirror.on("change", function() {
  	if (!clearing) saveFile(currentFile.path);
    updateStats();
  });
  clearing = false;
}

// Open file
function openFile(p, n, first = false) {
  if (currentFile === flatten(project.index).find(i => i.path === p) && !first) return;
  resetEditor();
  clearing = true;
  const value = fs.readFileSync(path.resolve(path.dirname(projectPath), p), {
    encoding:'utf8',
    flag:'r'
  });
  editor.value(value);
  currentFile = flatten(project.index).find(i => i.path === p);
  clearing = false;
}

// Save file
function saveFile(p, v) {
  let value = null;
  if (!v) value = editor.value();
  else value = v;

  fs.writeFileSync(path.resolve(path.dirname(projectPath), p), value);
}

// Flatten an array of files and folders completely
function flatten(arr) {
  let newArr = arr;
  newArr = arr.map(i => {
    // If there are children, add them to the top-level list
    if (i.children) return [i, flatten(i.children)];
    else return i;
  }).flat(Infinity);
  return newArr;
}

// Get the id of a file or folder from the filepath given
function idFromPath(p) {
  return p.split('/').slice(-1)[0].split('.')[0];
}

// Update the stats bar
function updateStats() {
  let content = marked(editor.value());
  var div = document.createElement("div");
  div.innerHTML = content;
  content = div.innerText;
  let stats = {};

  stats.words = content
    .split(/ |\n/)
    .filter(w => w.length);

  stats.words = stats.words.length + ' words'

  stats.lines = content.split('\n').filter(l => l.length).length + ' lines';

  //Update stats element
  document.getElementById('editor__stats').innerText = Object.values(stats).join(', ') + '.';
}

/* Git */
// Updates the Commit History list
async function populateGitHistory() {
  try {
    let html = (await git.log()).all.map(h => `<span id='commit-${h.hash}'>${h.message}</span>`).reverse().join('');
    document.getElementById('git__commits').innerHTML = html;
  } catch (err) {
    console.error(err);
  }
}

// Creates a commit
async function commit() {
  const message = document.getElementById('git__commitText').value;
  document.getElementById('git__commitButton').innerText = 'Working...';
  console.info('Committing: ' + message);

  try {
    await git.add('./*').commit(message)._chain;
    console.info('Committed.');
    document.getElementById('git__commitButton').innerText = 'Commit';
    document.getElementById('git__commitText').value = '';
  } catch (err) {
    window.alert(err);
  }

  setTimeout(populateGitHistory, 250);
}

/* Filetree items */
// Saves the list of open folders
function setOpenFolders() {
  let folders = [...document.querySelectorAll('#fileTree__list details')];

  folders = folders.map(folder => {
    return {
      id: folder.id,
      open: folder.open
    };
  });

  project.openFolders = [...folders];

  saveFile(projectPath, JSON.stringify(project));
}

// Restores the open folders
function restoreOpenFolders() {
  const toOpen = project.openFolders;
  for (const folder of toOpen) {
    try {
      document.getElementById(folder.id).open = folder.open;
    } catch (err) {
      setTimeout(restoreOpenFolders, 0);
    }
  }
}

// Creates the HTML for the filetree
function populateFiletree() {
  document.getElementById('fileTree__list').innerHTML = '';

  function drawLayer(layer, id) {
    let html = '';

    for (var item of layer) {
      if (typeof item.children !== 'undefined') {
        html += `
        <details
          id=${JSON.stringify(idFromPath(item.path))}
          ondragover='event.preventDefault()'
          ondrop='moveItem(event)'
        >
          <summary
            draggable="true"
            ondragstart="startMoveItem(event)"
            ondragend="stopMoveItem(event)"
            onclick='focusItem(this, event)'
            ondblclick='this.parentNode.toggleAttribute("open");setOpenFolders();'
            oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';focusItem(this, event);"
          >${item.name}</summary>
        </details>`;
        const itemClone = {...item};
        setTimeout(
          () => {drawLayer(itemClone.children, idFromPath(itemClone.path))},
          0
        );
      } else {
        html += `
        <span
          onclick='focusItem(this, event)'
          ondblclick='openItem(this)'
          oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';focusItem(this, event);"
          draggable="true"
          ondragstart="startMoveItem(event)"
          ondragend="stopMoveItem(event)"
          ondragover="setHovering(this)"
          ondrag="updatePageXY(event)"
          id=${JSON.stringify(idFromPath(item.path))}
        >
          ${item.name}
        </span>`;
      }
    }

    document.getElementById(id).innerHTML += html;
  }
  drawLayer(project.index, 'fileTree__list');

  restoreOpenFolders();
}

// Focus on a file or folder (onclick)
function focusItem(e, event) {
  event.preventDefault();
  if (e.contentEditable === 'true') return;
  if (e.classList.contains('active') && event.type !== 'contextmenu') return startRename(e);
  if (document.querySelector('#fileTree .active'))
    document.querySelector('#fileTree .active').classList.toggle('active');
  e.classList.toggle('active');
}

// Open a file
function openItem(e) {
  const file = flatten(project.index).find(i => idFromPath(i.path) === e.id);
  openFile(file.path, file.name);
  return e;
}

// Creates a file or folder
function createItem(type) {
  let folder = document.querySelector('#fileTree .active');
  let parent = null;
  if (folder && folder.tagName !== 'DETAILS' && folder.parentNode.tagName === 'DETAILS') {
    folder = folder.parentNode;
  } else if (folder === null || folder.tagName !== 'DETAILS') {
    parent = project.index;
  }

  if (parent === null) {
    var parentFile = flatten(project.index).find(i => idFromPath(i.path) === folder.id);
    parent = parentFile.children;
  }

  const filePath = './content/' + fileName();

  if (type === 'file') {
    fs.writeFileSync(
      path.resolve(path.dirname(projectPath), filePath),
      '',
      {
        encoding: 'utf8',
        flag: 'w'
      }
    );

    parent.push({
      name: 'New File',
      path: filePath
    });
  }
  else if (type === 'folder') parent.push({
    name: 'New Folder',
    path: filePath,
    children: []
  });

  saveFile(projectPath, JSON.stringify(project));

  populateFiletree();
  setTimeout(() => {
    if (type === 'file') {
      openItem(document.getElementById(idFromPath(filePath))).click();
      startRename(document.getElementById(idFromPath(filePath)));
    } else {
      document.getElementById(idFromPath(filePath)).click();
      document.getElementById(idFromPath(filePath)).open = true;
    }
  }, 0);
}

// Makes the title of a folder editable
function startRename(e) {
  const isOpen = (e.tagName === 'SUMMARY' ? e.parentNode.open : currentFile);
  setTimeout(() => {
    if (isOpen !== (e.tagName === 'SUMMARY' ? e.parentNode.open : currentFile)) return;
    e.contentEditable = true;
    e.focus();
    document.execCommand('selectAll', false, null);
    e.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        document.execCommand('insertText', false, ' ');
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        e.blur();
      }
      if (event.key === 'Escape') {
        const file = flatten(project.index).find(i => idFromPath(i.path) === e.id);
        e.innerText = file.name;
        e.blur();
      }
    });
    e.addEventListener('blur', renameItem.bind(this, e));
  }, 300);
}

// Runs when user is done renaming file or folder
function renameItem(e) {
  e.removeAttribute('contenteditable');

  const file = flatten(project.index).find(i => idFromPath(i.path) === (e.tagName === 'SUMMARY' ? e.parentNode.id : e.id));

  if (e.innerText.length <= 0 || e.innerText === file.name) {
    e.innerText = file.name;
    return;
  }

  file.name = e.innerText;

  saveFile(projectPath, JSON.stringify(project));
}

// Deletes a file or folder (recursively, with a warning)
function deleteItem() {
  let item = document.querySelector('#fileTree .active');
  if (!confirm(`Do you really want to delete this ${item.tagName === 'SPAN' ? 'file' : 'folder and everything in it'}? There is no undo.`)) return;

  let file = flatten(project.index).find(i => idFromPath(i.path) === (item.tagName === 'SPAN' ? item.id : item.parentNode.id));

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
    console.log(project);
    saveFile(projectPath, JSON.stringify(project));
  }, 0);
}

// Shows the context menu
function showContextMenu(event) {
  contextMenu.style.top = event.clientY + 'px';
  contextMenu.style.left = event.clientX + 'px';

  if (!contextMenu.classList.contains('visible')) contextMenu.classList.toggle('visible');
}

// Runs when user starts dragging
function startMoveItem(event) {
  event.currentTarget.style.backgroundColor = '#fff';
  event.currentTarget.style.color = '#000';
  const idToMove = (event.currentTarget.tagName === 'SUMMARY' ? event.currentTarget.parentNode.id : event.currentTarget.id);
  currentlyDragging = flatten(project.index).find(i => idFromPath(i.path) === idToMove);
}

// Runs when user stops dragging
function stopMoveItem(event) {
  event.currentTarget.style.backgroundColor = '';
  event.currentTarget.style.color = '';
}

// Sets the item being hovered over
function setHovering(element) {
  hoveringOver = element;
  getDraggingIndex();
}

// Gets the index an item should be inserted at
function getDraggingIndex() {
  let index = [...hoveringOver.parentNode.children].indexOf(hoveringOver) - 1;;
  const rect = hoveringOver.getBoundingClientRect();

  if (cursorY > rect.top + (rect.height / 2)) index++;

  return index;
}

// Actually moves the item
function moveItem(event, main = false) {
  event.stopPropagation();
  const target = (
    event.path.find(e => e.tagName === 'DETAILS') ?
    flatten(project.index).find(f => idFromPath(f.path) === event.path.find(e => e.tagName === 'DETAILS').id) :
    {children: project.index}
  );
  let order = false;
  if (event.toElement.tagName === 'SPAN') order = true;

  // Check if moving folder into itself
  if (typeof currentlyDragging.children !== 'undefined') {
    if (event.path.find(e => e.id === idFromPath(currentlyDragging.path))) return;
  }

  // Get current parent
  let parent = flatten(project.index).find(f => {
    if (typeof f.children === 'undefined') return false;
    return f.children.indexOf(currentlyDragging) !== -1;
  });
  if (typeof parent === 'undefined') parent = {children: project.index};

  // Remove from parent
  parent.children.splice(parent.children.indexOf(currentlyDragging), 1);

  // Add to target
  if (order) {
    target.children.splice(getDraggingIndex(), 0, JSON.stringify(currentlyDragging));
  } else {
    target.children.push(currentlyDragging);
  }

  target.children = target.children.map(c => {
    if (typeof c === 'string') return JSON.parse(c);
    else return c;
  });

  populateFiletree();

  // Save
  saveFile(projectPath, JSON.stringify(project));
}

setTimeout(async () => {
  if (params.new) {
    console.info('New project alert! Let me get that set up for you...');
    console.info('Initializing git repository...');
    await git.init();
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
    console.info('Creating initial commit...');
    await git.add('./*');
    await git.commit('Create project')
    await populateGitHistory()
    .then(() => {
      console.info('Done! Changing URL to avoid refresh-slipups.');
      history.replaceState(null, null, './editor.html?f=' + projectPath);
    });
  } else {
    populateGitHistory();
    project = JSON.parse(fs.readFileSync(projectPath, {
      encoding:'utf8',
      flag:'r'
    }));
    currentFile = flatten(project.index)[0];

    // For compatibility with v0.1.0
    if (typeof project.openFolders === 'undefined') project.openFolders = [];
  }

  openFile(currentFile.path, currentFile.name, true);
  populateFiletree();
  updateStats();

  // Hide the context menu on click
  window.addEventListener("click", e => {
    if (contextMenu.classList.contains('visible')) {
      contextMenu.classList.toggle('visible');
      document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'none';
    };
  });
}, 0);
