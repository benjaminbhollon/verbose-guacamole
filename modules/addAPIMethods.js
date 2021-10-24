const fs = require('fs');
const path = require('path');

module.exports = (api, paths, apiLocation = path.resolve(__dirname, '../api/')) => {
  const apiCategories = fs.readdirSync(apiLocation);

  function addAPIMethods(category, extra = {}) {
    if (apiCategories.indexOf(category) === -1) {
      console.error(`Could not add ${category} API methods: not found`);
      return [];
    }

    fs
      .readdirSync(path.resolve(apiLocation, category))
      .forEach(method => {
        api[path.parse(method).name] =
          require(path.resolve(apiLocation, category, method))(
            api,
            paths,
            extra,
          );
      });

    return true;
  }

  return addAPIMethods;
}
