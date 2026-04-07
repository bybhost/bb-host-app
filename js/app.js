// --- Setup Persistence (Local Storage) --- //
const STORE_KEY = 'bbhost_data_v1';

const defaultData = {
  properties: [
    { id: 'p1', name: 'Studio Glam Palermo', neighborhood: 'Palermo Soho', status: 'active', beds: 2, url: '#' },
    { id: 'p2', name: 'Loft Recoleta Premium', neighborhood: 'Recoleta', status: 'active', beds: 4, url: '#' }
  ],
  reservations: [
    { id: 'r1', propId: 'p1', guest: 'Juan Pérez', checkIn: new Date().toISOString().split('T')[0], checkOut: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], internalStatus: 'pending' }
  ],
  tasks: [
    {
      id: 't1', title: 'Coordinar Check-in Juan', type: 'checkin', status: 'pending', assignee: 'Analia', propId: 'p1', dueDate: new Date().toISOString().split('T')[0],
      checklist: [{ text: 'Mandar mensaje', done: true }, { text: 'Agendar Limpieza', done: false }]
    }
  ],
  trash: []
};

let state = defaultData;

function saveData() {
  // localStorage.setItem(STORE_KEY, JSON.stringify(state));
  updateNotifications();
}


let currentView = 'dashboard';
let searchQuery = '';
let currentResPropId = 'all';
let currentAnaPropId = 'all';
let editingId = null;

let navItems, viewContainer, topbarSearch, modalRoot, modalContent, notifDropdown;

function init() {
  navItems = document.querySelectorAll('.nav-item');
  viewContainer = document.getElementById('view-container');
  topbarSearch = document.querySelector('.topbar-search input');
  modalRoot = document.getElementById('modal-root');
  modalContent = document.getElementById('modal-content');
  notifDropdown = document.getElementById('notif-dropdown');

  setupNavigation();
  setupTopbar();
  updateNotifications();
  renderView(currentView);

  modalRoot.addEventListener('click', (e) => {
    if (e.target === modalRoot) closeModal();
  });
}

function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      navItems.forEach(n => n.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentView = e.currentTarget.getAttribute('data-target');
      topbarSearch.value = ''; 
      searchQuery = '';
      notifDropdown.classList.add('hidden');
      renderView(currentView);
    });
  });
}

function setupTopbar() {
  topbarSearch.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderView(currentView);
  });
}

window.toggleNotifications = function() {
  notifDropdown.classList.toggle('hidden');
};

function updateNotifications() {
  if (!document.getElementById('notif-badge')) return;
  const badge = document.getElementById('notif-badge');
  const drop = document.getElementById('notif-dropdown');
  let alerts = [];
  
  const todayRaw = new Date();
  const today = new Date(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate()); 
  
  state.reservations.forEach(r => {
    if (!r.checkIn) return;
    const parts = r.checkIn.split('-');
    const cin = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    const diff = Math.round((cin - today) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) alerts.push({ class: 'notif-alert', icon: 'ph-warning-circle', title: 'Check-in HOY', desc: r.guest });
    else if (diff === 1) alerts.push({ class: 'notif-warn', icon: 'ph-clock', title: 'Check-in Mañana', desc: r.guest });
    
    if (r.internalStatus === 'pending' && diff >= 0 && diff <= 5) {
      alerts.push({ class: 'notif-warn', icon: 'ph-money', title: 'Pago Pendiente Urgente', desc: `Reserva: ${r.guest}` });
    }
  });
  
  state.tasks.forEach(t => {
    if (t.status === 'pending' && t.dueDate) {
      const parts = t.dueDate.split('-');
      const due = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      if (due < today) alerts.push({ class: 'notif-alert', icon: 'ph-warning', title: 'Checklist Atrasado', desc: t.title });
    }
  });
  
  if(alerts.length > 0) {
    badge.style.display = 'block';
    drop.innerHTML = alerts.map(a => `<div class="notif-item ${a.class}"><div class="notif-title"><i class="ph ${a.icon}"></i> ${a.title}</div><div class="notif-desc">${a.desc}</div></div>`).join('');
  } else {
    badge.style.display = 'none';
    drop.innerHTML = '<div class="notif-item"><div class="notif-desc" style="color:#2e7d32"><i class="ph ph-check-circle"></i> ¡Todo al día! No hay prioridades.</div></div>';
  }
}

function renderView(view) {
  if (!viewContainer) return;
  viewContainer.innerHTML = ''; 
  switch(view) {
    case 'dashboard': viewContainer.innerHTML = renderDashboard(); break;
    case 'properties': viewContainer.innerHTML = renderProperties(); break;
    case 'tasks': viewContainer.innerHTML = renderTasks(); attachTaskEvents(); break;
    case 'reservations': viewContainer.innerHTML = renderReservations(); break;
    case 'analytics': 
       viewContainer.innerHTML = renderAnalytics(); 
       if (typeof initCharts === 'function') setTimeout(() => initCharts(), 100);
       break;
    case 'trash': viewContainer.innerHTML = renderTrash(); break;
  }
}

