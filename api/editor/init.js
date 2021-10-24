// Require any modules here.
const fs = require('fs');
const path = require('path');

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../../modules/queries.js');

// This outer function allows the API method access to the API and paths objects.
// extra is an object with any extra variables you might need.
// DO NOT add more parameters to this function.
// Note that URIs inside either of these functions are relative to api.js, not this file.
module.exports = (api, paths, extra) => {
  // You can put variables your code needs to access between runs here.
  const project = extra.project;
  const editors = extra.editors;
  const git = extra.git;
  const Editor = require('../../classes/Editor.js')(api);

  //This is the final function that will become part of the API.
  // You MAY make it async.
  // You MAY add parameters.
  async function returnFunction() {
    api.readOnly = false;

    try {
      api.customDictionary = fs.readFileSync(path.resolve(paths.data, './customDictionary.txt'), {
        encoding:'utf8',
        flag:'r'
      }).split('\n').filter(l => l.length);
    } catch (err) {
      console.error(err);
      fs.writeFileSync(path.resolve(paths.data, './customDictionary.txt'), '');
      api.customDictionary = [];
    }

    // Create editor
    editors.push(new Editor(q('#editorTextarea')));

    // Try to initialize git to see if it's enabled
    try {
      await git.init();
      api.gitEnabled = true;
    } catch (err) {
      console.warn('Git is not installed. Continuing without.');
      api.gitEnabled = false;
      q('#git').classList.add('disabled');
    }

    if (api.params.new) {
      console.info('New project alert! Let me get that set up for you...');
      project.metadata = {
        title: api.params['meta.title'],
        author: api.params['meta.author'],
        synopsis: api.params['meta.synopsis']
      }
      console.info('Creating project file...');
      api.projectPath = path.resolve(api.projectPath, 'project.vgp');
      await fs.writeFile(
        api.projectPath,
        JSON.stringify(project),
        {
          encoding: 'utf8',
          flag: 'w'
        },
        (err) => {
          if (err) throw new Error(err);
          else {
            console.info('File written successfully!');
          }
        }
      );
      console.info('Creating title page...');
      try {
        fs.mkdirSync(path.resolve(path.dirname(api.projectPath), './content'));
      } catch(err) {
        console.warn(err);
      }
      await fs.writeFile(
        path.resolve(path.dirname(api.projectPath), project.index[0].path),
        `# ${project.metadata.title}\nby ${project.metadata.author}`,
        {
          encoding: 'utf8',
          flag: 'w'
        },
        (err) => {
          if (err) throw new Error(err);
          else {
            console.info('File written successfully!');
          }
        }
      );
      api.currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];
      if (api.gitEnabled) {
        console.info('Creating initial commit...');
        await git.add('./*');
        await git.commit('Create project');
        await api.populateGitHistory();
      }

      console.info('Done! Changing URL to avoid refresh-slipups.');
      history.replaceState(null, null, './editor.html?f=' + api.projectPath);
      api.startingWords = 0;

      fs.writeFileSync(path.resolve(path.dirname(api.projectPath), '.gitignore'), '.lock');
    } else {
      if (api.gitEnabled) {
        if ((await git.branch()).all.length <= 0) { // Project started without git
          console.info('Creating initial commit...');
          await git.add('./*');
          await git.commit('Create project');
        }
        if ((await git.branch()).current !== 'master') await api.checkout('master', true);

        api.populateGitHistory();
      }

      updatedProject = JSON.parse(fs.readFileSync(api.projectPath, {
        encoding:'utf8',
        flag:'r'
      }));
      for (let key of Object.keys(updatedProject)) {
        project[key] = updatedProject[key];
      }
      api.currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];

      // Remove files marked for deletion
      project.index = project.index.filter(i => !i.delete);
      api.flatten(project.index)
        .filter(f => f.children)
        .forEach(f => {
          f.children = f.children.filter(f => f.delete !== true);
        });

      // Calculate word counts
      api.flatten(project.index)
        .filter(i => typeof i.children === 'undefined')
        .forEach(file => {
          file.words = api.wordCount(fs.readFileSync(path.resolve(path.dirname(api.projectPath), file.path), {
            encoding:'utf8',
            flag:'r'
          }));
        });
      api.startingWords = api.wordCountTotal();

      try {
        // Setup localStorage open files and folders
        if (!localStorage.projects) localStorage.projects = JSON.stringify({});
        projectsStorage = JSON.parse(localStorage.projects);
        if (!projectsStorage[api.projectPath]) projectsStorage[api.projectPath] = {};

        const editorsStorage = projectsStorage[api.projectPath].editors ? projectsStorage[api.projectPath].editors : [
          {}
        ];

        for (const editor of editorsStorage) {
          if (!editor.openFolders) editor.openFolders = [];

          if (!editor.openFile) editor.openFile = api.idFromPath(api.currentFile.path);
          else {
            api.currentFile = api.flatten(project.index)
              .find(f => api.idFromPath(f.path) === editor.openFile);
          }
        }

        if (!api.currentFile) api.currentFile = api.flatten(project.index).filter(i => typeof i.children === 'undefined')[0];

        projectsStorage[api.projectPath].editors = editorsStorage;
        localStorage.projects = JSON.stringify(projectsStorage);
      } catch(err) {
        console.warn(err);
      }

      /* Compatibility */
      // with <v0.2.1
      if (typeof project.metadata.title !== 'string')
        project.metadata.title = project.metadata.title.final;

      // with <v0.3.2
      if (typeof project.goals === 'undefined') project.goals = [];
      if (typeof project.history === 'undefined') project.history = {};
      if (typeof project.history.wordCount === 'undefined') project.history.wordCount = {};

      // with <v0.3.3
      if (typeof project.labels === 'undefined') project.labels = [];

      // with <v0.3.5
      if (typeof project.openFolders !== 'undefined') delete project.openFolders;
      if (typeof project.openFile !== 'undefined') delete project.openFile;
    }

    // Lock project
    api.lockProject();

    // Update goals
    project.goals = project.goals.map(g => {
      let goal = g;
      if (!g.id) goal.id = api.idFromPath(api.fileName());
      if (goal.type === 'session') {
        goal.archived = true;
        goal.final = api.wordCountTotal();
      } else if (
        goal.type === 'daily' &&
        !goal.archived &&
        (
          !goal.history.length ||
          goal.date.split('T')[0] < (new Date()).toISOString().split('T')[0]
        )
      ) {
        goal.history.push({
          date: g.date,
          progress: api.wordCountTotal() - g.startingWords
        });
        goal.startingWords = api.wordCountTotal();
        goal.date = (new Date()).toISOString();
      }

      return goal;
    });

    // Add to recent projects
    let recentProjects = localStorage.recentProjects ? JSON.parse(localStorage.recentProjects) : [];
    recentProjects.push({
      title: project.metadata.title,
      author: project.metadata.author,
      path: api.projectPath
    });

    localStorage.recentProjects = JSON.stringify(
      [...new Set(
        recentProjects.map(JSON.stringify)
      )].map(JSON.parse).slice(0, 5)
    );

    api.populateFiletree();
    api.openFile(api.idFromPath(api.currentFile.path), api.currentFile.name, 0);
    api.updateLabelCSS();

    document.getElementById(api.idFromPath(api.currentFile.path)).click();
  }

  return returnFunction;
};
