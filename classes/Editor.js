// Include packages
const EasyMDE = require('easymde');
const path = require('path');
const fs = require('fs');

// Quick versions of document.querySelector and document.querySelectorAll
const { q, qA } = require('../modules/queries.js');

const placeholders = fs.readFileSync(
  path.resolve(__dirname, '../assets/placeholders.txt'),
  {encoding:'utf8', flag:'r'}
).split('\n').filter(p => p.length);
// Define what separates a word
const rx_word = "!\"“”#$%&()*+,-–—./:;<=>?@[\\]^_`{|}~ ";
_toggleFullScreen = EasyMDE.toggleFullScreen;

// Fullscreen
toggleFullScreen = (e) => {
  document.body.classList.toggle('focusMode');
  function escapeFunction(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      document.exitFullscreen();
      document.body.classList.remove('focusMode');
      document.removeEventListener('keydown', escapeFunction);
    }
  }
  if (!document.body.classList.contains('focusMode')) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
  document.body.addEventListener('keydown', escapeFunction);
  if (e !== null) _toggleFullScreen(e);
}

module.exports = (api, projectPath) => {
  const wasReadOnly = false;
  let togglePreview = null;
  class Editor {
    constructor(element, readOnly = false, extraOptions = {}) {
      this.options = {
        element,
        spellChecker: false,
        status: false,
        placeholder: placeholders[Date.now() % placeholders.length],
      	insertTexts: {
      		image: ["![](https://", ")"],
      	},
        autoDownloadFontAwesome: false,
        toolbar: [
          'bold',
          'italic',
          'heading',
          '|',
          'quote',
          'unordered-list',
          'ordered-list',
          'link',
          '|',
          'preview',
          {
            name: 'fullscreen',
            action: toggleFullScreen,
            className: 'fa fa-arrows-alt no-disable',
            title: 'Focus Mode (F11)'
          },
          '|',
          'guide'
        ],
        shortcuts: {
          toggleFullScreen: null
        },
        ...extraOptions,
      };

      this.element = element;

      this.currentPath = '';

      this.instance = new EasyMDE(this.options);

      this.opening = false;

      const debouncedSaveFile = api.debounce(this.save.bind(this), 500);
      const debouncedSpellcheck = api.debounce(this.spellcheck.bind(this), 500);
      const throttledUpdateStats = api.throttle(api.updateStats, 50);
      this.instance.codemirror.on("change", () => {
        if (this.opening) return;
        throttledUpdateStats();
        debouncedSaveFile();
        api.emit('editorChange');

        debouncedSpellcheck();
      });

      togglePreview = this.instance.toolbar.find(t => t.name === 'preview').action;

      api.emit('editorConstruct');
    }

    open(filePath) {
      const newPath = path.resolve(path.dirname(api.projectPath), filePath);

      if (newPath !== this.currentPath) this.randomizePlaceholder();

      this.opening = true;

      if (api.readOnly && !this.instance.isPreviewActive()) {
        setTimeout(() => {togglePreview(this.instance)}, 0);
      } else if (!api.readOnly && this.instance.isPreviewActive()) {
        setTimeout(() => {togglePreview(this.instance)}, 0);
      }

      this.currentPath = newPath;

      const result = this.value(
        fs.readFileSync(
          this.currentPath,
          {
            encoding:'utf8',
            flag:'r'
          }
        )
      );

      api.emit('fileOpen', filePath);

      this.opening = false;
      this.spellcheck();
      api.updateStats();

      return result;
    }
    randomizePlaceholder() {
      const previous = this.instance.codemirror.getOption('placeholder');
      let result = previous;
      while (previous === result) {
        result = placeholders[Date.now() % placeholders.length];
      }
      this.instance.codemirror.setOption('placeholder', result);
      return result;
    }
    save() {
      if (this.readOnly) return false;
      fs.writeFileSync(
        this.currentPath,
        this.value(),
        {
          encoding: 'utf8',
          flag: 'w'
        }
      );
      const result = this.value();
      api.emit('fileSave', result);
      return result;
    }
    value(v) {
      if (this.readOnly && v !== undefined) return false;
      const result = this.instance.value(v);
      api.emit('setEditorValue', v);
      return result;
    }
    spellcheck() {
      // Create an array of all the lines in the current document
      const lines = this.value().split('\n');

      // For each line...
      for (let line = 0; line < lines.length; line++) {
        // Each char will be added to word. When the word is over, this can be read and will be reset.
        let word = '';
        // The starting position of the current word. When word === '', set this to the current char position
        let startingPos = 0;

        // For each char
        for (let chpos = 0; chpos < lines[line].length; chpos++) {
          const ch = lines[line][chpos]; // Store the char value

          if (rx_word.includes(ch) && !word.length) { // This is a divider between words, but there isn't a word yet
            continue;
          } else { // This is a normal char
            if (!word.length) { // If there is no word yet, reset the startingPos
              startingPos = chpos;
            }

            // Add the current char to the word
            word += ch;
          }

          // Checks if the next char divides words
          if (lines[line][chpos + 1] === undefined || rx_word.includes(lines[line][chpos + 1])) {
            // Word is done
            if (!api.checkWord(word.replace(/‘|’/g, "'"))) { // If true, the word is mispelled
              // Mark the incorrect
              this.instance.codemirror.markText(
                {line, ch: startingPos},
                {line, ch: chpos + 1},
                {
                  className: 'cm-spell-error'
                }
              );
            } else {
              // If this word was marked incorrect in the past, remove that mark
              this.instance.codemirror.findMarks(
                {line, ch: startingPos},
                {line, ch: chpos + 1}
              ).forEach(toClear => {
                toClear.clear();
              });
            }

            // Reset word
            word = '';
          }
        }
      }
    }
  } // That's a lot of closing braces, can you keep 'em all straight? ;)

  return Editor;
}