// --- VIEWS --- //
function renderDashboard() {
  let pendingTasks = state.tasks.filter(t => t.status === 'pending');
  // Enriquecemos la búsqueda profunda para el Dashboard
  let filteredTasks = pendingTasks;
  if(searchQuery) {
     const sq = searchQuery.toLowerCase();
     filteredTasks = pendingTasks.filter(t => {
        const p = state.properties.find(x => x.id === t.propId);
        const pName = p ? p.name.toLowerCase() : '';
        return (t.title || '').toLowerCase().includes(sq) ||
               (t.assignee || '').toLowerCase().includes(sq) ||
               pName.includes(sq);
     });
  }

  const todayRaw = new Date();
  const todayStr = `${todayRaw.getFullYear()}-${String(todayRaw.getMonth()+1).padStart(2,'0')}-${String(todayRaw.getDate()).padStart(2,'0')}`;

  const todayCheckins = state.reservations.filter(r => r.checkIn === todayStr);
  const todayCheckouts = state.reservations.filter(r => r.checkOut === todayStr);

  return `
    <h1>Panel de Control</h1>
    <div class="grid grid-cols-3" style="margin-bottom: 32px;">
      <div class="glass-panel" onclick="document.querySelector('[data-target=\\'tasks\\']').click()" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'" style="cursor: pointer; transition: transform 0.2s; border-bottom: 4px solid var(--color-primary);">
        <div style="font-size: 32px; font-weight: 700; color: var(--color-primary);">${filteredTasks.length}</div>
        <div style="color: var(--text-muted); font-size: 14px; font-weight: 500;">Checklists Pendientes</div>
      </div>
      <div class="glass-panel" onclick="document.querySelector('[data-target=\\'tasks\\']').click()" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'" style="cursor: pointer; transition: transform 0.2s; border-bottom: 4px solid #2ecc71;">
        <div style="font-size: 32px; font-weight: 700; color: #2ecc71;">${todayCheckins.length}</div>
        <div style="color: var(--text-muted); font-size: 14px; font-weight: 500;">Check-ins Hoy</div>
      </div>
      <div class="glass-panel" onclick="document.querySelector('[data-target=\\'tasks\\']').click()" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'" style="cursor: pointer; transition: transform 0.2s; border-bottom: 4px solid #e67e22;">
        <div style="font-size: 32px; font-weight: 700; color: #e67e22;">${todayCheckouts.length}</div>
        <div style="color: var(--text-muted); font-size: 14px; font-weight: 500;">Check-outs Hoy</div>
      </div>
    </div>
    <div class="grid grid-cols-2" style="gap:24px;">
      <!-- Columna 1: Pizarra de la Agencia -->
      <div class="glass-panel" style="display:flex; flex-direction:column;">
        <h2 style="display:flex; align-items:center; gap:8px; margin:0;"><i class="ph ph-push-pin" style="color:#f39c12"></i> Pizarra de Agencia</h2>
        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">(Común para todo el equipo)</p>
        <textarea id="boardNoteArea" style="flex-grow:1; width:100%; min-height:180px; padding:16px; border-radius:8px; border:1px solid #f1c40f; background:#fff9c4; font-family:'Outfit', sans-serif; resize:none; font-size:15px; color:#2c3e50; margin-top:12px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02)" placeholder="Escribí notas, avisos o pendientes rápidos para el equipo acá... se guardan automáticamente." onkeyup="state.boardNote = this.value; saveData();">${state.boardNote || ''}</textarea>
      </div>
      <!-- Columna 2: Tareas Operativas -->
      <div class="glass-panel">
        <h2 style="margin:0;">Próximas Tareas Operativas</h2>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
          ${filteredTasks.length === 0 ? '<p style="color:var(--text-muted);font-size:14px;">No hay tareas a la vista.</p>' : filteredTasks.slice(0,5).map(task => {
            const prop = state.properties.find(p => p.id === task.propId);
            return `
            <div style="padding: 12px; background: rgba(255,255,255,0.5); border: 1px solid var(--border-light); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 500; font-size: 14px;">${task.title}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">📍 ${prop ? prop.name : 'General'} • Ast: ${task.assignee}</div>
              </div>
              <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="document.querySelector('[data-target=\\'tasks\\']').click()">Ver</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderProperties() {
  const filtered = filterByQuery(state.properties, ['name', 'neighborhood']);
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1 style="margin: 0;">Propiedades en Gestión</h1>
      <div style="display:flex; gap:12px">
        <button class="btn btn-outline" onclick="exportToCSV('all')" style="color:#107c41; border-color:#107c41"><i class="ph ph-file-csv"></i> Estadísticas Propiedades</button>
        <button class="btn btn-primary" onclick="openPropModal()"><i class="ph ph-plus"></i> Nueva Propiedad</button>
      </div>
    </div>
    <div class="grid grid-cols-2">
      ${filtered.length === 0 ? '<p style="grid-column: span 2;">No properties found.</p>' : ''}
      ${filtered.map(prop => `
        <div class="glass-panel" style="display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h3 style="font-size: 18px; color: var(--color-primary); margin:0">${prop.name}</h3>
              <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">📍 ${prop.neighborhood} • Comisiones: Airbnb ${prop.airbnbPct || 15}% | B&B ${prop.bbPct || 20}%</p>
            </div>
            <span class="badge ${prop.status === 'active' ? 'green' : 'red'}">${prop.status === 'active' ? 'Activa' : 'Mantenimiento'}</span>
          </div>
          <div style="margin-top: auto; padding-top: 24px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 13px; color: var(--text-muted);"><i class="ph ph-bed"></i> ${prop.beds} max</div>
            <div style="display:flex; gap:8px;">
               <button class="btn-icon" title="Exportar Propiedad" onclick="exportToCSV('${prop.id}')" style="color:#107c41"><i class="ph ph-file-csv"></i></button>
               <button class="btn-icon" title="Editar" onclick="editEntity('prop', '${prop.id}')"><i class="ph ph-pencil"></i></button>
               <button class="btn-icon danger" title="Eliminar" onclick="deleteEntity('prop', '${prop.id}')"><i class="ph ph-trash"></i></button>
               <a href="${prop.url && prop.url !== '#' ? prop.url : '#'}" target="${prop.url && prop.url !== '#' ? '_blank' : ''}" class="btn btn-outline" style="font-size: 13px; padding: 4px 8px; text-decoration: none;" onclick="if('${prop.url}' === '#' || '${prop.url}' === 'null' || '${prop.url}' === '') { alert('No configuraste un enlace de Airbnb.'); return false; }"><i class="ph ph-airbnb-logo"></i> Link</a>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTasks() {
  let filtered = state.tasks;
  if (searchQuery) {
     const sq = searchQuery.toLowerCase();
     filtered = state.tasks.filter(t => {
        const p = state.properties.find(x => x.id === t.propId);
        const pName = p ? p.name.toLowerCase() : '';
        return (t.title || '').toLowerCase().includes(sq) ||
               (t.assignee || '').toLowerCase().includes(sq) ||
               pName.includes(sq);
     });
  }

  // División del cerebro (Agencia vs Huéspedes)
  let opTasks = filtered.filter(t => t.id.includes('_integral') || t.title.startsWith('Check-in / Check-out') || t.title.startsWith('Operación Integral'));
  let inTasks = filtered.filter(t => !t.id.includes('_integral') && !t.title.startsWith('Check-in / Check-out') && !t.title.startsWith('Operación Integral'));

  // Algoritmo de urgencia para Huéspedes: Ordenar por Due Date ascendente
  opTasks.sort((a,b) => {
     if(!a.dueDate) return 1;
     if(!b.dueDate) return -1;
     return new Date(a.dueDate) - new Date(b.dueDate);
  });

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1 style="margin: 0;">Hub de Checklists</h1>
      <button class="btn btn-primary" onclick="openTaskModal()"><i class="ph ph-plus"></i> Nueva Tarea Interna</button>
    </div>
    <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 32px;">
      <!-- LADO A: Administrativo (Izquierda) -->
      <div>
        <h2 style="font-size: 18px; margin-bottom: 20px; color: var(--color-primary);"><i class="ph ph-building-office"></i> Tareas de la Agencia</h2>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${inTasks.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">Todo al día en la oficina.</p>' : ''}
          ${inTasks.filter(t => t.status === 'pending').map(task => renderTaskCard(task)).join('')}
          ${inTasks.filter(t => t.status === 'done').length > 0 ? `<div style="margin-top:16px; border-top:1px solid var(--border-light); padding-top:16px; opacity:0.6"><h3 style="font-size:13px; margin-bottom:12px; color:var(--text-muted)">Terminadas</h3>${inTasks.filter(t => t.status === 'done').map(task => renderTaskCard(task)).join('')}</div>` : ''}
        </div>
      </div>

      <!-- LADO B: Huéspedes (Derecha) -->
      <div>
        <h2 style="font-size: 18px; margin-bottom: 20px; color: var(--color-primary);"><i class="ph ph-briefcase"></i> Check in / Check out</h2>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${opTasks.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">No hay check-ins programados.</p>' : ''}
          ${opTasks.filter(t => t.status === 'pending').map(task => renderTaskCard(task)).join('')}
          ${opTasks.filter(t => t.status === 'done').length > 0 ? `<div style="margin-top:16px; border-top:1px solid var(--border-light); padding-top:16px; opacity:0.6"><h3 style="font-size:13px; margin-bottom:12px; color:var(--text-muted)">Operadas Históricas</h3>${opTasks.filter(t => t.status === 'done').map(task => renderTaskCard(task)).join('')}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderTaskCard(task) {
  const isDone = task.status === 'done';
  const prop = state.properties.find(p => p.id === task.propId);
  const checklist = task.checklist || [];
  const progress = checklist.filter(c => c.done).length;
  const total = checklist.length;
  const progressPct = total > 0 ? Math.round((progress / total) * 100) : 0;
  
  return `
    <div class="glass-panel" style="padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <div style="font-weight: 600; font-size: 16px; color: ${isDone ? 'var(--text-muted)' : 'var(--text-main)'}; text-decoration: ${isDone ? 'line-through' : 'none'}; display:flex; align-items:center; gap:8px;">
            ${task.title} 
            <button class="btn-icon" onclick="editEntity('task', '${task.id}')"><i class="ph ph-pencil"></i></button> 
            <button class="btn-icon danger" onclick="deleteEntity('task', '${task.id}')"><i class="ph ph-trash"></i></button>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">📍 ${prop ? prop.name : 'General'} • 👤 ${task.assignee}</div>
        </div>
        ${!isDone ? `<span class="badge ${task.dueDate ? 'red' : 'gray'}">${task.dueDate || 'S/D'}</span>` : `<span class="badge green">Hecho</span>`}
      </div>
      ${total > 0 ? `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: var(--text-muted);">
          <span>Progreso: ${progress}/${total}</span>
          <span>${progressPct}%</span>
        </div>
        <div style="height: 6px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${progressPct}%; background: var(--color-primary); transition: width 0.3s;"></div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${checklist.map((item, idx) => `
          <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 14px;">
            <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" data-item-idx="${idx}" ${item.done ? 'checked' : ''} style="margin-top: 3px; accent-color: var(--color-primary);">
            <span style="${item.done ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${item.text}</span>
          </label>
        `).join('')}
      </div>
      ` : '<p style="font-size:13px; color:var(--text-muted)">Sin subtareas</p>'}
    </div>
  `;
}

function attachTaskEvents() {
  document.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const taskId = e.target.getAttribute('data-task-id');
      const itemIdx = parseInt(e.target.getAttribute('data-item-idx'));
      const taskIndex = state.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].checklist[itemIdx].done = e.target.checked;
        const allDone = state.tasks[taskIndex].checklist.every(c => c.done);
        state.tasks[taskIndex].status = allDone ? 'done' : 'pending';
        saveData();
        renderView('tasks');
      }
    });
  });
}

