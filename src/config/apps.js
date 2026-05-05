// Static apps registry for v1.
// Per the blueprint: "Fuente: configuración (no dinámica compleja)".
// The same list also acts as the allow-list for `source_app` on
// POST /events/notification — only apps listed here can publish.
//
// Future v2 will move this to a DB-backed mutable registry.

const APPS = [
  {
    id: 'centro-hogar',
    name: 'Centro-Hogar',
    description: 'Portal LAN del hogar. Identidad y acceso a las apps.',
    enabled: true,
  },
  {
    id: 'homelearn',
    name: 'HomeLearN',
    description: 'Plataforma de cursos y aprendizaje familiar.',
    enabled: true,
  },
  {
    id: 'boslei',
    name: 'Boslei',
    description: 'Planning, kanban y proyectos — nativo o sincronizado.',
    enabled: true,
  },
  {
    id: 'piggy-bank',
    name: 'Piggy-Bank',
    description: 'Finanzas hogareñas, inversiones y newsletter económico.',
    enabled: true,
  },
  {
    id: 'agatha',
    name: 'Agatha',
    description: 'Gestión del negocio de crochet (productos, pedidos, clientes).',
    enabled: true,
  },
];

const APP_IDS = new Set(APPS.map((a) => a.id));

module.exports = { APPS, APP_IDS };
