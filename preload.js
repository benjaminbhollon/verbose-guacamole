const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Quick versions of document.querySelector and document.querySelectorAll
const {q, qA} = require('./modules/queries.js');

const apiF = require('./api.js');

apiF().then((api) => {
  contextBridge.exposeInMainWorld('api', api);

  const page = path.parse(location.href.split('?')[0]).name;
  const inEditor = page === 'editor';

  if (page === 'index') {
    const marked = require('marked');

    setTimeout(() => {
      // Recent projects
      if (!localStorage.recentProjects)
        localStorage.recentProjects = JSON.stringify([]);

      const recentProjects = JSON.parse(localStorage.recentProjects)
        .map(project => {
          return `
            <p onclick="location.href = 'editor.html?f=${encodeURIComponent(project.path)}';" class="recentProject" title="${project.path}">
              <strong>${project.title}</strong> by ${project.author}
            </p>
          `.trim()
        })
        .reverse()
        .join('');
      q('#projects__recent').innerHTML =
        recentProjects.length ?
        recentProjects :
        'Projects you open will show up here.';
    }, 250);
    const Parser = require('rss-parser');
    const parser = new Parser();
    (async () => {
      try {
        const feed = await parser.parseURL('https://verboseguacamole.com/feed/');
        document.getElementById('news__list').innerHTML = feed.items.map(item => `
      <div title="Click to read on the Verbose Guacamole website!" onclick="api.openURI('${item.link}')">
       <strong>${item.title}</strong><br>${(new Date(item.isoDate)).toLocaleDateString()}
      </div>
      `.trim()).join('');
      } catch (err) {
        console.error(err);
        setTimeout(() => {
          document.getElementById('news__list').innerHTML = '<p>Can\'t get news right now.</p>';
        }, 15);
      }
    })();
    (async () => {
      try {
        const feed = await parser.parseURL('https://github.com/benjaminbhollon/verbose-guacamole/releases.atom');
        const currentVersion = require('./package.json').version;
        document.getElementById('releases__list').innerHTML = feed.items
          .filter(item => {
            return item.title.toLowerCase().indexOf('v0.') === -1 &&
              item.title.toLowerCase().indexOf('beta') === -1 &&
              item.title.indexOf('RC') === -1 &&
              item.title.toLowerCase().indexOf('release candidate') === -1;
          })
          .map(item => {
            const version = item.link.split('/').slice(-1)[0].slice(1);
            return `
          <div ${version === currentVersion ? 'class="current"' : ''}>
           <h3>${item.title}</h3>
           <details>
             <summary>Release Notes</summary>
             ${item.content.split('<hr>')[0]}
           </details>
           <p>${
             version === currentVersion ?
             `This is your current version.` :
             `<a href="javascript:api.openURI('${item.link}')">Download</a>`
           }</p>
          </div>
          `
          })
          .join('<br>');
      } catch (err) {
        console.error(err);
        setTimeout(() => {
          document.getElementById('releases__list').innerHTML = '<p>Can\'t get releases right now.</p>';
        }, 15);
      }
    })();
  }

  // Respond to main process
  ipcRenderer.on('app-close', () => {
    if (inEditor) {
      // Save files
      api.saveFile();
      api.saveProject();

      // Unlock project for other sessions
      api.unlockProject();
    }
    ipcRenderer.send('closed');
  });
  ipcRenderer.on('reload', () => {
    if (inEditor) {
      // Save files
      api.saveFile();
      api.saveProject();

      // Unlock project for other sessions
      api.unlockProject();
    }

    location.reload();
  });
  ipcRenderer.on('relocate', (event, to) => {
    if (inEditor) {
      // Save files
      api.saveFile();
      api.saveProject();

      // Unlock project for other sessions
      api.unlockProject();
    }
    location.href = to;
  })
  ipcRenderer.on('newProject', (event, to) => {
    if (inEditor) {
      // Save files
      api.saveFile();
      api.saveProject();

      // Unlock project for other sessions
      api.unlockProject();
    }

    api.newProject();
  })
  ipcRenderer.on('setTheme', (event, id) => {
    localStorage.theme = id;
    if (inEditor) {
      // Save files
      api.saveFile();
      api.saveProject();

      // Unlock project for other sessions
      api.unlockProject();
    }

    location.reload();
  })
  if (inEditor) {
    ipcRenderer.on('updateProjectDetails', () => {
      api.showModal('projectDetails');
    });
    ipcRenderer.on('exportAs', (event, format) => {
      api.exportAs(format);
    });
  }

  setTimeout(() => {
    // Add "Create Project" modal
    q('#modals').innerHTML += fs.readFileSync(path.resolve(__dirname, './frontend/assets/html/newProjectModal.html'));
    q('#newProject__author').value =
      localStorage.defaultAuthor ?
      localStorage.defaultAuthor :
      '';
    api.updateNewProjectModal();

    console.info('%cWARNING!', 'font-size: 3em;color:red', '\nDo not copy/paste code in here unless you know EXACTLY what you\'re doing! Running code from external sources could give hackers unexpected access to your device.');
  }, 1000);
});
