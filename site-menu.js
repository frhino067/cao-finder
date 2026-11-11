document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const menu = document.querySelector('.cao-menu[open]');
  if (menu && (!menu.contains(event.target) || event.target.closest('.cao-navigation a'))) {
    menu.open = false;
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const menu = document.querySelector('.cao-menu[open]');
  if (!menu) return;
  menu.open = false;
  menu.querySelector('summary').focus();
  event.preventDefault();
});

window.addEventListener('hashchange', () => {
  const menu = document.querySelector('.cao-menu[open]');
  if (menu) menu.open = false;
});
