// Require any modules here.
const fs = require('fs');
const path = require('path');

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// extra is an object with any extra variables you might need.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const project = extra.project;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(type, first = false) {
    let folder = q('#fileTree .active');
    let parent = null;
    if (first) {
      parent = project.index;
    } else if (folder && folder.tagName !== 'DETAILS' && folder.parentNode.tagName === 'DETAILS') {
      folder = folder.parentNode;
      folder.open = true;
      api.setOpenFolders();
    } else if (folder === null || folder.tagName !== 'DETAILS') {
      parent = project.index;
    }

    if (parent === null) {
      var parentFile = api.flatten(project.index).find(i => api.idFromPath(i.path) === folder.id);
      parent = parentFile.children;
    }

    const filePath = './content/' + api.fileName();

    if (type === 'file') {
      fs.writeFileSync(
        path.resolve(path.dirname(api.projectPath), filePath),
        '',
        {
          encoding: 'utf8',
          flag: 'w'
        }
      );

      const newItem = {
        name: 'Untitled File',
        path: filePath,
        words: 0
      };

      if (first) {
        parent.splice(0, 0, newItem);
      } else {
        parent.push(newItem);
      }
    }
    else if (type === 'folder') parent.push({
      name: 'Untitled Folder',
      path: filePath,
      children: []
    });

    api.saveProject();

    api.populateFiletree();
    
    if (type === 'file') {
      api.openFile(api.idFromPath(filePath), 0);
      api.focusItem(api.idFromPath(filePath));
      if (!first) api.startRename(document.getElementById(api.idFromPath(filePath) + '__filename'));
    } else {
      document.getElementById(api.idFromPath(filePath)).click();
      document.getElementById(api.idFromPath(filePath)).open = true;
    }
  }

  return returnFunction;
};
