// Require any modules here
const { shell } = require('electron');

// This allows the function access to the API object.
// DO NOT add more parameters to this function.
module.exports = api => {
  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(uri) {
    shell.openExternal(uri);
  }

  return returnFunction;
};
