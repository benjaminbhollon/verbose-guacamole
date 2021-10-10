// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// extra is an object with any extra variables you might need.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const project = extra.project;
  const allowedTypes = [
    'session',
    'daily',
    'project'
  ];

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(type, words) {
    if (allowedTypes.indexOf(type) === -1) return false;
    if (typeof words !== 'number' || words <= 0) return false;

    let newGoal = {
      id: api.idFromPath(api.fileName()),
      type,
      words,
      date: (new Date()).toISOString(),
      startingWords: (type === 'project' ? 0 : api.wordCountTotal()),
      archived: false
    }

    project.goals.push(newGoal);

    if (type === 'daily') {
      newGoal.history = [];
    }

    q('#wordGoal__addForm').open = false;

    api.updateGoals();
    api.saveProject();
    return true;
  }

  return returnFunction;
};
