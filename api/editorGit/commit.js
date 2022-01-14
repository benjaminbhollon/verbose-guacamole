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
  const project = extra.project;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  async function returnFunction(m) {
    const message = m ? m : document.getElementById('git__commitText').value;
    document.getElementById('git__commitButton').innerText = 'Working...';


    await git.add({fs, dir: path.dirname(api.projectPath), filepath: '.'});
    await git.commit({
      fs,
      dir: path.dirname(api.projectPath),
      author: {
        name: project.metadata.author,
        email: 'noreply@verboseguacamole.com'
      },
      message
    });
    document.getElementById('git__commitButton').innerText = 'Commit';
    document.getElementById('git__commitText').value = '';
    await api.populateGitHistory();

    //setTimeout(api.populateGitHistory, 500);
  }

  return returnFunction;
};
