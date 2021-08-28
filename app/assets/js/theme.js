const DARK_THEME = '(prefers-color-scheme: dark)';
const root = document.documentElement;
var current_theme = 'light';

function changeWebsiteTheme() {
  if (current_theme === 'light') {
    root.style.setProperty('--background-color', '#222');
    root.style.setProperty('--text-color', '#fff');
    root.style.setProperty('--grey-text-color', '#999');

    root.style.setProperty('color-scheme', 'dark');

    current_theme = 'dark';
    localStorage.setItem('theme', 'dark');
  } else {
    root.style.setProperty('--background-color', '#fff');
    root.style.setProperty('--text-color', '#000');
    root.style.setProperty('--grey-text-color', '#666');

    root.style.setProperty('color-scheme', 'light');

    current_theme = 'light';
    localStorage.setItem('theme', 'light');
  }
}

function detectColorScheme() {
  if (!window.matchMedia) {
    return;
  }

  const storage_theme = localStorage.getItem('theme');

  const mqDark = window.matchMedia(DARK_THEME);
  mqDark.addEventListener('change', (e) => {
    changeWebsiteTheme();
  });

  // Check if needed to be changed on page load. Weird logic because the function will always switch it.
  if (!mqDark.matches || storage_theme === 'light') {
    current_theme = 'dark';
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelector('#toggle').checked = true;
    });
  }

  changeWebsiteTheme();
}

detectColorScheme();