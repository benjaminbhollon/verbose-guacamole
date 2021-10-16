// Require any modules here.
const marked = require('marked');

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
  async function returnFunction() {
    let content = marked(api.editorValue());
    var div = document.createElement("div");
    div.innerHTML = content;
    content = div.innerText;
    let stats = {};

    stats.words = api.wordCount(content);

    api.flatten(project.index).find(i => i.path === api.currentFile.path).words = stats.words;

    // If in the future the current word count should be saved as it updates, create a debounced function for it.
    // Currently, the word count is updated on init(), so the editor doesn't need to update the file.

    stats.words = stats.words.toLocaleString() + ' words';

    stats.lines = content.split('\n').filter(l => l.length).length + ' lines';

    // Update stats element
    document.getElementById('editor__stats').innerText = Object.values(stats).join(', ') + '.';

    // Update novel stats
    document.getElementById('novelStats__open').innerText = api.currentFile.name;
    
    let totalWords = api.wordCountTotal();
    project.history.wordCount[(new Date()).toISOString().split('T')[0]] = api.wordCountTotal();

    document.getElementById('novelStats__words').innerText = totalWords.toLocaleString() +
      ` (${(totalWords < api.startingWords ? '' : '+') + (totalWords - api.startingWords).toLocaleString()})`;

    api.updateGoals();
  }

  return returnFunction;
};
