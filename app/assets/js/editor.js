// Get path parameters
const params = location.search.slice(1);

/* Mouse Move */
let cursorX = 0;
let cursorY = 0;

// Store the current mouse location for draggable events
function updatePageXY(event) {
  cursorX = event.clientX;
  cursorY = event.clientY;
}
document.onmousemove = updatePageXY;

function getDraggingIndex() {
  let index = [...hoveringOver.parentNode.children].indexOf(hoveringOver) - 1;;
  const rect = hoveringOver.getBoundingClientRect();

  if (cursorY > rect.top + (rect.height / 2)) index++;

  if (index < 0) index = 0;

  return index;
}

function setHovering(element) {
  hoveringOver = element;
}

// Shows the context menu
function showContextMenu(event) {
  event.stopPropagation();
  contextMenu.style.top = event.clientY + 'px';
  contextMenu.style.left = event.clientX + 'px';

  if (!contextMenu.classList.contains('visible')) contextMenu.classList.toggle('visible');
}

/* Search */
function toggleSearch() {
  document.getElementById('fileTree__search').classList.toggle('hidden');
  if (!document.getElementById('fileTree__search').classList.contains('hidden'))
    document.getElementById('fileTree__search').focus();
}

function search(value) {
  if (value.length) {
    document.getElementById('fileTree__list').classList.add('searching');

    for (result of document.querySelectorAll('#fileTree__list summary, #fileTree__list span')) {
      if (result.innerText.toUpperCase().indexOf(value.toUpperCase()) === -1) {
        result.classList.remove('result');
      } else {
        result.classList.add('result');
      }
    }
  } else {
    document.getElementById('fileTree__list').classList.remove('searching');
  }
}

/* Moving */
let currentlyDragging = null;
function startMoveItem(event) {
  event.currentTarget.style.backgroundColor = '#fff';
  event.currentTarget.style.color = '#000';
  const idToMove = (event.currentTarget.tagName === 'SUMMARY' ? event.currentTarget.parentNode.id : event.currentTarget.id);
  currentlyDragging = api.flatten(api.getProject().index).find(i => api.idFromPath(i.path) === idToMove).path;
}

function stopMoveItem(event) {
  event.currentTarget.style.backgroundColor = '';
  event.currentTarget.style.color = '';
}

function moveItem(event, index, main = false) {
  event.stopPropagation();
  const target = (
    event.path.find(e => e.tagName === 'DETAILS') ?
    api.flatten(api.getProject().index).find(f => api.idFromPath(f.path) === event.path.find(e => e.tagName === 'DETAILS').id).path :
    false
  );

  let order = false;
  if (event.toElement.tagName === 'SPAN' || event.toElement.id === 'fileTree__actions') order = true;

  // Check if moving folder into itself
  if (typeof currentlyDragging.children !== 'undefined') {
    if (event.path.find(e => e.id === api.idFromPath(currentlyDragging.path))) return;
  }

  // Get current parent
  let parent = api.flatten(api.getProject().index).find(f => {
    if (typeof f.children === 'undefined') return false;
    return f.children.find(f => f.path === currentlyDragging);
  });
  if (typeof parent === 'undefined') parent = false;
  else parent = parent.path;

  api.moveItem(parent, target, currentlyDragging, index, order, main);
}

/* Modals */
function updateProjectDetails() {
  api.updateDetails({
    title: document.getElementById('projectDetails__title').value,
    author: document.getElementById('projectDetails__author').value,
    synopsis: document.getElementById('projectDetails__synopsis').value,
  });
}

// Hide the context menu on click
window.addEventListener("click", e => {
  if (contextMenu.classList.contains('visible')) {
    contextMenu.classList.toggle('visible');
    document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'none';
  };
  document.getElementById('spellcheckMenu').classList.remove('visible');
});

// Spellcheck
let spellChecking = null;
document.getElementById('editor').addEventListener('contextmenu', (event) => {
  if (event.path[0].classList.contains('cm-spell-error')) {
    spellChecking = event.path[0];
    const suggestions = api
      .suggestWords(event.path[0].innerText)
      .map(w => `<span onclick="spellCheckReplace('${w}');">${w}</span>`);

    const menu = document.getElementById('spellcheckMenu');

    menu.innerHTML = suggestions.join('') +
      (suggestions.length ? '<hr>' : '') +
      `<span onclick="console.log(api.addToDictionary('${event.path[0].innerText}'));spellChecking.classList.remove('cm-spell-error')">Add to Dictionary</span>`;
    menu.classList.add('visible');
    menu.style.top = event.clientY + 'px';
    menu.style.left = event.clientX + 'px';
  }
});

function spellCheckReplace(word) {
  spellChecking.innerText = word;

  api.editorValue(document.querySelector('.CodeMirror-scroll').innerText);

  return;
  const errors = [...document.querySelectorAll('.cm-spell-error')]
    .filter(e => e.innerText === spellChecking.innerText);

  const index = errors.indexOf(spellChecking);

  const value = api.editorValue();

  let newValue = value.split(spellChecking.innerText);
  newValue.splice(index, 2, newValue[index] + word + newValue[index + 1]);

  api.editorValue(newValue.join(spellChecking.innerText));

  //spellChecking.classList.remove('cm-spell-error');
}

api.init(params);

console.log('%cWARNING!', 'font-size: 3em;color:red', '\nDo not copy/paste code in here unless you know EXACTLY what you\'re doing! Running code from external sources could give hackers unexpected access to your device.');
