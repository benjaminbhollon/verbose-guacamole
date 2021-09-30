// Require any modules here

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This allows the function access to the API object.
// DO NOT add more parameters to this function.
module.exports = api => {
  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction() {
    q('#newProject').classList.add('visible');
  }

  return returnFunction;
};
