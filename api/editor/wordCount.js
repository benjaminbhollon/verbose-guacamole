// Require any modules here.
const marked = require('marked');

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
  function returnFunction(t) {
    let value = typeof t === 'undefined' ? api.editorValue() : t;

    let content = marked(value);
    var div = document.createElement("div");
    div.innerHTML = content;
    value = div.innerText;

    return value
      .split(/ |\n/)
      .filter(w => w.length)
      .length;
  }

  return returnFunction;
};
