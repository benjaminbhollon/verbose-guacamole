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

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(id) {
    const goal = project.goals.find(g => g.id === id);
    if (typeof goal === 'undefined') return false;

    if (goal.type === 'daily') {
      goal.history.push({
        date: goal.date,
        progress: api.wordCountTotal() - goal.startingWords
      });
    }

    goal.archived = true;

    api.updateGoals();

    api.saveProject();
  }

  return returnFunction;
};
