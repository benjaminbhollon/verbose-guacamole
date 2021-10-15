// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// If you don't need the paths object, you do not need to include it.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths) => {
  // You can put variables your code needs to access between runs here.
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction() {
    return (new Array(16))
      .fill()
      .map(l => chars[Math.floor(Math.random() * chars.length)])
      .join('') +
      '.md';
  }

  return returnFunction;
};
