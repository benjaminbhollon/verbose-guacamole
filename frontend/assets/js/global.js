api.loadTheme();

// Modal keypresses
function modalKey(event) {
  switch (event.key) {
    case 'Escape':
      event.currentTarget.classList.remove('visible');
      break;
    default:
      break;
  }
}
