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
  async function returnFunction() {
    if (!api.gitEnabled) {
      console.warn('Git is disabled!');
      return false;
    }
    try {
      const log = await git.log();
      let html = log.all.map(h => {
        const preview = `<span class="preview" onclick="api.checkout('${h.hash}', false)"><i class="fa fa-eye"></i>`;
        return `<span id='commit-${h.hash}'>${h.message}${h.hash !== log.all[0].hash ? preview : ''}</span></span>`;
      }).reverse().join('');
      q('#git__commits').innerHTML = html;

      q('#git').scrollTop = q('#git').scrollHeight;
    } catch (err) {
      console.error(err);
    }
  }

  return returnFunction;
};
