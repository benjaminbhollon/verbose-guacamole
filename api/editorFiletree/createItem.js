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
  function returnFunction(type, parentId = false, index = false, rename = true) {
    if (type !== 'file' && type !== 'folder') {
      console.error(`You can create an item with type "${type}".`);
    }

    const parent = parentId ?
      api.flatten(project.index)
        .find(f =>
          api.idFromPath(f.path) === parentId &&
          typeof f.children !== 'undefined'
        )
        .children :
      project.index;

    if (!parent) {
      console.error(`Could not find folder with ID "${parentId}"`);
      return false;
    }

    const folderObject = parentId ?
      undefined :
      document.getElementById(parentId);

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

      if (typeof index === "number") {
        parent.splice(index, 0, newItem);
      } else {
        parent.push(newItem);
      }
    } else if (type === 'folder') {
      const newItem = {
        name: 'Untitled Folder',
        path: filePath,
        children: []
      };

      if (typeof index === "number") {
        parent.splice(index, 0, newItem);
      } else if (parentId) {
        parent.splice(0, 0, newItem);
      } else {
        parent.push(newItem);
      }
    }

    if (parentId) {
      document.getElementById(parentId).open = true;
    }

    api.setOpenFolders();

    api.saveProject();

    api.populateFiletree();

    if (type === 'file') {
      api.openFile(api.idFromPath(filePath), 0);
      if (rename) api.startRename(api.idFromPath(filePath));
    } else {
      document.getElementById(api.idFromPath(filePath)).open = true;
      api.setOpenFolders();
      if (rename) api.startRename(api.idFromPath(filePath));
    }
  }

  return returnFunction;
};
