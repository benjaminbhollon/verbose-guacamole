# verbose-guacamole
A editor for writers (especially novelists) powered by markdown and git.

![Commit Activity](https://img.shields.io/github/commit-activity/m/benjaminbhollon/verbose-guacamole) ![Latest Release](https://img.shields.io/github/v/release/benjaminbhollon/verbose-guacamole?label=current%20release)
![GPL-3.0 License](https://img.shields.io/github/license/benjaminbhollon/verbose-guacamole) ![Open Issues](https://img.shields.io/github/issues/benjaminbhollon/verbose-guacamole) [![Website Status](https://img.shields.io/website?url=https%3A%2F%2Fverboseguacamole.com)](https://verboseguacamole.com) ![Github Stars](https://img.shields.io/github/stars/benjaminbhollon/verbose-guacamole?style=social)

## Features

### Markdown editing
All files are edited in Markdown, using [EasyMDE](https://easy-markdown-editor.tk/). The placeholder for an empty file is a random selection from a list of famous first sentences of novels.

### Project History
Because of VerbGuac's integration with Git, Version History is relatively easy to explore. You can view past versions, revert to them, and even revert your reversions.

In the future, the Git integration is planned to be used to allow users to sync between devices.

### Word Sprints
A word sprint applet is built in. Pressing the icon of a runner in the Novel Stats toolbar will pop up a box where you can set the sprint time.

A pie chart representing the time left will replace the running icon during a sprint.

### Word Count Goals
Users can set session, daily, and project goals. Session goals are over as soon as the editor is closed. Daily goals reset each day until archived. Project goals last until the user hits the total word count set.

### Filesystem
VerbGuac projects are split into files, which can be separated into folders. >=v0.1.1 supports file and folder creating, renaming, moving, editing, and deleting. Open folders and files are also maintained between open sessions.

### Exporting to Popular Ebook Formats
VerbGuac has native support to export to EPUB, Markdown, Plain Text, and NaNoWriMo Obfuscated Text, with instructions to help you convert to other formats such as MOBI, Microsoft Word, PDF, and RTF.

### Whimsy
We've done our best to fill VerbGuac with as much whimsy as possible, including witty loading comments and editor placeholders that are famous first lines from novels.

If you have an idea for a way to make the VerbGuac experience fun, let us know!

### The Future
VerbGuac is still under development. Future features include:

- Syncing a project from a remote repository
- Support for non-text files such as images
- Multilingual support
- Support for custom Javascript extensions and CSS themes, possibly with an official database of endorsed extensions and themes.

## Screenshots
![v21.10 Editor](./screenshots/v21.10-editor.png)

![v21.10 Home](./screenshots/v21.10-home.png)
![v21.10 Theme Selection](./screenshots/v21.10-themeSelect.png)
![v21.10 Color Themes](./screenshots/v21.10-themes.png)
![v21.10 New Project Form](./screenshots/v21.10-newProject.png)

## License
Verbose Guacamole is released under the [GPL-3.0](./LICENSE) license. Specific files may be released under different licenses, which will be noted accordingly (such as the official themes, released under MIT, as noted in the comments).