window.setResPropTab = function(propId) {
  currentResPropId = propId;
  renderView('reservations');
};

window.toggleResStatus = function(id) {
   const r = state.reservations.find(x => x.id === id);
   if(r) r.payStatus = (r.payStatus === 'Pagado' ? 'No pagado' : 'Pagado');
   saveData();
   renderView('reservations');
};

window.archiveReservation = function(id) {
   if(!confirm('¿Marcar operación como finalizada y archivar en el Histórico?')) return;
   const r = state.reservations.find(x => x.id === id);
   if(r) { 
      r.isArchived = true; 
      saveData(); 
      renderView('reservations'); 
   }
};

function renderReservations() {
  let filtered = state.reservations;
  if (searchQuery) {
     const sq = searchQuery.toLowerCase();
     filtered = state.reservations.filter(r => {
        const p = state.properties.find(x => x.id === r.propId);
        const pName = p ? p.name.toLowerCase() : '';
        return (r.guest || '').toLowerCase().includes(sq) ||
               (r.email || '').toLowerCase().includes(sq) ||
               (r.phone || '').toLowerCase().includes(sq) ||
               (r.notes || '').toLowerCase().includes(sq) ||
               pName.includes(sq);
     });
  }
  
  const allTab = `<button class="tab ${currentResPropId === 'all' ? 'active' : ''}" onclick="setResPropTab('all')">Todas</button>`;
  const propTabs = state.properties.map(p => `<button class="tab ${currentResPropId === p.id ? 'active' : ''}" onclick="setResPropTab('${p.id}')">${p.name}</button>`).join('');

  let finalRes = currentResPropId !== 'all' ? filtered.filter(r => r.propId === currentResPropId) : filtered;
  finalRes.sort((a,b) => new Date(a.checkIn) - new Date(b.checkIn));

  const todayRaw = new Date();
  const today = new Date(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate());

  let groupRed = [];   
  let groupYellow = []; 
  let groupGreen = [];  
  let groupPast = [];   

  finalRes.forEach(r => {
    const p1 = r.checkIn.split('-');
    const p2 = r.checkOut.split('-');
    const dIn = new Date(parseInt(p1[0]), parseInt(p1[1])-1, parseInt(p1[2]));
    const dOut = new Date(parseInt(p2[0]), parseInt(p2[1])-1, parseInt(p2[2]));
    
    if (r.isArchived) {
       // Histórico explícito por el usuario
       const diffPast = Math.round((today - dOut) / (1000 * 60 * 60 * 24));
       if (diffPast <= 30) groupPast.push(r); // Lo dejamos visible por 30 días desde el checkout si está archivado
    } else {
       // Aún activo
       if (dOut < today) {
          // Ya checkouts pasados (Aún sin archivar. URGE accion manual de Archivar)
          r.needsArchive = true;
          groupRed.push(r); // Lo ponemos en Rojo intenso para que lo archiven
       } else {
          const diff = Math.round((dIn - today) / (1000 * 60 * 60 * 24));
          if (diff <= 7 || dIn <= today) groupRed.push(r); // Atención u Ocupado actual
          else if (diff <= 30) groupYellow.push(r);
          else groupGreen.push(r);
       }
    }
  });

  const renderer = (res) => {
    const prop = state.properties.find(p => p.id === res.propId);
    
    let actionBtn = res.isArchived ? 
       `<span style="font-size:11px; color:#27ae60"><i class="ph ph-check-circle"></i> Archivado</span>` :
       `<button class="btn btn-outline" style="border-color:#bdc3c7; font-size:11px; padding:4px 8px; color:#7f8c8d" onclick="archiveReservation('${res.id}')" title="Marcar operación finalizada y Mover al Historial"><i class="ph ph-archive"></i> Archivar</button>`;

    let outPastAlert = res.needsArchive ? `<span class="badge red" style="margin-top:4px;"><i class="ph ph-warning" style="margin-right:2px"></i> Check-out Pasado (Pendiente Archivar)</span>` : '';

    return `
      <div class="glass-panel" style="padding: 16px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center; ${res.isArchived ? 'opacity:0.7; filter: grayscale(50%)' : ''}">
         <div>
            <div style="display:flex; align-items:center; gap:8px;">
               <h3 style="margin:0; font-size:16px;">${res.guest}</h3>
               <span style="font-size:11px; font-weight:normal" class="badge ${res.resStatus==='Confirmado'?'green':(res.resStatus==='Cancelada'?'red':'gray')}">${res.resStatus || 'Pendiente'}</span>
            </div>
            <p style="margin:4px 0 0; font-size:13px; color:var(--text-muted);">
               <i class="ph ph-calendar-blank"></i> ${res.checkIn} ➔ ${res.checkOut}
               ${currentResPropId === 'all' ? `• 📍 ${prop?.name || '---'}` : ''}
            </p>
            ${outPastAlert}
         </div>
         <div style="display:flex; align-items:center; gap: 16px;">
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; padding-left: 16px; border-left: 1px solid var(--border-light);">
               <span class="badge ${res.payStatus === 'Pagado' ? 'green' : 'orange'}">${res.payStatus === 'Pagado' ? 'Pagado' : 'Pendiente cobro'}</span>
               <a href="#" style="font-size:11px; color:var(--text-muted);" onclick="event.preventDefault(); toggleResStatus('${res.id}')">Switch Pago</a>
            </div>
            <div style="display:flex; gap: 6px; margin-left: 8px;">
               ${actionBtn}
               <button class="btn-icon" onclick="editEntity('res', '${res.id}')"><i class="ph ph-pencil"></i></button>
               <button class="btn-icon danger" onclick="deleteEntity('res', '${res.id}')"><i class="ph ph-trash"></i></button>
            </div>
         </div>
      </div>
    `;
  };

  const htmlRed = groupRed.length > 0 ? `<h2 class="section-header sh-red"><i class="ph ph-fire"></i> Atención Inmediata (Próx 7 días u Ocupado)</h2>${groupRed.map(renderer).join('')}` : '';
  const htmlYellow = groupYellow.length > 0 ? `<h2 class="section-header sh-yellow"><i class="ph ph-calendar-plus"></i> Próximas (Mes en curso)</h2>${groupYellow.map(renderer).join('')}` : '';
  const htmlGreen = groupGreen.length > 0 ? `<h2 class="section-header sh-green"><i class="ph ph-calendar-check"></i> Futuras</h2>${groupGreen.map(renderer).join('')}` : '';
  const htmlPast = groupPast.length > 0 ? `<h2 class="section-header" style="color:var(--text-muted)"><i class="ph ph-clock-counter-clockwise"></i> Histórico (Últ. 15 Días)</h2><div style="opacity:0.6">${groupPast.map(renderer).join('')}</div>` : '';

  const noneMsg = htmlRed==='' && htmlYellow==='' && htmlGreen==='' && htmlPast==='' ? '<div style="padding: 24px; text-align: center; color:var(--text-muted)">No hay reservaciones en esta vista.</div>' : '';

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1 style="margin: 0;">Reservaciones</h1>
      <button class="btn btn-primary" onclick="openResModal()"><i class="ph ph-plus"></i> Añadir Reserva</button>
    </div>
    <div class="tabs-container">${allTab}${propTabs}</div>
    <div>${htmlRed}${htmlYellow}${htmlGreen}${htmlPast}${noneMsg}</div>
  `;
}

window.setAnalyticsPropTab = function(id) {
  currentAnaPropId = id;
  renderView('analytics');
};

function renderAnalytics() {
  const allTab = `<button class="tab ${currentAnaPropId === 'all' ? 'active' : ''}" onclick="setAnalyticsPropTab('all')">Todas (Global)</button>`;
  const propTabs = state.properties.map(p => `<button class="tab ${currentAnaPropId === p.id ? 'active' : ''}" onclick="setAnalyticsPropTab('${p.id}')">${p.name}</button>`).join('');

  let targetRes = currentAnaPropId === 'all' ? state.reservations : state.reservations.filter(r => r.propId === currentAnaPropId);

  let tBruto = 0;
  let tNoches = 0;
  let tComBB = 0;
  let tNeto = 0;
  let scores = [];
  let propsDict = {};

  state.properties.forEach(p => { propsDict[p.id] = { name: p.name, facturado: 0 } });

  targetRes.forEach(r => {
      const p = state.properties.find(x => x.id === r.propId);
      const airP = p ? parseFloat(p.airbnbPct || 15) : 15;
      const bbP = p ? parseFloat(p.bbPct || 20) : 20;

      const dIn = new Date(r.checkIn);
      const dOut = new Date(r.checkOut);
      const noches = isNaN(dOut) || isNaN(dIn) ? 0 : Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));
      const precioNoche = parseFloat(r.price || 0);
      
      const total = noches * precioNoche;
      const comAirbnb = total * (airP / 100);
      const subTotal = total - comAirbnb; 
      const comBB = subTotal * (bbP / 100);
      const netoP = subTotal - comBB;

      tBruto += total;
      tNoches += noches;
      tComBB += comBB;
      tNeto += netoP;

      if(r.score) scores.push(parseInt(r.score));
      if(propsDict[r.propId]) propsDict[r.propId].facturado += total;
  });

  const avgScore = scores.length > 0 ? (scores.reduce((a,b)=>a+b,0) / scores.length).toFixed(1) : 'S/D';
  const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  const ranking = Object.values(propsDict).filter(x => x.facturado > 0).sort((a,b) => b.facturado - a.facturado);
  const maxFact = ranking.length > 0 ? ranking[0].facturado : 0;

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1 style="margin: 0;"><i class="ph ph-chart-bar" style="color:var(--color-primary)"></i> Estadísticas Profesionales</h1>
    </div>
    
    <div class="tabs-container">${allTab}${propTabs}</div>

    <!-- MAIN METRICS -->
    <div class="grid grid-cols-4" style="margin-bottom: 32px;">
      <div class="glass-panel" style="border-left: 4px solid var(--color-primary)">
        <div style="font-size: 28px; font-weight: 700; color: var(--text-main);">${formatter.format(tBruto)}</div>
        <div style="color: var(--text-muted); font-size: 13px; font-weight: 500;"><i class="ph ph-money"></i> Facturación Bruta</div>
      </div>
      <div class="glass-panel" style="border-left: 4px solid #8e44ad">
        <div style="font-size: 28px; font-weight: 700; color: #8e44ad;">${tNoches}</div>
        <div style="color: var(--text-muted); font-size: 13px; font-weight: 500;"><i class="ph ph-moon"></i> Noches Vendidas</div>
      </div>
      <div class="glass-panel" style="border-left: 4px solid #107c41; background: rgba(16, 124, 65, 0.05)">
        <div style="font-size: 28px; font-weight: 700; color: #107c41;">${formatter.format(tComBB)}</div>
        <div style="color: var(--text-muted); font-size: 13px; font-weight: 500; color: #107c41;"><i class="ph ph-wallet"></i> B&B Host (Tu Comisión)</div>
      </div>
      <div class="glass-panel" style="border-left: 4px solid #e67e22">
        <div style="font-size: 28px; font-weight: 700; color: #e67e22;">${formatter.format(tNeto)}</div>
        <div style="color: var(--text-muted); font-size: 13px; font-weight: 500;"><i class="ph ph-users"></i> Neto ${currentAnaPropId === 'all' ? 'Propietarios' : 'Propietario'}</div>
      </div>
    </div>

    <!-- CHARTS HTML5 CANVAS -->
    <div class="grid grid-cols-2" style="margin-bottom: 32px; gap: 24px;">
      <div class="glass-panel" style="padding: 24px;">
         <h2 style="font-size: 16px; margin-bottom: 16px; color: var(--text-main);"><i class="ph ph-trend-up"></i> Histórico de Noches (Últ. 6 Meses)</h2>
         <div style="height: 250px; position: relative;">
            <canvas id="barChart"></canvas>
         </div>
      </div>
      <div class="glass-panel" style="padding: 24px;">
         <h2 style="font-size: 16px; margin-bottom: 16px; color: var(--text-main);"><i class="ph ph-pie-chart"></i> Distribución de Ganancias</h2>
         <div style="height: 250px; position: relative; display: flex; justify-content: center;">
            <canvas id="pieChart"></canvas>
         </div>
      </div>
    </div>

    <!-- RANKING & QUALITY -->
    <div class="grid grid-cols-2" style="gap:24px;">
      ${currentAnaPropId === 'all' ? `
      <div class="glass-panel">
        <h2 style="font-size: 16px; margin-bottom: 20px;"><i class="ph ph-trophy" style="color:#f1c40f"></i> Top Propiedades (Ingresos Brutos)</h2>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${ranking.length === 0 ? '<p style="color:var(--text-muted);font-size:13px">Sin datos facturados históricamente.</p>' : ranking.map(p => {
             const pct = maxFact > 0 ? (p.facturado / maxFact) * 100 : 0;
             return `
             <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:500; margin-bottom:6px;">
                  <span>${p.name}</span>
                  <span>${formatter.format(p.facturado)}</span>
                </div>
                <div style="height: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: ${pct}%; background: var(--color-primary);"></div>
                </div>
             </div>`;
          }).join('')}
        </div>
      </div>` : `
      <div class="glass-panel" style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
         <i class="ph ph-chart-line-up" style="font-size:64px; color:var(--text-muted); opacity:0.3"></i>
         <p style="color:var(--text-muted); font-size:14px; margin-top:16px;">Estás filtrando por una propiedad. Ve a la pestaña Global para consultar el Ranking competitivo de tus depas.</p>
      </div>`}
      
      <div class="glass-panel" style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
        <h2 style="font-size: 16px; margin-bottom: 8px; align-self:flex-start;"><i class="ph ph-star" style="color:#f39c12"></i> Calidad Acumulada (Airbnb)</h2>
        <div style="font-size: 72px; font-weight: 800; color: ${avgScore >= 4.5 ? '#f39c12' : (avgScore === 'S/D' ? 'var(--text-muted)' : '#e74c3c')}; line-height:1;">
          ${avgScore}
        </div>
        <div style="font-size:14px; font-weight:500; color:var(--text-muted); margin-top:8px;">Puntaje Promedio General</div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:16px;">(Se calcula si te anotan el score general cuando cerramos reservas)</div>
      </div>
    </div>
  `;
}

