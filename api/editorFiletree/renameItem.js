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
  function returnFunction(e) {
    e.contentEditable = false;
    if (e.tagName === 'SPAN') e.parentNode.classList.remove('editing');

    const file = api.flatten(project.index).find(i => api.idFromPath(i.path) === e.parentNode.id);

    if (e.innerText.trim().length <= 0 || e.innerText.trim() === file.name) {
      e.innerText = file.name;
      return;
    }

    file.name = e.innerText.trim();
    e.title = e.innerText.trim();

    if (file.path === api.currentFile.path) api.updateStats();

    api.saveProject();
  }

  return returnFunction;
};
