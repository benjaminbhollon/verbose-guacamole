// Require any modules here.
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const removeMd = require('remove-markdown');

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
  async function returnFunction(format) {
    const supportedFormats = [
      //'epub',
      'nanowrimo obfuscated',
      'markdown',
      'plain text'
    ];
    if (!supportedFormats.includes(format.toLowerCase())) {
      alert(`Verbose Guacamole does not currently support exporting to the "${format}" format. You can put in a request or report a problem with Debug => Report a Bug!`);
      return false;
    }

    // Ask for export path
    const askForPath = new Promise(function(resolve, reject) {
      ipcRenderer.send('askForExportPath', format, project.metadata.title);
      ipcRenderer.on('askForExportPath', (event, path) => {
        resolve(path);
      });
    });

    let exportPath = await askForPath;

    if (!exportPath) {
      return false;
    } else {
      exportPath = path.resolve(exportPath);
    }

    let result = '';

    switch (format.toLowerCase()) {
      case "epub":

        break;
      case 'markdown':
        result = api.flatten(project.index)
          .filter(f => f.children === undefined)
          .map(file => fs.readFileSync(
            path.resolve(path.dirname(api.projectPath), file.path),
            {
              encoding:'utf8',
              flag:'r'
            }
          ))
          .filter(f => f.length)
          .join('\n\n---\n\n');

        fs.writeFileSync(exportPath, result);
        break;
      case "plain text":
        result = api.flatten(project.index)
          .filter(f => f.children === undefined)
          .map(file => removeMd(fs.readFileSync(
            path.resolve(path.dirname(api.projectPath), file.path),
            {
              encoding:'utf8',
              flag:'r'
            }
          )))
          .filter(f => f.length)
          .join('\n\n---\n\n');

        fs.writeFileSync(exportPath, result);
        break;
      case "nanowrimo obfuscated":
        result = api.flatten(project.index)
          .filter(f => f.children === undefined)
          .map(file => fs.readFileSync(
            path.resolve(path.dirname(api.projectPath), file.path),
            {
              encoding:'utf8',
              flag:'r'
            }
          ))
          .filter(f => f.length)
          .join('\n\n')
          .replace(/[A-Z]/g, 'N')
          .replace(/[a-z]/g, 'n');

        result = removeMd(result);

        fs.writeFileSync(exportPath, result);
        break;
      default:
        alert(`Error: VerbGuac has not been told how to handle the "${format}" format, but thinks it is supported.`);
        return false;
    }

    alert('The probject has been successfully exported to ' + exportPath + '.');
    return true;
  }

  return returnFunction;
};