// --- CHART.JS LOGIC INITIALIZATION --- //
let barChartInstance = null;
let pieChartInstance = null;

window.initCharts = function() {
   if (!document.getElementById('barChart') || !document.getElementById('pieChart')) return;

   let targetRes = currentAnaPropId === 'all' ? state.reservations : state.reservations.filter(r => r.propId === currentAnaPropId);
   
   // Pie Data Math
   let sumNeto = 0;
   let sumBB = 0;
   let sumAir = 0;
   
   targetRes.forEach(r => {
      const p = state.properties.find(x => x.id === r.propId);
      const airP = p ? parseFloat(p.airbnbPct || 15) : 15;
      const bbP = p ? parseFloat(p.bbPct || 20) : 20;

      const dIn = new Date(r.checkIn);
      const dOut = new Date(r.checkOut);
      const noches = isNaN(dOut) || isNaN(dIn) ? 0 : Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));
      const pNoche = parseFloat(r.price || 0);

      const total = noches * pNoche;
      const comAir = total * (airP / 100);
      const sub = total - comAir;
      const comBB = sub * (bbP / 100);
      const neto = sub - comBB;

      sumNeto += neto;
      sumBB += comBB;
      sumAir += comAir;
   });

   // Bar Data Math (Last 6 months grouping)
   const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
   let barLabels = [];
   let barData = [];
   
   const d = new Date();
   for (let i = 5; i >= 0; i--) {
       let pastM = new Date(d.getFullYear(), d.getMonth() - i, 1);
       barLabels.push(monthNames[pastM.getMonth()] + ' ' + String(pastM.getFullYear()).slice(2));
       
       let sumNightsMonth = 0;
       targetRes.forEach(r => {
           if(r.checkIn) {
               const rin = new Date(r.checkIn);
               if(rin.getMonth() === pastM.getMonth() && rin.getFullYear() === pastM.getFullYear()) {
                   const r1 = new Date(r.checkIn);
                   const r2 = new Date(r.checkOut);
                   const n = Math.max(1, Math.round((r2 - r1) / 86400000));
                   sumNightsMonth += n;
               }
           }
       });
       barData.push(sumNightsMonth);
   }

   // Render Pie
   const ctxPie = document.getElementById('pieChart').getContext('2d');
   if(pieChartInstance) pieChartInstance.destroy();
   
   if (sumNeto === 0 && sumBB === 0 && sumAir === 0) {
       // Placeholder Empty State
       pieChartInstance = new Chart(ctxPie, {
           type: 'doughnut',
           data: {
               labels: ['Sin Ingresos'],
               datasets: [{ data: [1], backgroundColor: ['#ecf0f1'] }]
           },
           options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
       });
   } else {
       pieChartInstance = new Chart(ctxPie, {
           type: 'doughnut',
           data: {
               labels: ['Neto Propietario', 'Tu Comisión (B&B)', 'Deducción (Airbnb)'],
               datasets: [{
                   data: [sumNeto, sumBB, sumAir],
                   backgroundColor: ['#27ae60', '#8e44ad', '#e67e22'],
                   borderWidth: 0,
                   hoverOffset: 10
               }]
           },
           options: {
               responsive: true,
               maintainAspectRatio: false,
               plugins: {
                   legend: { position: 'bottom', labels: { color: '#2c3e50', padding: 20, font: { family: 'Outfit', size: 12 } } },
                   tooltip: {
                       callbacks: {
                           label: function(ctx) { return ' $' + ctx.raw.toLocaleString('es-AR'); }
                       }
                   }
               }
           }
       });
   }

   // Render Bar
   const ctxBar = document.getElementById('barChart').getContext('2d');
   if(barChartInstance) barChartInstance.destroy();
   
   barChartInstance = new Chart(ctxBar, {
       type: 'bar',
       data: {
           labels: barLabels,
           datasets: [{
               label: 'Noches Vendidas',
               data: barData,
               backgroundColor: 'rgba(46, 204, 113, 0.6)',
               borderColor: '#2ecc71',
               borderWidth: 2,
               borderRadius: 4
           }]
       },
       options: {
           responsive: true,
           maintainAspectRatio: false,
           scales: {
               y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { color: '#2c3e50' } },
               x: { grid: { display: false }, ticks: { color: '#2c3e50' } }
           },
           plugins: {
               legend: { display: false },
               tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.raw + ' Noches'; } } }
           }
       }
   });
};

