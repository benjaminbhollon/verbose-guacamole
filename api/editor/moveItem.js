// Require any modules here.

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
  function returnFunction(p, t, c, index, order, main = false) {
    const parent = p ? api.flatten(project.index).find(f => f.path === p) : {children: project.index};
    const target = t ? api.flatten(project.index).find(f => f.path === t) : {children: project.index};
    const currentlyDragging = api.flatten(project.index).find(f => f.path === c);

    // Remove from parent
    parent.children.splice(parent.children.indexOf(currentlyDragging), 1);

    // Add to target
    if (order) {
      target.children.splice(index, 0, JSON.stringify(currentlyDragging));
    } else {
      target.children.push(currentlyDragging);
    }

    target.children = target.children.map(c => {
      if (typeof c === 'string') return JSON.parse(c);
      else return c;
    });

    project.index = project.index.map(c => {
      if (typeof c === 'string') return JSON.parse(c);
      else return c;
    });

    api.populateFiletree();

    // Save
    api.saveProject();
  }

  return returnFunction;
};
