// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// If you don't need the paths object, you do not need to include it.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths) => {
  // You can put variables your code needs to access between runs here.
  const endSprintSound = new Audio('./assets/audio/sprintDone.mp3');

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(s = 0, m = 0, h = 0) {
    if (!(s+m+h)) { // smh = shaking my head (because you set a timer for 0s)
      q('#wordSprint__error').style.display = 'block';
      return false;
    } else {
      q('#wordSprint__error').style.display = 'none';
    }

    const start = Date.now();
    const end = start +
      (1000 * s) +
      (1000 * 60 * m) +
      (1000 * 60 * 60 * h);

    q('#wordSprint').click();

    api.sprint = {
      start,
      end,
      startingWords: api.wordCountTotal(),
      total: end - start,
      interval: setInterval(() => {
        const currentWords = api.wordCountTotal();
        const written = currentWords - api.sprint.startingWords;
        q('#wordSprint__status').innerText =
          `You've written ${written.toLocaleString()} word${written !== 1 ? 's' : ''}. Keep up the good work!`;

        let timeLeft = api.sprint.end - Date.now();

        let percent = 1 - (timeLeft / api.sprint.total);

        q('#wordSprint').style = `--percent:${percent};`;
        if (percent > 0.5) q('#wordSprint').classList.add('more');

        if (timeLeft < 0) {
          q('#wordSprint__status').innerText =
            `You wrote ${written.toLocaleString()} word${written !== 1 ? 's' : ''}. Impressive!`;

          q('#wordSprint').style = '';
          q('#wordSprint').classList.remove('more');
          q('#wordSprint__popup').dataset.mode = 'finished';
          q('#wordSprint').innerHTML = '<i class="fas fa-running"></i>';

          if (!q('#wordSprint__checkbox').checked)
            q('#wordSprint').click();

          endSprintSound.play();

          clearInterval(api.sprint.interval);
          api.sprint = {};
          return;
        }

        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        timeLeft -= hoursLeft * 1000 * 60 * 60;
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));
        timeLeft -= minutesLeft * 1000 * 60;
        const secondsLeft = Math.floor(timeLeft / (1000));

        document.getElementById('wordSprint__timeLeft').innerText = `${hoursLeft}:${minutesLeft < 10 ? 0 : ''}${minutesLeft}:${secondsLeft < 10 ? 0 : ''}${secondsLeft}`;
      }, Math.min(Math.max(Math.floor((end - start)) / 360, 25), 1000)),
    };

    document.getElementById('wordSprint').classList.add('pie-chart');

    document.getElementById('wordSprint').innerHTML = '<span class="pie"><span class="segment"></span></span>'
    document.getElementById('wordSprint__popup').dataset.mode = 'running';
  }

  return returnFunction;
};
