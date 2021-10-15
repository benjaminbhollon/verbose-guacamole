// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// extra is an object with any extra variables you might need.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const git = extra.git;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  async function returnFunction(m) {
    if (!api.gitEnabled) {
      console.warn('Git is disabled!');
      return false;
    }
    const message = m ? m : document.getElementById('git__commitText').value;
    document.getElementById('git__commitButton').innerText = 'Working...';

    try {
      await git.add('./*').commit(message)._chain;
      document.getElementById('git__commitButton').innerText = 'Commit';
      document.getElementById('git__commitText').value = '';
    } catch (err) {
      window.alert(err);
    }

    setTimeout(api.populateGitHistory, 500);
  }

  return returnFunction;
};
