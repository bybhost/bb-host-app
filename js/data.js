// Mock Data for B&B Host Demo

export const properties = [
  { id: 'p1', name: 'Studio Glam Palermo', neighborhood: 'Palermo Soho', status: 'active', beds: 2 },
  { id: 'p2', name: 'Loft Recoleta Premium', neighborhood: 'Recoleta', status: 'active', beds: 4 },
  { id: 'p3', name: 'Cozy BA Centro', neighborhood: 'Microcentro', status: 'maintenance', beds: 2 },
  { id: 'p4', name: 'Belgrano Family Home', neighborhood: 'Belgrano', status: 'active', beds: 5 },
];

export const reservations = [
  { id: 'r1', propId: 'p1', guest: 'Juan Pérez', checkIn: 'Hoy', checkOut: 'En 3 días', internalStatus: 'pending_checkin' },
  { id: 'r2', propId: 'p2', guest: 'Maria Silva', checkIn: 'Hace 2 días', checkOut: 'Hoy', internalStatus: 'pending_checkout' },
  { id: 'r3', propId: 'p4', guest: 'John Doe', checkIn: 'Mañana', checkOut: 'En 7 días', internalStatus: 'confirmed' }
];

export const tasks = [
  {
    id: 't1', 
    title: 'Coordinar Check-in con Juan', 
    type: 'checkin',
    status: 'pending',
    assignee: 'Analia',
    propId: 'p1',
    resId: 'r1',
    dueDate: 'Hoy',
    checklist: [
      { text: 'Enviar mensaje de bienvenida y pedir horario de llegada', done: true },
      { text: 'Programar limpieza previa', done: true },
      { text: 'Enviar clave de acceso o coordinar entrega de llave', done: false }
    ]
  },
  {
    id: 't2', 
    title: 'Revisión Post Check-out Maria', 
    type: 'checkout',
    status: 'pending',
    assignee: 'Socio',
    propId: 'p2',
    resId: 'r2',
    dueDate: 'Hoy',
    checklist: [
      { text: 'Verificar estado general del departamento', done: false },
      { text: 'Avisar a equipo de limpieza', done: false },
      { text: 'Dejar reseña en Airbnb', done: false }
    ]
  },
  {
    id: 't3', 
    title: 'Optimización de Perfil - Microcentro', 
    type: 'optimization',
    status: 'done',
    assignee: 'Equipo',
    propId: 'p3',
    resId: null,
    dueDate: 'Ayer',
    checklist: [
      { text: 'Revisar precios vs competencia en la zona', done: true },
      { text: 'Actualizar fotos del baño (nuevo espejo)', done: true }
    ]
  }
];
