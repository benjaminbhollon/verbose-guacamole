// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// If you don't need the paths object, you do not need to include it.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const project = extra.project;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction() {
    document.getElementById('fileTree__list').innerHTML = '';

    function drawLayer(layer, id) {
      let html = '';

      for (var item of layer) {
        if (typeof item.children !== 'undefined') {
          html += `
          <details
            id="${api.idFromPath(item.path)}"
            ondragover='event.preventDefault()'
            ondrop='moveItem(event, getDraggingIndex())'
          >
            <summary
              class="folder"
              draggable="true"
              ondragstart="startMoveItem(event)"
              ondragend="stopMoveItem(event)"
              title="${item.name}"
              onclick='if (this.contentEditable !== "true") {setTimeout(api.setOpenFolders, 100);} else {event.preventDefault();}'
              ondblclick="api.startRename('${api.idFromPath(item.path)}')"
              oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();this.focus();"
              onkeydown="folderKey(event)"
            >${item.name}</summary>
          </details>`;
          const itemClone = {...item};
          setTimeout(
            () => {drawLayer(itemClone.children, api.idFromPath(itemClone.path))},
            0
          );
        } else {
          html += `
          <span
            class="file"
            id="${api.idFromPath(item.path)}"
            draggable="true"
            ondragstart="startMoveItem(event)"
            ondragend="stopMoveItem(event)"
            ondragover="setHovering(this)"
            ondrag="updatePageXY(event)"
            tabindex="0"
            onkeydown="fileKey(event)"
          >
            <span
              id="${api.idFromPath(item.path)}__filename"
              class="filename"
              title="${item.name}"
              onclick='event.preventDefault();api.openItem(this.parentNode.id)'
              ondblclick="api.startRename('${api.idFromPath(item.path)}')"
              oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();this.parentNode.focus();"
            >
              ${item.name}
            </span>
            <span
              class="label"
              data-label="${typeof item.label === 'undefined' ? 'blank' : item.label}"
              title="${typeof item.label === 'undefined' ? 'Click to add label.' : 'Labeled "' + api.getLabel(item.label).name + '". Click to edit.'}"
            >
              <div class="contextMenu">
                ${(project.labels.length) ?
                  project.labels.map(l =>
                    `<span
                       tabindex="0" onkeydown="contextMenuKey(event)"
                       onclick="api.labelFile('${api.idFromPath(item.path)}', '${l.id}')"
                       data-label="${l.id}"
                    >${l.name}</span>`
                  ).join('') :
                  `<span class="--no-click">No labels.</span>`
                }
                ${typeof item.label === 'undefined' ? '' : `<span tabindex="0" onkeydown="contextMenuKey(event)" onclick="api.labelFile('${api.idFromPath(item.path)}', undefined)">Remove Label</span>`}
                <hr>
                <span tabindex="0" onkeydown="contextMenuKey(event)" onclick="api.showModal('addLabel')">Create Label</span>
              </div>
            </span>
          </span>`;
        }
      }

      document.getElementById(id).innerHTML += html;
    }
    drawLayer(project.index, 'fileTree__list');

    api.restoreOpenFolders();
  }

  return returnFunction;
};
