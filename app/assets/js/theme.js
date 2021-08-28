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
    setCookie('theme', 'dark', 365);
  } else {
    root.style.setProperty('--background-color', '#fff');
    root.style.setProperty('--text-color', '#000');
    root.style.setProperty('--grey-text-color', '#666');

    root.style.setProperty('color-scheme', 'light');

    current_theme = 'light';
    setCookie('theme', 'light', 365);
  }
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  let expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function getCookie(cname) {
  let name = cname + '=';
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

function detectColorScheme() {
  if (!window.matchMedia) {
    return;
  }

  const cookie_theme = getCookie('theme');

  const mqDark = window.matchMedia(DARK_THEME);
  mqDark.addEventListener('change', (e) => {
    changeWebsiteTheme();
  });

  // Check if needed to be changed on page load. Weird logic because the function will always switch it.
  if (!mqDark.matches || cookie_theme === 'light') {
    current_theme = 'dark';
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelector('#toggle').checked = true;
    });
  }

  changeWebsiteTheme();
}

detectColorScheme();