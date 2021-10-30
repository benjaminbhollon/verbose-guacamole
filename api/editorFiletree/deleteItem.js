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
  function returnFunction(id) {
    if (api.readOnly) return false;
    let item = document.getElementById(id);
    if (!confirm(`Do you really want to delete this ${item.tagName === 'SPAN' ? 'file' : 'folder and everything in it'}? There is no undo.`)) return;

    let file = api.flatten(project.index).find(i => api.idFromPath(i.path) === item.id);

    function deleteInFolder(folder) {
      for (f of folder) {
        if (f.children) {
          deleteInFolder(f.children);
        } else {
          fs.unlinkSync(path.resolve(path.dirname(api.projectPath), f.path));
        }
      }
    }

    if (item.tagName === 'SPAN') {
      fs.unlinkSync(path.resolve(path.dirname(api.projectPath), file.path));
    } else if (item.tagName === 'SUMMARY') {
      deleteInFolder(file.children);
    }

    file.delete = true;

    // Remove files marked for deletion
    project.index = project.index.filter(i => !i.delete);
    api.flatten(project.index)
      .filter(f => f.children)
      .forEach(f => {
        f.children = f.children.filter(f => f.delete !== true);
      });

    item.remove();

    const foundCurrent = api.flatten(project.index).find(f => api.idFromPath(f.path) === project.openFile);
    if (typeof foundCurrent === 'undefined') {
      if (api.flatten(project.index).filter(i => typeof i.children === 'undefined').length) {
        api.currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];
        document.getElementById(api.idFromPath(api.currentFile.path)).click();
        api.openFile(api.idFromPath(api.currentFile.path), api.currentFile.name, 0);
      } else {
        api.createItem('file', false, 0, false);
      }
    }
    api.saveProject();
  }

  return returnFunction;
};
