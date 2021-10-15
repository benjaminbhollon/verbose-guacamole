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
  function returnFunction(id, editorIndex = 0) {
    api.focusItem(id);
    const file = api.flatten(project.index).find(i => api.idFromPath(i.path) === id);
    api.openFile(api.idFromPath(file.path), file.name, editorIndex);


    const projectsStorage = JSON.parse(localStorage.projects)
    const editorsStorage = projectsStorage[api.projectPath].editors;
    editorsStorage[0].openFile = id;
    localStorage.projects = JSON.stringify(projectsStorage);

    api.saveProject();
    return document.getElementById(id);
  }

  return returnFunction;
};
