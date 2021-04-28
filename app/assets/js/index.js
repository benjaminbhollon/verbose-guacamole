const { dialog } = require('electron').remote;

function newProject() {
  window.alert('You will need to select an empty folder to place your files in.');
  dialog.showOpenDialog(
    {
      "properties": [ 'openDirectory' ]
    }).then(result => {
    if (result.canceled !== true) {
      location.href = "./editor.html?f=" + encodeURIComponent(result.filePaths[0]) + '&new=true';
    }
  });
}

function openProject() {
  dialog.showOpenDialog({
    "filters": [
      {
        "name": "Verbose Guacamole Project",
        "extensions": ["vgp"]
      }
    ]
  }).then(result => {
    if (result.canceled !== true) {
      location.href = "./editor.html?f=" + encodeURIComponent(result.filePaths[0]);
    }
  });
}
