// Get path parameters
const params = location.search.slice(1);

// Quick versions of document.querySelector and document.querySelectorAll
const q = s => document.querySelector(s);
const qA = s => document.querySelectorAll(s);

// Restore panel state
let panelState = localStorage.panelState ? JSON.parse(localStorage.panelState) : {
  git: true,
  fileTree: true,
};
for (var panel of Object.keys(panelState)) {
  if (panelState[panel] === false) {
    q('body').classList.add(panel + '-closed');
    q('#' + panel).classList.add('closed');
    q('#' + panel + '__tab').dataset.mode = 'open'
  }
}

/* Mouse Move */
let cursorX = 0;
let cursorY = 0;

// Store the current mouse location for draggable events
function updatePageXY(event) {
  cursorX = event.clientX;
  cursorY = event.clientY;

  if (cursorX < 15) {
    if (!q('.tab.left').classList.contains('show')) q('.tab.left').classList.add('show');
  } else if (q('.tab.left').classList.contains('show')) {
    q('.tab.left').classList.remove('show');
  }

  if (document.documentElement.clientWidth - cursorX < 15) {
    q('.tab.right').classList.add('show');
  } else if (q('.tab.right').classList.contains('show')) {
    q('.tab.right').classList.remove('show');
  }
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
function toggleSearch(eventType, event) {
  if (eventType === 'blur' && event.relatedTarget && event.relatedTarget.classList.contains('fa-search')) return;
  document.getElementById('fileTree__search').classList.toggle('hidden');
  document.getElementById('fileTree__search').focus();
}

function search(value) {
  if (value.length) {
    document.getElementById('fileTree__list').classList.add('searching');

    for (result of qA('#fileTree__list summary, #fileTree__list span')) {
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
  [...qA('.label.dropdown')].forEach(l => l.classList.remove('dropdown'));

  if (event.path[0].classList.contains('label')) event.path[0].classList.add('dropdown');
});

// Spellcheck
let spellChecking = null;
document.getElementById('editor').addEventListener('contextmenu', (event) => {
  if (event.path[0].classList.contains('cm-spell-error')) {
    spellChecking = event.path[0];
    const suggestions = api
      .suggestWords(event.path[0].innerText)
      .map(w => `<span title='Correct to "${w}"' onclick="spellCheckReplace('${w}');">${w}</span>`);

    const menu = document.getElementById('spellcheckMenu');

    menu.innerHTML = suggestions.join('') +
      (suggestions.length ? '<hr>' : '') +
      `<span onclick="api.addToDictionary('${event.path[0].innerText}');spellChecking.classList.remove('cm-spell-error')">Add to Dictionary</span>`;
    menu.classList.add('visible');
    menu.style.top = event.clientY + 'px';
    menu.style.left = event.clientX + 'px';
  }
});

function spellCheckReplace(word) {
  spellChecking.innerText = word;

  // IMPORTANT NOTE: the first item in the .replace() is a zero-width space. Yes, there _is_ something there.
  // The zero-width space needs to be removed since it is added by CodeMirror, not the user.
  const lines = [...qA('.CodeMirror-line')]
    .map(l => l.innerText.replace('???', ''));

  api.editorValue(lines.join('\n'));

  return;
}

/* Word Sprints */
function startSprint() {
  let time = q('#wordSprint__timeInput').value.split(':').reverse();

  const seconds = (time[0] ? time[0]/1 : 0);
  const minutes = (time[1] ? time[1]/1 : 0);
  const hours = (time[2] ? time[2]/1 : 0);

  api.startSprint(seconds, minutes, hours);
}

function resetSprint() {
  q('#wordSprint__timeLeft').innerText = '';
  q('#wordSprint__status').innerText = '';
  q('#wordSprint__popup').dataset.mode = 'set';
  q('#wordSprint__cancel').style.display = 'block';
}

/* Labels */
function createLabel() {
  return api.createLabel(q('#createLabel__name').value, q('#createLabel__color').value, q('#createLabel__description').value);
}

/* Tabs */
function togglePanel(panelId, tabId) {
  if (q('#' + panelId).classList.contains('closed')) {
    // Open
    q('#' + panelId).classList.remove('closed');
    q('body').classList.remove(panelId + '-closed');
    q('#' + tabId).dataset.mode = 'close';

    panelState[panelId] = true;
  } else {
    // Close
    q('#' + panelId).classList.add('closed');
    q('body').classList.add(panelId + '-closed');
    q('#' + tabId).dataset.mode = 'open';

    panelState[panelId] = false;
  }

  localStorage.panelState = JSON.stringify(panelState);
}

api.init(params);
