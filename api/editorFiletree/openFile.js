// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// extra is an object with any extra variables you might need.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const editors = extra.editors;
  const project = extra.project;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(id, n, editorIndex = 0) {
    // Requires the id rather than the path because even with relative paths, you can end up anywhere in the system, so it's safer for security reasons only to allow files that are part of the project
    const file = api.flatten(project.index)
      .filter(f => f.children === undefined)
      .find(f => api.idFromPath(f.path) === id)

    if (file === undefined) return false;

    q('#novelStats__open').innerText = n;

    return editors[editorIndex].open(file.path);
  }

  return returnFunction;
};
