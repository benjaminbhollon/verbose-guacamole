// Require any modules here
const path = require('path');

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This allows the function access to the API and paths objects.
// DO NOT add more parameters to this function.
module.exports = (api, paths) => {
  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction() {
    q('#newProject__saveLocation').innerText = q('#newProject__folder').value =
      path.resolve(
        paths.novels,
        q('#newProject__title').value.trim().length ?
          q('#newProject__title').value.trim() :
          'Untitled Novel'
      );
    localStorage.defaultAuthor = q('#newProject__author').value;
  }

  return returnFunction;
};
