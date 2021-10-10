// Require any modules here.

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
    const currentWords = api.wordCountTotal();
    const written = currentWords - api.sprint.startingWords;

    q('#wordSprint__status').innerText =
      `You wrote ${written.toLocaleString()} word${written !== 1 ? 's' : ''}. Impressive!`;

    q('#wordSprint').style = '';
    q('#wordSprint__cancel').style.display = 'none';
    q('#wordSprint').classList.remove('more');
    q('#wordSprint__popup').dataset.mode = 'finished';
    q('#wordSprint').innerHTML = '<i class="fas fa-running"></i>';

    if (!q('#wordSprint__checkbox').checked)
      q('#wordSprint').click();

    clearInterval(api.sprint.interval);
    api.sprint = {};
  }

  return returnFunction;
};
