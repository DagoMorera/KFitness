var adminUsersState = {
  pagina: 1,
  tamanoPagina: 10,
  totalPaginas: 1,
  query: '',
  roles: [],
  identificacionDisponible: false,
  detalleActual: null,
  rolOriginalId: null
};

function escapeHtml(value) {
  var text = String(value == null ? '' : value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mostrarSeccionAdmin(clave) {
  var secciones = document.querySelectorAll('.admin-seccion');
  var idObjetivo = clave === 'dashboard' ? 'admin-dashboard' : 'admin-' + clave;

  secciones.forEach(function (seccion) {
    seccion.hidden = seccion.id !== idObjetivo;
  });

  var botones = document.querySelectorAll('.admin-sidebar button[data-admin-seccion]');
  botones.forEach(function (boton) {
    if (boton.getAttribute('data-admin-seccion') === clave) {
      boton.classList.add('activo');
    } else {
      boton.classList.remove('activo');
    }
  });

  if (clave === 'usuarios') {
    cargarUsuarios();
  } else {
    cerrarModalUsuario();
  }
}

function initAdminNav() {
  var botones = document.querySelectorAll('.admin-sidebar button[data-admin-seccion]');
  botones.forEach(function (boton) {
    boton.addEventListener('click', function () {
      var clave = boton.getAttribute('data-admin-seccion');
      if (!clave) return;
      mostrarSeccionAdmin(clave);
    });
  });
}

function setKpiValue(elementId, value) {
  var el = document.getElementById(elementId);
  if (!el) return;
  if (typeof value === 'number') {
    el.textContent = String(value);
  } else {
    el.textContent = 'Pendiente';
  }
}

function renderPendientes(disponibilidad) {
  var lista = document.getElementById('kpi-pendientes');
  if (!lista) return;

  var pendientes = [];
  if (!disponibilidad.reservas) pendientes.push('Reservas pendientes: no existe tabla de reservas del módulo gimnasio.');
  if (!disponibilidad.consultas) pendientes.push('Consultas pendientes: no existe tabla de consultas administrativas.');
  if (!disponibilidad.rutinas) pendientes.push('Rutinas activas: no existe tabla de rutinas.');

  pendientes.push('HU-AUT-004: la HU menciona solo Administrador y Cliente, pero la BD actual incluye también Operador.');
  pendientes.push('HU-ADM-002: la HU pide búsqueda por identificación, pero la estructura disponible no la expone en seg.Usuarios.');

  lista.innerHTML = pendientes.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');
}

function cargarDashboard() {
  return fetch('/api/admin/dashboard.ashx', { method: 'GET', credentials: 'same-origin' })
    .then(function (resp) {
      if (resp.status === 401) {
        window.location.href = '/Pages/login.html';
        return null;
      }
      if (resp.status === 403) {
        window.location.href = '/Pages/index.html';
        return null;
      }
      if (!resp.ok) return null;
      return resp.json();
    })
    .then(function (data) {
      if (!data || !data.success) return;

      var nombre = document.getElementById('admin-nombre');
      if (nombre) nombre.textContent = data.nombre || 'Administrador';

      var kpis = data.kpis || {};
      var disponibilidad = data.disponibilidad || {};

      setKpiValue('kpi-clientes', kpis.clientesRegistrados);
      setKpiValue('kpi-reservas', kpis.reservasPendientes);
      setKpiValue('kpi-consultas', kpis.consultasPendientes);
      setKpiValue('kpi-rutinas', kpis.rutinasActivas);

      renderPendientes(disponibilidad);
    });
}

function validarAccesoAdmin() {
  return fetch('/api/admin/session.ashx', { method: 'GET', credentials: 'same-origin' })
    .then(function (resp) {
      if (resp.status === 401) {
        window.location.href = '/Pages/login.html';
        return null;
      }
      if (resp.status === 403) {
        window.location.href = '/Pages/index.html';
        return null;
      }
      if (!resp.ok) return null;
      return resp.json();
    })
    .then(function (data) {
      if (!data || !data.success) return false;
      var nombre = document.getElementById('admin-nombre');
      if (nombre) nombre.textContent = data.nombre || 'Administrador';
      return true;
    })
    .catch(function () {
      window.location.href = '/Pages/index.html';
      return false;
    });
}

function initAdminLogout() {
  var cerrar = document.getElementById('cerrar-sesion-admin');
  if (!cerrar) return;
  cerrar.addEventListener('click', function () {
    if (window.kfLogout) {
      window.kfLogout();
    } else {
      window.location.href = '/Pages/index.html';
    }
  });
}

function renderResumenUsuarios(resumen) {
  if (!resumen) return;
  var total = document.getElementById('usuarios-total');
  var clientes = document.getElementById('usuarios-clientes');
  var admins = document.getElementById('usuarios-admins');
  var activos = document.getElementById('usuarios-activos');
  if (total) total.textContent = String(resumen.usuariosTotales || 0);
  if (clientes) clientes.textContent = String(resumen.clientes || 0);
  if (admins) admins.textContent = String(resumen.administradores || 0);
  if (activos) activos.textContent = String(resumen.usuariosActivos || 0);
}

function badgeRol(rol) {
  var nombreRol = String(rol || '');
  var rolLower = nombreRol.toLowerCase();
  var clase = 'badge-rol-neutral';

  if (rolLower === 'administrador') {
    clase = 'badge-rol-admin';
  } else if (rolLower === 'cliente') {
    clase = 'badge-rol-cliente';
  }

  return '<span class="badge badge-rol ' + clase + '">' + escapeHtml(nombreRol) + '</span>';
}

function badgeEstado(activo) {
  return activo
    ? '<span class="badge badge-activo">Activo</span>'
    : '<span class="badge badge-inactivo">Inactivo</span>';
}

function normalizarUsuarioListado(u) {
  if (!u) return null;
  var idUsuario = u.idUsuario != null ? u.idUsuario : u.IdUsuario;
  return {
    idUsuario: idUsuario,
    nombreCompleto: u.nombreCompleto != null ? u.nombreCompleto : u.NombreCompleto,
    correo: u.correo != null ? u.correo : u.Correo,
    rol: u.rol != null ? u.rol : u.Rol,
    activo: u.activo != null ? !!u.activo : !!u.Activo
  };
}

function normalizarDetalleUsuario(u) {
  if (!u) return null;
  return {
    idUsuario: u.idUsuario != null ? u.idUsuario : u.IdUsuario,
    nombreCompleto: u.nombreCompleto != null ? u.nombreCompleto : u.NombreCompleto,
    correo: u.correo != null ? u.correo : u.Correo,
    rol: u.rol != null ? u.rol : u.Rol,
    idRol: u.idRol != null ? u.idRol : u.IdRol,
    activo: u.activo != null ? !!u.activo : !!u.Activo,
    telefono: u.telefono != null ? u.telefono : u.Telefono,
    esPropiaCuentaAdmin: u.esPropiaCuentaAdmin != null ? !!u.esPropiaCuentaAdmin : !!u.EsPropiaCuentaAdmin
  };
}

function renderTablaUsuarios(items) {
  var tbody = document.getElementById('admin-usuarios-tbody');
  if (!tbody) return;

  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="5">No encontramos usuarios que coincidan con tu búsqueda.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(function (raw) {
    var u = normalizarUsuarioListado(raw) || {};
    var id = u.idUsuario != null ? String(u.idUsuario) : '';
    return [
      '<tr>',
      '<td>' + escapeHtml(u.nombreCompleto || '') + '</td>',
      '<td>' + escapeHtml(u.correo || '') + '</td>',
      '<td>' + badgeRol(u.rol || '') + '</td>',
      '<td>' + badgeEstado(!!u.activo) + '</td>',
      '<td><button class="boton boton-pequeno admin-ver-usuario" data-id="' + escapeHtml(id) + '">Ver</button></td>',
      '</tr>'
    ].join('');
  }).join('');
}

function actualizarPaginacion(paginacion) {
  adminUsersState.pagina = paginacion && paginacion.pagina ? paginacion.pagina : 1;
  adminUsersState.totalPaginas = paginacion && paginacion.totalPaginas ? paginacion.totalPaginas : 1;

  var info = document.getElementById('admin-usuarios-pageinfo');
  if (info) info.textContent = 'Página ' + adminUsersState.pagina + ' de ' + adminUsersState.totalPaginas;

  var prev = document.getElementById('admin-usuarios-prev');
  var next = document.getElementById('admin-usuarios-next');
  if (prev) prev.disabled = adminUsersState.pagina <= 1;
  if (next) next.disabled = adminUsersState.pagina >= adminUsersState.totalPaginas;
}

function setEstadoUsuarios(mensaje, visible) {
  var estado = document.getElementById('admin-usuarios-estado');
  if (!estado) return;
  estado.textContent = mensaje || '';
  estado.hidden = !visible;
}

function cargarUsuarios() {
  var q = encodeURIComponent(adminUsersState.query || '');
  var url = '/api/admin/users.ashx?page=' + adminUsersState.pagina + '&pageSize=' + adminUsersState.tamanoPagina + '&q=' + q;

  return fetch(url, { method: 'GET', credentials: 'same-origin' })
    .then(function (resp) {
      if (resp.status === 401) {
        window.location.href = '/Pages/login.html';
        return null;
      }
      if (resp.status === 403) {
        window.location.href = '/Pages/index.html';
        return null;
      }
      if (!resp.ok) throw new Error('http');
      return resp.json();
    })
    .then(function (data) {
      if (!data || !data.success) return;

      adminUsersState.roles = data.roles || [];
      adminUsersState.identificacionDisponible = !!data.identificacionDisponible;

      var input = document.getElementById('admin-usuarios-query');
      if (input) {
        input.placeholder = adminUsersState.identificacionDisponible
          ? 'Buscar por nombre, correo o identificación...'
          : 'Buscar por nombre o correo...';
      }

      renderResumenUsuarios(data.resumen || {});
      renderTablaUsuarios(data.usuarios || []);
      actualizarPaginacion(data.paginacion || {});
      setEstadoUsuarios('', false);
    })
    .catch(function () {
      setEstadoUsuarios('No fue posible cargar los usuarios. Intenta nuevamente.', true);
    });
}

function abrirModalUsuario() {
  var modal = document.getElementById('admin-usuario-modal');
  if (!modal) return;
  modal.hidden = false;
}

function cerrarModalUsuario() {
  var modal = document.getElementById('admin-usuario-modal');
  if (!modal) return;
  modal.hidden = true;
  adminUsersState.detalleActual = null;
  adminUsersState.rolOriginalId = null;

  var msg = document.getElementById('admin-usuario-mensaje');
  if (msg) msg.textContent = '';

  var confirm = document.getElementById('admin-confirm-box');
  if (confirm) confirm.hidden = true;

  var nombre = document.getElementById('detalle-nombre');
  var correo = document.getElementById('detalle-correo');
  var rol = document.getElementById('detalle-rol');
  var estado = document.getElementById('detalle-estado');
  var telWrap = document.getElementById('detalle-telefono-wrap');
  var tel = document.getElementById('detalle-telefono');
  if (nombre) nombre.textContent = '-';
  if (correo) correo.textContent = '-';
  if (rol) rol.textContent = '-';
  if (estado) estado.textContent = '-';
  if (telWrap) telWrap.hidden = true;
  if (tel) tel.textContent = '-';

  var selfProtect = document.getElementById('admin-self-protect');
  if (selfProtect) selfProtect.hidden = true;

  var select = document.getElementById('admin-rol-select');
  if (select) {
    select.innerHTML = '';
    select.disabled = false;
  }

  var btnGuardar = document.getElementById('admin-rol-guardar');
  if (btnGuardar) btnGuardar.disabled = false;
}

function llenarRoles(idSeleccionado) {
  var select = document.getElementById('admin-rol-select');
  if (!select) return;
  select.innerHTML = '';

  (adminUsersState.roles || []).forEach(function (rol) {
    var opt = document.createElement('option');
    opt.value = String(rol.IdRol || rol.idRol);
    opt.textContent = rol.Nombre || rol.nombre;
    if (String(idSeleccionado) === opt.value) opt.selected = true;
    select.appendChild(opt);
  });
}

function mostrarDetalleUsuario(det) {
  var nombre = document.getElementById('detalle-nombre');
  var correo = document.getElementById('detalle-correo');
  var rol = document.getElementById('detalle-rol');
  var estado = document.getElementById('detalle-estado');
  var telWrap = document.getElementById('detalle-telefono-wrap');
  var tel = document.getElementById('detalle-telefono');

  if (nombre) nombre.textContent = det.nombreCompleto || '-';
  if (correo) correo.textContent = det.correo || '-';
  if (rol) rol.textContent = det.rol || '-';
  if (estado) estado.innerHTML = badgeEstado(!!det.activo);

  if (telWrap && tel) {
    if (det.telefono) {
      telWrap.hidden = false;
      tel.textContent = det.telefono;
    } else {
      telWrap.hidden = true;
      tel.textContent = '-';
    }
  }

  adminUsersState.rolOriginalId = det.idRol;
  llenarRoles(det.idRol);

  var selfProtect = document.getElementById('admin-self-protect');
  var select = document.getElementById('admin-rol-select');
  var btnGuardar = document.getElementById('admin-rol-guardar');

  var esPropia = !!det.esPropiaCuentaAdmin;
  if (selfProtect) {
    selfProtect.hidden = !esPropia;
    selfProtect.textContent = 'Tu cuenta administrativa. Por seguridad, no puedes retirar tus propios permisos de Administrador.';
  }
  if (select) select.disabled = esPropia;
  if (btnGuardar) btnGuardar.disabled = esPropia;
}

function cargarDetalleUsuario(idUsuario) {
  return fetch('/api/admin/user-detail.ashx?idUsuario=' + encodeURIComponent(String(idUsuario)), { method: 'GET', credentials: 'same-origin' })
    .then(function (resp) {
      if (resp.status === 401) {
        window.location.href = '/Pages/login.html';
        return null;
      }
      if (resp.status === 403) {
        window.location.href = '/Pages/index.html';
        return null;
      }
      if (!resp.ok) throw new Error('http');
      return resp.json();
    })
    .then(function (data) {
      if (!data || !data.success || !data.usuario) return;
      var detalle = normalizarDetalleUsuario(data.usuario);
      if (!detalle || !detalle.idUsuario) return;
      adminUsersState.detalleActual = detalle;
      mostrarDetalleUsuario(detalle);
      abrirModalUsuario();
    })
    .catch(function () {
      setEstadoUsuarios('No fue posible cargar el detalle del usuario.', true);
    });
}

function prepararConfirmacionCambio() {
  var det = adminUsersState.detalleActual;
  var select = document.getElementById('admin-rol-select');
  var msg = document.getElementById('admin-usuario-mensaje');
  if (!det || !select) return;


  var idNuevo = parseInt(select.value, 10);
  if (!idNuevo || idNuevo === adminUsersState.rolOriginalId) {
    if (msg) {
      msg.textContent = 'No hay cambios para guardar.';
      msg.style.color = '#b8b8be';
    }
    return;
  }

  var nombreRolNuevo = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : '';
  var confirmBox = document.getElementById('admin-confirm-box');
  var confirmTexto = document.getElementById('admin-confirm-texto');

  if (confirmTexto) {
    confirmTexto.textContent = '¿Deseas cambiar el rol de ' + (det.nombreCompleto || 'este usuario') + ' de ' + (det.rol || '') + ' a ' + nombreRolNuevo + '?';
  }
  if (confirmBox) confirmBox.hidden = false;
}

function ejecutarCambioRol() {
  var det = adminUsersState.detalleActual;
  var select = document.getElementById('admin-rol-select');
  var msg = document.getElementById('admin-usuario-mensaje');
  if (!det || !select || !det.idUsuario) {
    if (msg) {
      msg.textContent = 'Selecciona un usuario válido antes de guardar cambios.';
      msg.style.color = '#ff6b6b';
    }
    return;
  }

  var idRol = parseInt(select.value, 10);
  if (!idRol) {
    if (msg) {
      msg.textContent = 'Selecciona un rol válido.';
      msg.style.color = '#ff6b6b';
    }
    return;
  }

  var payload = {
    idUsuario: det.idUsuario,
    idRol: idRol
  };

  fetch('/api/admin/user-role.ashx', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(function (resp) {
      return resp.json().then(function (body) {
        body.__status = resp.status;
        return body;
      });
    })
    .then(function (data) {
      if (!data) return;
      if (data.__status >= 400 || data.success === false) {
        if (msg) {
          msg.textContent = data.message || 'No fue posible actualizar el rol.';
          msg.style.color = '#ff6b6b';
        }
        return;
      }

      if (msg) {
        msg.textContent = data.message || 'Rol actualizado correctamente.';
        msg.style.color = '#ED1C2E';
      }

      var confirmBox = document.getElementById('admin-confirm-box');
      if (confirmBox) confirmBox.hidden = true;

      cargarUsuarios().then(function () {
        cerrarModalUsuario();
      });
    })
    .catch(function () {
      if (msg) {
        msg.textContent = 'No fue posible actualizar el rol.';
        msg.style.color = '#ff6b6b';
      }
    });
}

function initControlUsuarios() {
  var form = document.getElementById('admin-usuarios-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('admin-usuarios-query');
      adminUsersState.query = input ? (input.value || '').trim() : '';
      adminUsersState.pagina = 1;
      cargarUsuarios();
    });
  }

  var prev = document.getElementById('admin-usuarios-prev');
  var next = document.getElementById('admin-usuarios-next');
  if (prev) {
    prev.addEventListener('click', function () {
      if (adminUsersState.pagina <= 1) return;
      adminUsersState.pagina -= 1;
      cargarUsuarios();
    });
  }
  if (next) {
    next.addEventListener('click', function () {
      if (adminUsersState.pagina >= adminUsersState.totalPaginas) return;
      adminUsersState.pagina += 1;
      cargarUsuarios();
    });
  }

  var tbody = document.getElementById('admin-usuarios-tbody');
  if (tbody) {
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('.admin-ver-usuario');
      if (!btn) return;
      var id = parseInt(btn.getAttribute('data-id'), 10);
      if (!id) return;
      cargarDetalleUsuario(id);
    });
  }

  var btnCerrar = document.getElementById('admin-modal-cerrar');
  if (btnCerrar) btnCerrar.addEventListener('click', cerrarModalUsuario);

  var btnCancelar = document.getElementById('admin-rol-cancelar');
  if (btnCancelar) {
    btnCancelar.addEventListener('click', function () {
      var select = document.getElementById('admin-rol-select');
      if (select && adminUsersState.rolOriginalId != null) {
        select.value = String(adminUsersState.rolOriginalId);
      }
      var confirmBox = document.getElementById('admin-confirm-box');
      if (confirmBox) confirmBox.hidden = true;
      cerrarModalUsuario();
    });
  }

  var btnGuardar = document.getElementById('admin-rol-guardar');
  if (btnGuardar) btnGuardar.addEventListener('click', prepararConfirmacionCambio);

  var btnConfirmar = document.getElementById('admin-confirm-aceptar');
  if (btnConfirmar) btnConfirmar.addEventListener('click', ejecutarCambioRol);

  var btnConfirmCancelar = document.getElementById('admin-confirm-cancelar');
  if (btnConfirmCancelar) {
    btnConfirmCancelar.addEventListener('click', function () {
      var confirmBox = document.getElementById('admin-confirm-box');
      if (confirmBox) confirmBox.hidden = true;
      var select = document.getElementById('admin-rol-select');
      if (select && adminUsersState.rolOriginalId != null) {
        select.value = String(adminUsersState.rolOriginalId);
      }
    });
  }

  cerrarModalUsuario();
}

function initAdmin() {
  mostrarSeccionAdmin('dashboard');
  initAdminNav();
  initAdminLogout();
  initControlUsuarios();

  validarAccesoAdmin().then(function (ok) {
    if (!ok) return;
    cargarDashboard();
  });
}

document.addEventListener('DOMContentLoaded', initAdmin);
