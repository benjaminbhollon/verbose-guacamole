// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// extra is an object with any extra variables you might need.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const dictionary = extra.dictionary;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(w) {
    if (
      api.customDictionary.indexOf(w) !== -1 ||
      !isNaN(w)
    ) return true;
    return dictionary.check(w);
  }

  return returnFunction;
};
