import { init } from './game.js';
import { handleAction } from './actions.js';

document.addEventListener('DOMContentLoaded', () => {
  init();

  const app = document.getElementById('app');
  app.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    handleAction(target.dataset.action, target.dataset);
  });
});
