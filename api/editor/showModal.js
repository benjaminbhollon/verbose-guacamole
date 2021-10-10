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
  function returnFunction(name) {
    let modal = null;
    switch (name) {
      case 'projectDetails':
        if (api.readOnly) return alert('You cannot update novel details while in Read Only mode.');
        modal = document.getElementById('projectDetails');

        // Restore values
        document.getElementById('projectDetails__title').value = project.metadata.title;
        document.getElementById('projectDetails__author').value = project.metadata.author;
        document.getElementById('projectDetails__synopsis').value = project.metadata.synopsis;

        modal.classList.add('visible');
        break;
      case 'projectGoalComplete':
        modal = document.getElementById('projectGoalComplete');
        modal.classList.add('visible');
        break;
      case 'addLabel':
        modal = document.getElementById('addLabel');
        modal.classList.add('visible');
        break;
      default:
        throw new Error(`There is no modal named '${name}'`);
        break;
    }
  }

  return returnFunction;
};
