// Require any modules here.
const path = require('path');
const git = require('isomorphic-git');
const fs = require('fs');

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// extra is an object with any extra variables you might need.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  async function returnFunction() {
    try {
      const log = await git.log({
        fs,
        dir: path.dirname(api.projectPath),
      });
      let html = log.map(h => {
        const preview = `<span class="preview" onclick="api.checkout('${h.oid}', false)"><i class="fa fa-eye"></i>`;
        return `<span id='commit-${h.oid}'>${h.commit.message}${h.oid !== log[0].oid ? preview : ''}</span></span>`;
      }).reverse().join('');
      q('#git__commits').innerHTML = html;

      q('#git').scrollTop = q('#git').scrollHeight;
    } catch (err) {
      console.error(err);
    }
  }

  return returnFunction;
};
