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

  // TODO: Should probably test to make sure you're allowed to update all of these, though tbh it's not a huge concern since this is just the metadata.
  function returnFunction(toUpdate) {
    if (api.readOnly) return alert('You cannot update novel details while in Read Only mode.');
    for (var key of Object.keys(toUpdate)) {
      if (project.metadata[key] !== undefined) project.metadata[key] = toUpdate[key];
    }
    api.saveProject();
  }

  return returnFunction;
};
