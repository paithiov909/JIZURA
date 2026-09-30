// Import order is intentional: initialize J before the production bridge modules.
import './bootstrap';
import '../../cep/cep.js';
import '../../src/13_webmcp.js';

window.__spike.started = true;
document.querySelector('#startup')!.textContent = 'JavaScript, CSS and asset loaded';
