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

    // Update file stats
    document.getElementById('editor__stats').innerText = Object.values(stats).join(', ') + '.';

    // Update novel stats
    document.getElementById('novelStats__open').innerText = api.currentFile.name;

    let totalWords = api.wordCountTotal();
    project.history.wordCount[(new Date()).toISOString().split('T')[0]] = api.wordCountTotal();

    document.getElementById('novelStats__words').innerText = totalWords.toLocaleString() +
      ` (${(totalWords < api.startingWords ? '' : '+') + (totalWords - api.startingWords).toLocaleString()})`;

    // Update wordcount chart
    let wordsHistory = [];
    const today = new Date();
    today.setDate(today.getDate() - 30);
    for (let i = 0; i < 30; i++) {
      today.setDate(today.getDate() + 1);
      const words = (
        project.history.wordCount[today.toISOString().split('T')[0]] ||
        (wordsHistory.length ? wordsHistory.slice(-1)[0]: {words: 0}).words
      );
      wordsHistory.push({
        day: today.toISOString().split('T')[0],
        words,
        new: words - (wordsHistory.slice(-1)[0]?.words || 0)
      });
    }

    wordsHistory = wordsHistory
      .map(stat => `
          <tr title="${stat.day}: ${stat.words} words (${stat.new} new)">
            <td style="--size: ${
              stat.words / (1.1 * Math.max(...wordsHistory.map(h => h.words)))
            };">${stat.words}</td>
          </tr>
        `.trim());

    q('#stats__popup .stats__data').innerHTML = '' + `
      <table class="charts-css column show-heading show-100-secondary-axes">
        <caption>Word Count (last 30 days)</caption>
        ${wordsHistory.join('')}
      </table>
      <p>Hover over a bar to see the word count on that day.</p>
    `;

    api.updateGoals();
  }

  return returnFunction;
};
