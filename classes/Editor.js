// Include packages
const EasyMDE = require('easymde');
const path = require('path');
const fs = require('fs');

const placeholders = [
  'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going to Heaven, we were all going direct the other way. (A Tale of Two Cities)',
  'It was a dark and stormy night. (A Wrinkle in Time)',
  'Call me Ishmael. (Moby Dick)',
  'It was a pleasure to burn. (Fahrenheit 451)',
  'It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife. (Pride and Prejudice)',
  'In a hole in the ground there lived a hobbit. (The Hobbit)',
  'Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small, unregarded yellow sun. (The Hitchhiker\'s Guide to the Galaxy)',
  'It was a bright cold day in April, and the clocks were striking thirteen. (1984)',
  'All children, except one, grow up. (Peter Pan)',
  'There was a boy called Eustace Clarence Scrubb, and he almost deserved it. (Voyage of the Dawn Treader)',
  'The drought had lasted now for ten million years, and the reign of the terrible lizards had long since ended. (2001: A Space Odyssey)',
  'When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow. (To Kill a Mockingbird)',
  'There was no possibility of taking a walk that day. (Jane Eyre)',
  'First the colors. Then the humans. (The Book Thief)',
  '“Where’s Papa going with that ax?” (Charlotte\'s Web)',
  'The thousand injuries of Fortunato I had borne as I best could, but when he ventured upon insult I vowed revenge. (The Cask of Amontillado)',
  'Happy families are all alike; every unhappy family is unhappy in its own way. (Anna Karenina)',
];
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
  let togglePreview = null;
  class Editor {
    constructor(element, readOnly = false, extraOptions = {}) {
      this.readOnly = readOnly;

      this.options = {
        element,
        spellChecker: false,
        status: false,
        placeholder: placeholders[Date.now() % placeholders.length],
      	insertTexts: {
      		image: ["![](https://", ")"],
      	},
        autofocus: true,
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


      /*this.instance.codemirror.addOverlay({
        token: function(stream) {
          // Based on https://github.com/sparksuite/codemirror-spell-checker/blob/master/src/js/spell-checker.js
  				var ch = stream.peek();
  				var word = "";

  				if(rx_word.includes(ch)) {
  					stream.next();
  					return null;
  				}

  				while((ch = stream.peek()) != null && !rx_word.includes(ch)) {
  					word += ch;
  					stream.next();
  				}

          console.log(stream.current());

  				if(api.checkWord(word.replace(/‘|’/g, "'")) !== true)
  					return "spell-error"; // CSS class: cm-spell-error

  				return null;
  			}
      });*/

      togglePreview = this.instance.toolbar.find(t => t.name === 'preview').action;
      if (readOnly && !this.instance.isPreviewActive()) setTimeout(() => {togglePreview(this.instance)}, 0);

      api.emit('editorConstruct');
    }

    open(filePath) {
      this.randomizePlaceholder();
      this.opening = true;
      this.currentPath = path.resolve(path.dirname(api.projectPath), filePath);
      const result = this.value(
        fs.readFileSync(
          this.currentPath,
          {
            encoding:'utf8',
            flag:'r'
          }
        )
      )
      api.emit('fileOpen', filePath);
      this.opening = false;
      this.spellcheck();
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

/*

if (readOnly) {
  options.hideIcons = ['side-by-side', 'image', 'preview'];
  options.placeholder = '';
}

*/
