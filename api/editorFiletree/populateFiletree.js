// Require any modules here.
const path = require('path');
const fs = require('fs');
const git = require('isomorphic-git');

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// If you don't need the paths object, you do not need to include it.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  let project = null;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  async function returnFunction() {
    const editor = extra.editors[0];
    if (editor.previewingCommit) {
      project = await git.readBlob({
        fs,
        dir: path.dirname(api.projectPath),
        oid: editor.previewingCommit,
        filepath: 'project.vgp'
      });
      project = JSON.parse(new TextDecoder().decode(project.blob));
    } else {
      project = extra.project;
    }

    document.getElementById('fileTree__list').innerHTML = '';

    function getLayer(layer) {
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
              onclick='if (this.contentEditable === "true") {event.preventDefault();} else {setTimeout(api.setOpenFolders, 25)}'
              ondblclick="api.startRename('${api.idFromPath(item.path)}')"
              oncontextmenu="document.getElementById('deleteButton').style.display = document.getElementById('renameButton').style.display = 'block';event.preventDefault();this.focus();"
              onkeydown="folderKey(event)"
            >${item.name}</summary>
            ${getLayer({...item}.children)}
          </details>`;
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
              onclick='event.preventDefault();api.openFile(this.parentNode.id)'
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

      return html;
    }

    document.getElementById('fileTree__list').innerHTML =
      getLayer(project.index);

    api.restoreOpenFolders();
    if (api.activeFile)
      document.getElementById(api.activeFile).classList.add('active');
  }

  return returnFunction;
};
