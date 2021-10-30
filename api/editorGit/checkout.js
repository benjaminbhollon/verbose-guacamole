// Require any modules here.
const fs = require('fs');

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// extra is an object with any extra variables you might need.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const git = extra.git;
  const project = extra.project;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  async function returnFunction(what, editable, stash = true) {
    if (!api.gitEnabled) {
      console.warn('Git is disabled!');
      return false;
    }

    if (!(what === 'master' && editable) && stash) {
      await git.stash();
    }
    const result = await git.checkout(what);

    if (!editable) {
      api.readOnly = true;
      q('body').dataset.readonly = 'true';
      q('#git__revertButton').dataset.hash = what;
    } else {
      api.readOnly = false;
      q('body').dataset.readonly = 'false';
    }

    if (what === 'master' && editable && stash) {
      try {
        await git.stash(['apply']);
      } catch (err) {
        console.warn(err);
      }
    }

    const updatedProject = JSON.parse(fs.readFileSync(api.projectPath, {
      encoding:'utf8',
      flag:'r'
    }));
    for (let key of Object.keys(updatedProject)) {
      project[key] = updatedProject[key];
    }
    api.currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];

    try {
      api.openFile(api.idFromPath(api.currentFile.path), api.currentFile.name);
      api.populateFiletree();
      api.populateGitHistory();
    } catch(err) {
      console.warn('GUI cleanup after checkout skipped: ', err);
    }
  }

  return returnFunction;
};
