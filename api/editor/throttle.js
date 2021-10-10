// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// If you don't need the paths object, you do not need to include it.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths) => {
  // You can put variables your code needs to access between runs here.

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(f, delay) {
    // Based on https://www.geeksforgeeks.org/javascript-throttling/
    let prev = 0;
    let timeout = null;

    return (...args) => {
      let now = new Date().getTime();

      if(now - prev > delay){
        if (timeout !== null) clearTimeout(timeout);
        prev = now;

        return f(...args);
      } else {
        if (timeout !== null) clearTimeout(timeout);
        timeout = setTimeout(() => {
          prev = now;
          return f(...args);
        }, delay);
      }
    }
  }

  return returnFunction;
};
