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

// Hide the context menu on click
window.addEventListener("click", e => {
  if (contextMenu.classList.contains('visible')) {
    contextMenu.classList.toggle('visible');
    document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'none';
  };
});

api.init(params);

console.log('%cWARNING!', 'font-size: 3em;color:red', '\nDo not copy/paste code in here unless you know EXACTLY what you\'re doing! Running code from external sources could give hackers unexpected access to your device.');
