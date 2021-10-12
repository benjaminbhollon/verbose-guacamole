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
  async function returnFunction(where, name) {
    if (!api.gitEnabled) {
      console.warn('Git is disabled!');
      return false;
    }

    const confirmMessage = "Warning! Reverting will permanently remove any changes since the last commit. If you think you might want them later for any reason, make sure you create a commit before continuing!";
    if (!confirm(confirmMessage)) return;

    const range = `${where}..HEAD`;

    await git.reset({'--hard': null});

    await api.checkout('master', false, false);

    await git.stash();

    await git.revert(range, {'--no-commit': null});

    await api.commit(`Revert to "${q(`#commit-${where}`).innerText}"`);

    await api.checkout('master', true, false);
  }

  return returnFunction;
};
