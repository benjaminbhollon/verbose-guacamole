// Get path parameters
const params = location.search.slice(1);

// Initialize other variables
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

// Hide the context menu on click
window.addEventListener("click", e => {
  if (contextMenu.classList.contains('visible')) {
    contextMenu.classList.toggle('visible');
    document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'none';
  };
});

api.init(params);