function renderTrash() {
  if (!state.trash) state.trash = [];
  
  // Ordenar por fecha de eliminación cronológicamente (más recientes arriba)
  state.trash.sort((a,b) => {
      const da = a.trashId ? parseInt(a.trashId.split('_')[1]) : 0;
      const db = b.trashId ? parseInt(b.trashId.split('_')[1]) : 0;
      return db - da; // Descendente
  });
  
  let content = state.trash.length === 0 ? '<div style="padding: 24px; text-align: center; color:var(--text-muted)">La papelera está vacía.</div>' : state.trash.map(item => {
    let title = 'Elemento';
    let icon = 'ph-file';
    if(item.originalType === 'prop') { title = `Propiedad: ${item.name}`; icon = 'ph-house'; }
    if(item.originalType === 'task') { title = `Checklist: ${item.title}`; icon = 'ph-check-square-offset'; }
    if(item.originalType === 'res') { title = `Reserva: ${item.guest}`; icon = 'ph-calendar'; }
    
    const delTs = item.trashId ? parseInt(item.trashId.split('_')[1]) : Date.now();
    const delDate = !isNaN(delTs) ? new Date(delTs).toLocaleString('es-AR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : 'Desconocida';

    return `
      <div class="glass-panel" style="padding: 16px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center; opacity: 0.8">
         <div style="display:flex; align-items:center; gap: 12px;">
            <i class="ph ${icon}" style="font-size:24px; color:var(--text-muted)"></i>
            <div>
               <h3 style="margin:0; font-size:15px; color:var(--text-muted)">${title}</h3>
               <div style="font-size:11px; color:var(--text-muted); opacity: 0.8; margin-top:2px"><i class="ph ph-clock"></i> Borrado: ${delDate}</div>
            </div>
         </div>
         <div style="display:flex; gap:12px;">
            <button class="btn btn-primary" onclick="restoreEntity('${item.trashId}')" style="font-size:12px; padding:6px 12px;"><i class="ph ph-arrow-u-up-left"></i> Restaurar</button>
            <button class="btn-icon danger" onclick="hardDeleteEntity('${item.trashId}')" title="Destruir Permanente"><i class="ph ph-x"></i></button>
         </div>
      </div>
    `;
  }).join('');

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1 style="margin: 0;"><i class="ph ph-trash" style="color:#e74c3c"></i> Papelera de Reciclaje</h1>
      <button class="btn btn-outline danger" style="color:#d32f2f; border-color:#d32f2f" onclick="if(confirm('¿Vaciar toda la papelera para siempre?')){ state.trash = []; saveData(); renderView('trash'); }"><i class="ph ph-trash"></i> Vaciar Papelera</button>
    </div>
    <div>${content}</div>
  `;
}

function filterByQuery(arr, keys) {
  if (!searchQuery) return arr;
  return arr.filter(item => keys.some(k => item[k] && item[k].toString().toLowerCase().includes(searchQuery)));
}

// --- CRUD LOGIC (Edit/Delete) --- //
window.deleteEntity = function(type, id) {
  if(!confirm('¿Enviar este elemento a la Papelera de Reciclaje? (Podrás restaurarlo más tarde)')) return;
  
  let item = null;
  if(!state.trash) state.trash = [];

  if(type === 'prop') { item = state.properties.find(x => x.id === id); state.properties = state.properties.filter(x => x.id !== id); }
  
  if(type === 'task') { 
     item = state.tasks.find(x => x.id === id); 
     state.tasks = state.tasks.filter(x => x.id !== id); 
     // Cascada Reversa: Si borran la tarea operativa, borrar la reserva atada (sincronización bidireccional)
     if (item && item.linkedResId) {
        const linkedRes = state.reservations.find(x => x.id === item.linkedResId);
        if (linkedRes) {
           state.trash.push({ ...linkedRes, originalType: 'res', trashId: 'bin_' + Date.now() + Math.random() });
           state.reservations = state.reservations.filter(x => x.id !== linkedRes.id);
        }
     }
  }

  if(type === 'res') { 
     item = state.reservations.find(x => x.id === id); 
     state.reservations = state.reservations.filter(x => x.id !== id); 
     // Borrado en cascada: Eliminar el Checklist Fantasma atado a esta reserva
     const linkedTasks = state.tasks.filter(t => t.linkedResId === id || (t.id.includes('_integral') && t.title.includes(item.guest)));
     linkedTasks.forEach(lt => {
         state.trash.push({ ...lt, originalType: 'task', trashId: 'bin_' + Date.now() + Math.random() });
     });
     state.tasks = state.tasks.filter(t => !linkedTasks.some(ltk => ltk.id === t.id));
  }
  
  if (item) {
     state.trash.push({ ...item, originalType: type, trashId: 'bin_' + Date.now() });
  }

  saveData();
  renderView(currentView);
};

window.restoreEntity = function(trashId) {
  if(!state.trash) return;
  const rawItem = state.trash.find(x => x.trashId === trashId);
  if (!rawItem) return;
  
  state.trash = state.trash.filter(x => x.trashId !== trashId);

  // Retrocompatibilidad con el formato viejo de la basura (data: { ... }, type: 'res')
  const item = rawItem.data ? rawItem.data : rawItem;
  const oType = rawItem.originalType || (rawItem.type === 'reservation' ? 'res' : rawItem.type);
  
  delete item.trashId;
  delete item.originalType;
  if (item.type) delete item.type;
  
  if (oType === 'prop') { 
     state.properties.push(item);
  } else if (oType === 'task') { 
     state.tasks.push(item);
     // Cascada reversa desde Tarea Operativa
     if (item.linkedResId) {
        const linkedResRaw = state.trash.find(x => (x.originalType === 'res' || x.type === 'reservation') && (x.id === item.linkedResId || (x.data && x.data.id === item.linkedResId)));
        if (linkedResRaw) {
           state.trash = state.trash.filter(x => x.trashId !== linkedResRaw.trashId);
           const rItem = linkedResRaw.data ? linkedResRaw.data : linkedResRaw;
           state.reservations.push(rItem);
        }
     }
  } else if (oType === 'res') { 
     state.reservations.push(item); 
     // Cascada reversa desde Reserva -> Restaurar Tareas Operativas
     const linkedTasksRaw = state.trash.filter(x => (x.originalType === 'task' || x.type === 'task') && ((x.linkedResId === item.id || (x.data && x.data.linkedResId === item.id)) || (x.id && x.id.includes('_integral') && x.title && x.title.includes(item.guest)) || (x.data && x.data.id && x.data.id.includes('_integral') && x.data.title && x.data.title.includes(item.guest))));
     linkedTasksRaw.forEach(ltRaw => {
         state.trash = state.trash.filter(x => x.trashId !== ltRaw.trashId);
         const tItem = ltRaw.data ? ltRaw.data : ltRaw;
         delete tItem.trashId;
         delete tItem.originalType;
         state.tasks.push(tItem);
     });
  }

  saveData();
  renderView(currentView);
};

window.hardDeleteEntity = function(trashId) {
  if (!confirm('Esta acción borrará el elemento permanentemente. Esta acción no se puede deshacer.')) return;
  state.trash = state.trash.filter(x => x.trashId !== trashId);
  saveData();
  renderView(currentView);
};

window.editEntity = function(type, id) {
  editingId = id;
  if(type === 'prop') openPropModal(state.properties.find(x => x.id === id));
  else if (type === 'task') openTaskModal(state.tasks.find(x => x.id === id));
  else if (type === 'res') openResModal(state.reservations.find(x => x.id === id));
};

// --- Modals Logic --- //
window.openPropModal = function(item = null) {
  if(!item) editingId = null;
  const html = `
    <div class="modal-header">
      <h2 style="margin:0; color:var(--color-primary)">${item ? 'Editar Propiedad' : 'Nueva Propiedad'}</h2>
      <button type="button" class="modal-close" onclick="closeModal()"><i class="ph ph-x"></i></button>
    </div>
    <form id="formProp" onsubmit="submitForm(event, 'prop')">
      <div class="form-group"><label class="form-label">Nombre</label><input required name="name" class="form-input" value="${item?.name || ''}"></div>
      <div class="form-group"><label class="form-label">Barrio</label><input required name="neighborhood" class="form-input" value="${item?.neighborhood || ''}"></div>
      <div class="grid grid-cols-2" style="gap:16px">
        <div class="form-group"><label class="form-label">Cliente (Dueño)</label><input name="ownerName" class="form-input" value="${item?.ownerName || ''}"></div>
        <div class="form-group"><label class="form-label">Email Dueño</label><input type="email" name="ownerEmail" class="form-input" value="${item?.ownerEmail || ''}"></div>
      </div>
      <div class="grid grid-cols-3" style="gap:16px">
        <div class="form-group"><label class="form-label">Camas Máx.</label><input type="number" required name="beds" class="form-input" value="${item?.beds || ''}"></div>
        <div class="form-group"><label class="form-label" title="Porcentaje fijado por AirBnb a restar del alojamiento bruto">% Airbnb (Deducción)</label><input type="number" step="0.1" name="airbnbPct" class="form-input" value="${item?.airbnbPct || 15}"></div>
        <div class="form-group"><label class="form-label" title="Tu comisión como agencia PM (calculada sobre el Subtotal Neto tras resta de Airbnb)">% B&B Host (Tu Comisión)</label><input type="number" step="0.1" name="bbPct" class="form-input" value="${item?.bbPct || 20}"></div>
      </div>
      <div class="form-group"><label class="form-label">Estado Operativo</label>
        <select name="status" class="form-select">
           <option value="active" ${item?.status==='active'?'selected':''}>Activa y Pública</option>
           <option value="maintenance" ${item?.status==='maintenance'?'selected':''}>Mantenimiento / Pausa</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Link de Publicación Airbnb</label><input name="url" class="form-input" value="${item?.url || ''}"></div>
      <div class="form-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Guardar Propiedad</button></div>
    </form>
  `;
  renderModal(html);
};

window.openTaskModal = function(item = null) {
  if(!item) editingId = null;
  const propOptions = state.properties.map(p => `<option value="${p.id}" ${item?.propId===p.id?'selected':''}>${p.name}</option>`).join('');
  const checklistStr = item ? item.checklist.map(c => c.text).join(', ') : '';

  const html = `
    <div class="modal-header">
      <h2 style="margin:0; color:var(--color-primary)">${item ? 'Editar Checklist' : 'Nuevo Checklist'}</h2>
      <button type="button" class="modal-close" onclick="closeModal()"><i class="ph ph-x"></i></button>
    </div>
    <form id="formTask" onsubmit="submitForm(event, 'task')">
      <div class="form-group"><label class="form-label">Título</label><input required name="title" class="form-input" value="${item?.title || ''}"></div>
      <div class="grid grid-cols-2" style="gap: 16px;">
        <div class="form-group"><label class="form-label">Responsable</label><input required name="assignee" class="form-input" value="${item?.assignee || ''}"></div>
        <div class="form-group"><label class="form-label">Fecha Límite</label><input type="date" required name="dueDate" class="form-input" value="${item?.dueDate || ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">Propiedad Vinculada</label>
        <select name="propId" class="form-select"><option value="">-- General --</option>${propOptions}</select>
      </div>
      <div class="form-group"><label class="form-label">Subtareas (Separar por comas)</label>
        <textarea name="checklistStr" class="form-textarea" required>${checklistStr}</textarea>
      </div>
      <div class="form-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>
  `;
  renderModal(html);
};

window.openResModal = function(item = null) {
  if(!item) editingId = null;
  const propOptions = state.properties.map(p => `<option value="${p.id}" ${item?.propId===p.id || (!item && currentResPropId === p.id) ? 'selected':''}>${p.name}</option>`).join('');
  const html = `
    <div class="modal-header">
      <h2 style="margin:0; color:var(--color-primary)">${item ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
      <button type="button" class="modal-close" onclick="closeModal()"><i class="ph ph-x"></i></button>
    </div>
    <form id="formRes" onsubmit="submitForm(event, 'res')" style="max-height: 70vh; overflow-y:auto; padding-right:8px;">
      <h3 style="font-size:14px; color:var(--color-primary); margin-bottom:12px; border-bottom:1px solid #ddd; padding-bottom:4px;">1. Datos Personales</h3>
      <div class="grid grid-cols-3" style="gap: 16px;">
        <div class="form-group"><label class="form-label">Huésped</label><input required name="guest" class="form-input" value="${item?.guest || ''}"></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" class="form-input" value="${item?.email || ''}"></div>
        <div class="form-group"><label class="form-label">Teléfono</label><input name="phone" class="form-input" value="${item?.phone || ''}"></div>
      </div>
      
      <h3 style="font-size:14px; color:var(--color-primary); margin-top:20px; margin-bottom:12px; border-bottom:1px solid #ddd; padding-bottom:4px;">2. Estadía y Finanzas</h3>
      <div class="grid grid-cols-2" style="gap: 16px;">
        <div class="form-group" style="grid-column: span 2"><label class="form-label">Propiedad</label>
          <select name="propId" class="form-select" required><option value="">Seleccionar...</option>${propOptions}</select>
        </div>
        <div class="form-group"><label class="form-label">Estado de la Reserva</label>
          <select name="resStatus" class="form-select">
             <option value="Confirmado" ${item?.resStatus==='Confirmado'?'selected':''}>Confirmado</option>
             <option value="Pendiente" ${item?.resStatus==='Pendiente'||!item?.resStatus?'selected':''}>Pendiente</option>
             <option value="Cancelada" ${item?.resStatus==='Cancelada'?'selected':''}>Cancelada</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Estado del Pago</label>
          <select name="payStatus" class="form-select">
             <option value="Pagado" ${item?.payStatus==='Pagado'?'selected':''}>Pagado</option>
             <option value="No pagado" ${item?.payStatus==='No pagado'||!item?.payStatus?'selected':''}>No pagado</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Fecha de Carga/Reserva</label><input type="date" required name="resDate" class="form-input" value="${item?.resDate || new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Precio por Noche (Bruto)</label><input type="number" step="0.01" required name="price" class="form-input" value="${item?.price || ''}" placeholder="Ej. 65.50"></div>
        <div class="form-group"><label class="form-label">Check-in</label><input type="date" required name="checkIn" class="form-input" value="${item?.checkIn || ''}"></div>
        <div class="form-group"><label class="form-label">Check-out</label><input type="date" required name="checkOut" class="form-input" value="${item?.checkOut || ''}"></div>
      </div>

      <h3 style="font-size:14px; color:var(--color-primary); margin-top:20px; margin-bottom:12px; border-bottom:1px solid #ddd; padding-bottom:4px;">3. Cierre Cualitativo y Notas (Solo para Histórico)</h3>
      <div class="grid grid-cols-2" style="gap: 16px;">
        <div class="form-group"><label class="form-label">Puntaje Recibido (1-5)</label><input type="number" min="1" max="5" name="score" class="form-input" value="${item?.score || ''}"></div>
        <div class="form-group"><label class="form-label">Problemas (Operacionales)</label><input class="form-input" name="problems" value="${item?.problems || ''}" placeholder="Ej. Se rompió calefacción"></div>
      </div>
      <div class="form-group"><label class="form-label">Notas Generales / Comentarios Review</label><textarea name="notes" class="form-textarea" rows="2">${item?.notes || ''}</textarea></div>

      ${!item ? `
      <div class="form-group" style="padding: 12px; background: rgba(46, 204, 113, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(46, 204, 113, 0.2); margin-top:16px;">
        <label style="cursor:pointer; display:flex; align-items:flex-start; gap:8px; font-size:13px; color: var(--color-primary); font-weight: 500;">
           <input type="checkbox" name="autoGen" checked style="accent-color: var(--color-primary); width:16px; height:16px; margin-top:2px;"> 
           <span>Generar Tarea de Check-in / Check-out para este huésped automáticamente.</span>
        </label>
      </div>` : ''}
      <div class="form-actions" style="margin-top:24px"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Fijar Reserva en Sistema</button></div>
    </form>
  `;
  renderModal(html);
}

function renderModal(html) {
  modalContent.innerHTML = html;
  modalRoot.classList.add('active');
}

window.closeModal = function() {
  modalRoot.classList.remove('active');
  setTimeout(() => { modalContent.innerHTML = ''; editingId = null; }, 200); 
}

window.submitForm = function(e, type) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  if (type === 'res') {
      const p1 = data.checkIn.split('-');
      const p2 = data.checkOut.split('-');
      const dIn = new Date(parseInt(p1[0]), parseInt(p1[1])-1, parseInt(p1[2]));
      const dOut = new Date(parseInt(p2[0]), parseInt(p2[1])-1, parseInt(p2[2]));
      if (dOut <= dIn) { alert('Error: La fecha de Check-out debe ser posterior obligatoriamente al Check-in.'); return; }
      if (dIn.getFullYear() < 2020) { alert('Error: Año histórico inválido. El sistema requiere fechas pos-2020.'); return; }
  }
  if (type === 'task') {
      if (data.dueDate && parseInt(data.dueDate.split('-')[0]) < 2020) { alert('Error: Fecha de límite irrelevante. Revise el año.'); return; }
  }
  
  if (type === 'prop') {
    const obj = { id: editingId || ('p_' + Date.now()), ...data };
    if(editingId) state.properties = state.properties.map(x => x.id === editingId ? obj : x);
    else state.properties.push(obj);

  } else if (type === 'task') {
    const oldTask = editingId ? state.tasks.find(t => t.id === editingId) : null;
    const oldChecklist = oldTask ? oldTask.checklist : [];
    const listItems = data.checklistStr.split(',').map(s => s.trim()).filter(Boolean);
    const newChecklist = listItems.map(txt => {
       const existing = oldChecklist.find(c => c.text === txt);
       return existing ? existing : { text: txt, done: false };
    });

    const obj = { id: editingId || ('t_' + Date.now()), ...data, status: editingId ? oldTask.status : 'pending', checklist: newChecklist };
    if(editingId) state.tasks = state.tasks.map(x => x.id === editingId ? obj : x);
    else state.tasks.push(obj);

  } else if (type === 'res') {
    const obj = { id: editingId || ('r_' + Date.now()), ...data };
    if(editingId) {
      state.reservations = state.reservations.map(x => x.id === editingId ? obj : x);
    } else {
      state.reservations.push(obj);
      // Manejar Autogeneración de Tareas de ATC con "Timelines" Matemáticos
      if(data.autoGen === 'on') {
         // Fix Husos Horarios sumando 12h para que un dd/mm caiga siempre localmente correcto
         const rin = new Date(data.checkIn + 'T12:00:00'); 
         const rout = new Date(data.checkOut + 'T12:00:00');
         const nNights = Math.max(1, Math.round((rout - rin) / 86400000));
         
         const fd = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
         
         const rNext = new Date(rin); rNext.setDate(rNext.getDate() + 1);
         const rPrev = new Date(rout); rPrev.setDate(rPrev.getDate() - 1);

         const strIn = fd(rin);
         const strOut = fd(rout);
         const strNext = fd(rNext);
         const strPrev = fd(rPrev);

         const integralTask = {
           id: 't_' + Date.now() + '_integral',
           linkedResId: obj.id, // Vínculo duro con la base de datos de reservas
           title: `Check-in / Check-out: ${data.guest} (${nNights} Noches | ${strIn} al ${strOut})`,
           assignee: 'Atención al Cliente',
           dueDate: data.checkOut,
           propId: data.propId,
           status: 'pending',
           checklist: [
             {text: `1. [${strIn}] Enviar PDF de Bienvenida e Instrucciones de Acceso`, done: false},
             {text: `2. [${strIn}] Confirmar recepción y horario con el huésped`, done: false},
             {text: `3. [${strIn}] Verificar liquidación de saldos o depósitos extras`, done: false},
             {text: `4. [${strNext}] Mensaje seguimiento 24hs ("¿Todo perfecto?")`, done: false},
             {text: `5. [${strPrev}] Coordinar pre-aviso para el Check-out`, done: false},
             {text: `6. [${strOut}] Avisar desocupación al personal de limpieza`, done: false},
             {text: `7. [${strOut}] Solicitar y dejar Evaluación de 5 estrellas`, done: false}
           ]
         };
         state.tasks.push(integralTask);
      }
    }
  }
  
  saveData();
  closeModal();
  renderView(currentView);
};

window.exportToCSV = function(propIdFilter) {
   let reservesOriginal = state.reservations;
   let reserves = reservesOriginal; // Quitamos el filtro estricto de fechas para incluir TODAS las operaciones historicas/futuras

   if(reserves.length === 0) { alert('No hay reservas en la base de datos para generar reporte.'); return; }

   const sanitize = (str) => '"' + (str||'').toString().replace(/"/g, '""').replace(/\n/g, ' ') + '"';
   let csvContent = "sep=;\n"; // Forzar a Excel en Mac y Windows a reconocer el punto y coma
   
   if (propIdFilter === 'all') {
      // REPORTE GLOBAL (AGRUPADO POR PROPIEDAD)
      csvContent += "Propiedad;Cliente (Dueño);Email;Ingresos Totales;Ingreso Neto (después de comisión);Comisión B&B Host;% ocupación;Noches alquiladas;Noches disponibles;Cantidad de reservas;Precio promedio por noche;Precio maximo;Precio minimo;Huespedes totales;Estadía promedio;Comentarios relavantes (huespedes);Puntaje promedio;Recomendaciones (B&B Host)\n";
      
      state.properties.forEach(prop => {
         const propRes = reserves.filter(r => r.propId === prop.id);
         if(propRes.length === 0) return; // Skip props without activity

         const airP = parseFloat(prop.airbnbPct || 15);
         const bbP = parseFloat(prop.bbPct || 20);

         let sumIngresos = 0;
         let sumNeto = 0;
         let sumComBB = 0;
         let sumNoches = 0;
         let prices = [];
         let scores = [];
         let comments = [];

         propRes.forEach(r => {
            const dIn = new Date(r.checkIn);
            const dOut = new Date(r.checkOut);
            const noches = isNaN(dOut) || isNaN(dIn) ? 0 : Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));
            const pNoche = parseFloat(r.price || 0);
            
            const total = noches * pNoche;
            const comAirbnb = total * (airP / 100);
            const subTotal = total - comAirbnb; 
            const comBB = subTotal * (bbP / 100);
            const netoPropietario = subTotal - comBB;

            sumIngresos += total;
            sumComBB += comBB;
            sumNeto += netoPropietario;
            sumNoches += noches;
            
            if (pNoche > 0) prices.push(pNoche);
            if (r.score) scores.push(parseInt(r.score));
            if (r.notes) comments.push(r.notes);
         });

         const qtyRes = propRes.length;
         const pctOcu = Math.min((sumNoches / 30) * 100, 100).toFixed(1);
         const avgPrice = prices.length > 0 ? prices.reduce((a,b)=>a+b,0) / prices.length : 0;
         const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
         const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
         const avgStay = (sumNoches / qtyRes).toFixed(1);
         const avgScore = scores.length > 0 ? (scores.reduce((a,b)=>a+b,0) / scores.length).toFixed(1) : 'S/D';
         const jointComments = comments.join(' | ');

         const row = [
            sanitize(prop.name),
            sanitize(prop.ownerName || ''), // Cliente
            sanitize(prop.ownerEmail || ''), // Email cliente
            sumIngresos.toFixed(2),
            sumNeto.toFixed(2),
            sumComBB.toFixed(2),
            pctOcu + "%", // % ocupación
            sumNoches,
            30, // Noches Disponibles estático a 30 por mes como fue solicitado
            qtyRes,
            avgPrice.toFixed(2),
            maxPrice.toFixed(2),
            minPrice.toFixed(2),
            qtyRes, // Huespedes totales (1 por reserva formal principal)
            avgStay,
            sanitize(jointComments),
            avgScore,
            '""' // Recomendaciones B&B
         ];
         csvContent += row.join(";") + "\n";
      });

   } else {
      // REPORTE INDIVIDUAL DETALLADO
      const propRes = reserves.filter(r => r.propId === propIdFilter);
      if(propRes.length === 0) { alert('No hay reservas para esta propiedad.'); return; }
      
      csvContent += "Nombre Huésped;Email;Teléfono;Check-in;Check-out;Noches;Precio por noche;Fecha de reserva;Pagado;Estado;Ingreso total $;Comisión % Air BnB;Comisión B&B %;Comisión B&B $;Ingreso Neto $;Review (Huésped);Puntaje;Comentarios (Huésped);Problemas (Huésped - B&B Host);Notas (B&B Host)\n";

      propRes.forEach(r => {
         const p = state.properties.find(x => x.id === r.propId);
         const airP = p ? parseFloat(p.airbnbPct || 15) : 15;
         const bbP = p ? parseFloat(p.bbPct || 20) : 20;

         const dIn = new Date(r.checkIn);
         const dOut = new Date(r.checkOut);
         const noches = isNaN(dOut) || isNaN(dIn) ? 0 : Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));
         const pNoche = parseFloat(r.price || 0);
         
         const total = noches * pNoche;
         const comAirbnb = total * (airP / 100);
         const subTotal = total - comAirbnb; 
         const comBB = subTotal * (bbP / 100);
         const netoPropietario = subTotal - comBB;

         const row = [
            sanitize(r.guest),
            sanitize(r.email),
            sanitize(r.phone),
            r.checkIn,
            r.checkOut,
            noches,
            pNoche.toFixed(2),
            r.resDate || r.checkIn,
            r.payStatus || 'No pagado', // Pagado / No pagado
            r.resStatus || 'Pendiente', // Confirmado, Pendiente, Cancelada
            total.toFixed(2),
            airP + '%',
            bbP + '%',
            comBB.toFixed(2),
            netoPropietario.toFixed(2),
            r.score ? 'Sí' : 'No', // Review Huesped existence
            r.score || '',
            sanitize(r.notes), 
            sanitize(r.problems),
            sanitize(r.notes)
         ];
         csvContent += row.join(";") + "\n";
      });
   }

   const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);
   const link = document.createElement("a");
   link.setAttribute("href", url);
   const dateStr = new Date().toISOString().split('T')[0];
   const scope = propIdFilter === 'all' ? 'Reporte_Global_Gerencial' : `Reporte_Propiedad_${propIdFilter}`;
   link.setAttribute("download", `${scope}_BBHost_${dateStr}.csv`);
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
};

document.addEventListener('DOMContentLoaded', init);
