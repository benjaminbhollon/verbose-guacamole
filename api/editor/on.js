// Require any modules here.

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// If you don't need the paths object, you do not need to include it.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const events = extra.events;

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction(eventName, callback = () => undefined) {
    if (typeof eventName === 'string') {
      if (typeof events[eventName] === 'array') {
        events[eventName].push(callback);
      } else {
        events[eventName] = [callback];
      }
      return true;
    } else {
      return false;
    }
  }

  return returnFunction;
};
