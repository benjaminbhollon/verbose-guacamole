// Require any modules here
const path = require('path');

// This allows the function access to the API object.
// DO NOT add more parameters to this function.
module.exports = api => {
  // Themes
  let themeId = localStorage.theme ? localStorage.theme : 'guacamole';
  let themeLocations = {
    guacamole: path.resolve(__dirname + '../../../frontend/assets/css/themes/guacamole.css'),
    avocadoPeel: path.resolve(__dirname + '../../../frontend/assets/css/themes/avocadoPeel.css'),
    monoLight: path.resolve(__dirname + '../../../frontend/assets/css/themes/monoLight.css'),
    monoDark: path.resolve(__dirname + '../../../frontend/assets/css/themes/monoDark.css'),
  }

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  function returnFunction() {
    let link = document.createElement( "link" );
    link.href = themeLocations[themeId];
    link.type = "text/css";
    link.rel = "stylesheet";

    document.getElementsByTagName( "head" )[0].appendChild( link );
  }

  return returnFunction;
};
