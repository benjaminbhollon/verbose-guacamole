// Require any modules here.
const fs = require('fs');
const path = require('path');

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// If you don't need the paths object, you do not need to include it.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths) => {
  // You can put variables your code needs to access between runs here.

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction() {
    // Don't unlock if you've detected another window locked it
    if (document.body.classList.contains('locked')) return false;
    try {
      fs.unlinkSync(path.resolve(api.projectPath, '../.lock'));
    } catch (err) {
      console.warn(err);
      return false;
    }
    return true;
  }

  return returnFunction;
};
