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
  function returnFunction(e) {
    e.contentEditable = true;
    if (e.tagName === 'SPAN') e.parentNode.classList.add('editing');
    e.focus();
    e.addEventListener('keydown', (event) => {
      if (event.key === ' ' && e.tagName === 'SUMMARY') {
        event.preventDefault();
        document.execCommand('insertText', false, ' ');
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        e.blur();
      }
      if (event.key === 'Escape') {
        const file = api.flatten(project.index).find(i => api.idFromPath(i.path) === e.parentNode.id);
        e.innerText = file.name;
        e.blur();
      }
    });
    e.addEventListener('blur', api.renameItem.bind(this, e));
    document.execCommand('selectAll', false, null);
  }

  return returnFunction;
};
