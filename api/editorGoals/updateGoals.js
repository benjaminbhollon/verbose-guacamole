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
  function returnFunction(updateHTML = true) {
    let goals = project.goals
      .filter(g => !g.archived)
      .map(g => {
        let newGoal = g;
        newGoal.done = Math.min(api.wordCountTotal() - g.startingWords, g.words);
        newGoal.completed = newGoal.done >= g.words;

        return newGoal;
      })
      .filter(g => !g.acknowledged)
      .sort((a, b) => {
        return (a.words - a.done) - (b.words - b.done)
      })

    if (goals.length && goals[0].type === 'project' && goals[0].completed) {
      q('#projectGoalComplete__wordCount').innerText = goals[0].words.toLocaleString();
      q('#projectGoalComplete__days').innerText =
        Math.ceil(
          (Date.now() - (new Date(goals[0].date))) / (1000 * 60 * 60 * 24)
        ).toLocaleString();
      setTimeout(api.showModal.bind(this, 'projectGoalComplete'), 1500);
      return;
    }

    if (goals.length) {
      q('#wordGoal').style = `--percent:${100*goals[0].done / goals[0].words}%`;
      if (goals[0].completed) q('#wordGoal').classList.add('flash');
      else q('#wordGoal').classList.remove('flash');
    } else q('#wordGoal').style = `--percent:0%`;

    goals = goals
      .map(g => {
        return `<div ${g.completed ? 'class="completed"' : ''} style="--percent:${g.done * 100 / g.words}%">
          ${g.type} goal: ${g.done} / ${g.words} words
          <span title="Archive Goal" class="archive" onclick="api.archiveGoal('${g.id}')"><i class="far fa-trash-alt"></i></span>
        </div>`
      });

    if (updateHTML) {

      /* Acknowledged goals */
      let acknowledged = project.goals
        .filter(g => !g.archived && g.acknowledged)
        .map(g => {
          let newGoal = g;
          newGoal.done = Math.min(api.wordCountTotal() - g.startingWords, g.words);
          newGoal.completed = newGoal.done >= g.words;
          if (!newGoal.completed) newGoal.acknowledged = false;

          return newGoal;
        })
        .sort((a, b) => {
          return a.words - b.words
        })
        .map(g => {
          return `<div ${g.completed ? 'class="completed"' : ''} style="--percent:${g.done * 100 / g.words}%">
            ${g.type} goal: ${g.done} / ${g.words} words
            <span title="Archive Goal" class="archive" onclick="api.archiveGoal('${g.id}')"><i class="far fa-trash-alt"></i></span>
          </div>`
        });

      if (goals.length + acknowledged.length) q('#wordGoal__list').innerHTML = goals.join('') + acknowledged.join('');
      else q('#wordGoal__list').innerText = "You haven't set any goals yet.";

      /* Archived goals */
      let archived = project.goals
        .filter(g => g.archived)
        .map(g => {
          let newGoal = g;
          if (g.type === 'daily') {
            newGoal.daysCompleted = 0;
            g.history.forEach(h => {
              if (h.progress >= g.words) newGoal.daysCompleted++;
            });

            newGoal = `<div ${newGoal.daysCompleted === newGoal.history.length ? 'class="completed"' : ''} style="--percent:${newGoal.daysCompleted * 100 / newGoal.history.length}%">
              ${g.type} goal: completed ${newGoal.daysCompleted}/${newGoal.history.length} days
            </div>`;
          } else {
            newGoal = `<div ${g.completed ? 'class="completed"' : ''} style="--percent:${g.done * 100 / g.words}%">
              ${g.type} goal: ${g.done} / ${g.words} words
            </div>`;
          }
          return newGoal;
        });

        q('#wordGoal__archived').innerHTML = archived.join('');
    }
  }

  return returnFunction;
};
