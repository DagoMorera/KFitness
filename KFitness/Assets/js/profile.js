// js/profile.js - carga datos de perfil desde api/profile.ashx
function aplicarVistaPorRol(rol) {
  var esAdmin = String(rol || '').toLowerCase() === 'administrador';

  var itemPanelAdmin = document.getElementById('sidebar-panel-admin');
  var itemReservas = document.getElementById('sidebar-mis-reservas');
  var itemRutinas = document.getElementById('sidebar-mis-rutinas');

  var seccionReservas = document.getElementById('perfil-reservas');
  var seccionRutinas = document.getElementById('perfil-rutinas');

  var estadoMembresia = document.getElementById('estado-membresia');
  var proximaReserva = document.getElementById('proxima-reserva');
  var rutinaAsignada = document.getElementById('rutina-asignada');

  if (itemPanelAdmin) itemPanelAdmin.hidden = !esAdmin;
  if (itemReservas) itemReservas.hidden = esAdmin;
  if (itemRutinas) itemRutinas.hidden = esAdmin;

  if (seccionReservas) seccionReservas.hidden = true;
  if (seccionRutinas) seccionRutinas.hidden = true;

  if (estadoMembresia) estadoMembresia.style.display = esAdmin ? 'none' : '';
  if (proximaReserva) proximaReserva.style.display = esAdmin ? 'none' : '';
  if (rutinaAsignada) rutinaAsignada.style.display = esAdmin ? 'none' : '';
}

function cargarPerfil() {
  var form = document.getElementById('form-perfil');
  var mensaje = document.getElementById('perfil-mensaje');
  var rolSpan = document.getElementById('perfil-rol');
  var display = document.getElementById('perfil-avatar-display');
  var cambiar = document.getElementById('perfil-cambiar-foto');
  var eliminar = document.getElementById('perfil-eliminar-foto');

  // Solo en página de perfil
  if (!form && !rolSpan) return;

  fetch('/api/profile.ashx', { method: 'GET', credentials: 'same-origin' })
    .then(function(resp) {
      // Handle HTTP status before attempting to parse JSON
      if (resp.status === 401) {
        // Unauthenticated -> force login
        window.location.href = '/Pages/login.html';
        throw new Error('unauthenticated');
      }
      if (resp.status >= 500) {
        if (mensaje) { mensaje.textContent = 'No fue posible cargar tu perfil. Intenta nuevamente.'; mensaje.style.color = '#ff6b6b'; }
        throw new Error('server-error');
      }
      if (resp.status === 404) {
        if (mensaje) { mensaje.textContent = 'No fue posible cargar tu perfil. Intenta nuevamente.'; mensaje.style.color = '#ff6b6b'; }
        throw new Error('not-found');
      }
      // For other non-OK statuses, show generic server message but do not redirect
      if (!resp.ok) {
        if (mensaje) { mensaje.textContent = 'No fue posible cargar tu perfil. Intenta nuevamente.'; mensaje.style.color = '#ff6b6b'; }
        throw new Error('http-error');
      }
      return resp.json();
    })
    .then(function(data) {
      if (!data) return;

      // Rellenar campos
      if (document.getElementById('perfil-nombre')) document.getElementById('perfil-nombre').value = data.nombre || '';
      if (document.getElementById('perfil-apellido1')) document.getElementById('perfil-apellido1').value = data.apellido1 || '';
      if (document.getElementById('perfil-apellido2')) document.getElementById('perfil-apellido2').value = data.apellido2 || '';
      if (document.getElementById('perfil-email')) document.getElementById('perfil-email').value = data.correo || '';
      if (document.getElementById('perfil-telefono')) document.getElementById('perfil-telefono').value = data.telefono || '';
      if (rolSpan) {
        rolSpan.textContent = data.rol || '';
        rolSpan.classList.add('perfil-rol-badge');
      }
      aplicarVistaPorRol(data.rol);
      // Also set header title if present
      var nombreTitulo = document.getElementById('perfil-nombre-titulo');
      if (nombreTitulo) nombreTitulo.textContent = data.nombre || '';

      if (display) {
        var defaultPlaceholder = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.59 21C20.21 18.53 17.76 16.67 15 16.67H9C6.24 16.67 3.79 18.53 3.41 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        if (data.fotoUrl) {
          display.innerHTML = '';
          var imgPersistida = document.createElement('img');
          imgPersistida.src = data.fotoUrl;
          imgPersistida.alt = 'Foto de perfil';
          display.appendChild(imgPersistida);
          if (cambiar) cambiar.style.display = '';
          if (eliminar) eliminar.style.display = '';
        } else {
          display.innerHTML = defaultPlaceholder;
          if (cambiar) cambiar.style.display = 'none';
          if (eliminar) eliminar.style.display = 'none';
        }
      }
    })
    .catch(function(err) {
      // If error already handled (unauthenticated) we threw to abort; otherwise it's a network/parse error
      if (err && err.message === 'unauthenticated') return;
      if (err && (err.message === 'server-error' || err.message === 'not-found' || err.message === 'http-error')) return;
      if (mensaje) { mensaje.textContent = 'No fue posible conectar con el servidor. Intenta nuevamente.'; mensaje.style.color = '#ff6b6b'; }
    });
}

document.addEventListener('DOMContentLoaded', cargarPerfil);

// Edit mode handling
document.addEventListener('DOMContentLoaded', function() {
  var editarBtn = document.createElement('button');
  editarBtn.type = 'button';
  editarBtn.id = 'perfil-editar-btn';
  editarBtn.className = 'boton boton-secundario';
  editarBtn.textContent = 'Editar perfil';

  var form = document.getElementById('form-perfil');
  if (!form) return;

  // Insert editar button before submit
  var submit = form.querySelector('button[type=submit]');
  submit.style.display = 'none';
  submit.disabled = true;
  submit.parentNode.insertBefore(editarBtn, submit);

  var cancelarBtn = document.createElement('button');
  cancelarBtn.type = 'button';
  cancelarBtn.id = 'perfil-cancelar-btn';
  cancelarBtn.className = 'boton boton-secundario';
  cancelarBtn.textContent = 'Cancelar';
  cancelarBtn.style.display = 'none';
  submit.parentNode.insertBefore(cancelarBtn, submit);

  // Fields
  var fNombre = document.getElementById('perfil-nombre');
  var fApellido1 = document.getElementById('perfil-apellido1');
  var fApellido2 = document.getElementById('perfil-apellido2');
  var fCorreo = document.getElementById('perfil-email');
  var fTelefono = document.getElementById('perfil-telefono');

  // Keep original values for cancel
  var original = {};

  function setReadOnlyMode() {
    if (fNombre) fNombre.readOnly = true;
    if (fApellido1) fApellido1.readOnly = true;
    if (fApellido2) fApellido2.readOnly = true;
    if (fCorreo) fCorreo.readOnly = true; // always readonly
    if (fTelefono) fTelefono.readOnly = true;
    editarBtn.textContent = 'Editar perfil';
    cancelarBtn.style.display = 'none';
    submit.style.display = 'none';
    submit.disabled = true;
  }

  function setEditMode() {
    if (fNombre) fNombre.readOnly = false;
    if (fApellido1) fApellido1.readOnly = false;
    if (fApellido2) fApellido2.readOnly = false;
    if (fTelefono) fTelefono.readOnly = false;
    if (fCorreo) fCorreo.readOnly = true; // always readonly
    editarBtn.textContent = 'Cancelar';
    cancelarBtn.style.display = '';
    submit.style.display = '';
    submit.disabled = false;
  }

  function guardarOriginales() {
    original.nombre = fNombre ? fNombre.value : '';
    original.apellido1 = fApellido1 ? fApellido1.value : '';
    original.apellido2 = fApellido2 ? fApellido2.value : '';
    original.telefono = fTelefono ? fTelefono.value : '';
  }

  function restaurarOriginales() {
    if (fNombre) fNombre.value = original.nombre || '';
    if (fApellido1) fApellido1.value = original.apellido1 || '';
    if (fApellido2) fApellido2.value = original.apellido2 || '';
    if (fTelefono) fTelefono.value = original.telefono || '';
  }

  // Start read-only
  setReadOnlyMode();
  // Do NOT capture original values immediately: cargarPerfil() is async and
  // would overwrite 'original' with empty strings if we read before the
  // server response arrives. Capture originals only when entering edit mode.

  editarBtn.addEventListener('click', function() {
    // Toggle: if currently in read-only, enter edit; else cancel
    if (editarBtn.textContent === 'Editar perfil') {
      guardarOriginales();
      setEditMode();
    } else {
      restaurarOriginales();
      setReadOnlyMode();
    }
  });

  cancelarBtn.addEventListener('click', function() {
    restaurarOriginales();
    setReadOnlyMode();
  });

  // Handle submit (Guardar cambios)
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var mensaje = document.getElementById('perfil-mensaje');
    // Frontend validation
    if (!fNombre || !fNombre.value.trim()) {
      if (mensaje) { mensaje.textContent = 'Nombre es obligatorio.'; mensaje.style.color = '#ff6b6b'; }
      return;
    }
    if (!fApellido1 || !fApellido1.value.trim()) {
      if (mensaje) { mensaje.textContent = 'Primer apellido es obligatorio.'; mensaje.style.color = '#ff6b6b'; }
      return;
    }

    var payload = {
      nombre: fNombre.value.trim(),
      apellido1: fApellido1.value.trim(),
      apellido2: fApellido2 ? fApellido2.value.trim() : null,
      telefono: fTelefono ? fTelefono.value.trim() : null
    };

    fetch('/api/profile.ashx', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(resp) { return resp.json().then(function(body){ body.__status = resp.status; return body; }); })
    .then(function(data) {
      if (!data) return;
      if (data.__status === 401) {
        if (mensaje) { mensaje.textContent = 'No autorizado.'; mensaje.style.color = '#ff6b6b'; }
        return;
      }
      if (data.__status === 400 || (data && data.success === false)) {
        if (mensaje) { mensaje.textContent = data.message || 'Error de validación.'; mensaje.style.color = '#ff6b6b'; }
        return;
      }
      // Success
      if (mensaje) { mensaje.textContent = data.message || 'Perfil actualizado correctamente.'; mensaje.style.color = '#ED1C2E'; }
      setReadOnlyMode();
      // Refresh data from server to ensure stored values are shown
      cargarPerfil();
    })
    .catch(function() {
      if (mensaje) { mensaje.textContent = 'Error de red o servidor.'; mensaje.style.color = '#ff6b6b'; }
    });
  });

});

// Avatar file input handlers (preview + persistencia)
document.addEventListener('DOMContentLoaded', function() {
  var input = document.getElementById('perfil-foto-input');
  var agregar = document.getElementById('perfil-agregar-foto');
  var cambiar = document.getElementById('perfil-cambiar-foto');
  var eliminar = document.getElementById('perfil-eliminar-foto');
  var display = document.getElementById('perfil-avatar-display');
  var mensaje = document.getElementById('perfil-mensaje');

  if (!input || !display) return;

  var defaultPlaceholder = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.59 21C20.21 18.53 17.76 16.67 15 16.67H9C6.24 16.67 3.79 18.53 3.41 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function showPlaceholder() {
    display.innerHTML = defaultPlaceholder;
    if (cambiar) cambiar.style.display = 'none';
    if (eliminar) eliminar.style.display = 'none';
  }

  function showPreviewFile(file) {
    if (!file) return;
    var url = URL.createObjectURL(file);
    display.innerHTML = '';
    var img = document.createElement('img');
    img.src = url;
    img.alt = 'Foto de perfil';
    img.onload = function() { URL.revokeObjectURL(url); };
    display.appendChild(img);
    if (cambiar) cambiar.style.display = '';
    if (eliminar) eliminar.style.display = '';
  }

  function setMensaje(texto, ok) {
    if (!mensaje) return;
    mensaje.textContent = texto || '';
    mensaje.style.color = ok ? '#ED1C2E' : '#ff6b6b';
  }

  function subirFoto(file) {
    var fd = new FormData();
    fd.append('action', 'uploadPhoto');
    fd.append('foto', file);

    return fetch('/api/profile.ashx', {
      method: 'POST',
      credentials: 'same-origin',
      body: fd
    })
    .then(function(resp) {
      return resp.json().then(function(body) {
        body.__status = resp.status;
        return body;
      });
    });
  }

  function eliminarFoto() {
    var fd = new FormData();
    fd.append('action', 'deletePhoto');

    return fetch('/api/profile.ashx', {
      method: 'POST',
      credentials: 'same-origin',
      body: fd
    })
    .then(function(resp) {
      return resp.json().then(function(body) {
        body.__status = resp.status;
        return body;
      });
    });
  }

  if (agregar) {
    agregar.addEventListener('click', function() { input.click(); });
  }
  if (cambiar) {
    cambiar.addEventListener('click', function() { input.click(); });
  }
  if (eliminar) {
    eliminar.addEventListener('click', function() {
      eliminarFoto()
        .then(function(data) {
          if (!data || data.__status >= 400 || data.success === false) {
            setMensaje((data && data.message) || 'No fue posible eliminar la foto de perfil.', false);
            return;
          }
          showPlaceholder();
          setMensaje(data.message || 'Foto eliminada correctamente.', true);
          input.value = '';
          cargarPerfil();
        })
        .catch(function() {
          setMensaje('No fue posible conectar con el servidor.', false);
        });
    });
  }

  input.addEventListener('change', function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    var accept = ['image/jpeg', 'image/png'];
    if (accept.indexOf(file.type) === -1) {
      setMensaje('Formato no permitido. Use JPEG o PNG.', false);
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMensaje('La imagen supera el tamaño máximo permitido (5 MB).', false);
      input.value = '';
      return;
    }

    showPreviewFile(file);

    subirFoto(file)
      .then(function(data) {
        if (!data || data.__status >= 400 || data.success === false) {
          setMensaje((data && data.message) || 'No fue posible guardar la foto de perfil.', false);
          cargarPerfil();
          return;
        }

        if (data.fotoUrl) {
          display.innerHTML = '';
          var imgPersistida = document.createElement('img');
          imgPersistida.src = data.fotoUrl;
          imgPersistida.alt = 'Foto de perfil';
          display.appendChild(imgPersistida);
          if (cambiar) cambiar.style.display = '';
          if (eliminar) eliminar.style.display = '';
        }

        setMensaje(data.message || 'Foto guardada correctamente.', true);
        input.value = '';
      })
      .catch(function() {
        setMensaje('No fue posible conectar con el servidor.', false);
        cargarPerfil();
      });
  });
});

// Cambio de contraseña
function initCambioContrasena() {
  var abrirBtn = document.getElementById('sidebar-cambiar-clave');
  var overlay = document.getElementById('perfil-clave-modal');
  var form = document.getElementById('perfil-clave-form');
  var cancelar = document.getElementById('perfil-clave-cancelar');
  var mensaje = document.getElementById('perfil-clave-mensaje');

  if (!overlay || !form || !cancelar) return;

  overlay.hidden = true;
  overlay.classList.remove('is-open');

  if (!abrirBtn) return;

  var actual = document.getElementById('clave-actual');
  var nueva = document.getElementById('clave-nueva');
  var confirmar = document.getElementById('clave-confirmar');

  var errActual = document.getElementById('clave-actual-error');
  var errNueva = document.getElementById('clave-nueva-error');
  var errConfirmar = document.getElementById('clave-confirmar-error');

  var reqLen = document.getElementById('policy-len');
  var reqUpper = document.getElementById('policy-upper');
  var reqLower = document.getElementById('policy-lower');
  var reqNum = document.getElementById('policy-num');

  function limpiarErrores() {
    if (errActual) errActual.textContent = '';
    if (errNueva) errNueva.textContent = '';
    if (errConfirmar) errConfirmar.textContent = '';
    if (mensaje) { mensaje.textContent = ''; mensaje.style.color = ''; }
  }

  function limpiarFormulario() {
    if (actual) actual.value = '';
    if (nueva) nueva.value = '';
    if (confirmar) confirmar.value = '';
    limpiarErrores();
    actualizarIndicadores();
  }

  function abrirModal() {
    overlay.hidden = false;
    overlay.classList.add('is-open');
    limpiarFormulario();
    if (actual) actual.focus();
  }

  function cerrarModal() {
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    limpiarFormulario();
  }

  function manejarEscape(e) {
    if (e.key === 'Escape' && !overlay.hidden) {
      cerrarModal();
    }
  }

  function cumpleLen(valor) { return valor && valor.length >= 8; }
  function tieneMayus(valor) { return /[A-Z]/.test(valor || ''); }
  function tieneMinus(valor) { return /[a-z]/.test(valor || ''); }
  function tieneNum(valor) { return /[0-9]/.test(valor || ''); }

  function pintarIndicador(el, ok) {
    if (!el) return;
    el.className = ok ? 'policy-ok' : 'policy-off';
    el.textContent = (ok ? '✓ ' : '• ') + el.textContent.replace('✓ ', '').replace('• ', '');
  }

  function actualizarIndicadores() {
    var v = nueva ? nueva.value : '';
    pintarIndicador(reqLen, cumpleLen(v));
    pintarIndicador(reqUpper, tieneMayus(v));
    pintarIndicador(reqLower, tieneMinus(v));
    pintarIndicador(reqNum, tieneNum(v));
  }

  function politicaValida(valor) {
    return cumpleLen(valor) && tieneMayus(valor) && tieneMinus(valor) && tieneNum(valor);
  }

  function validar() {
    limpiarErrores();
    var ok = true;

    var vActual = actual ? actual.value : '';
    var vNueva = nueva ? nueva.value : '';
    var vConfirmar = confirmar ? confirmar.value : '';

    if (!vActual) {
      if (errActual) errActual.textContent = 'Ingresa tu contraseña actual.';
      ok = false;
    }

    if (!vNueva) {
      if (errNueva) errNueva.textContent = 'Ingresa tu nueva contraseña.';
      ok = false;
    } else if (!politicaValida(vNueva)) {
      if (errNueva) errNueva.textContent = 'La nueva contraseña no cumple con los requisitos de seguridad.';
      ok = false;
    }

    if (!vConfirmar) {
      if (errConfirmar) errConfirmar.textContent = 'Confirma tu nueva contraseña.';
      ok = false;
    } else if (vNueva !== vConfirmar) {
      if (errConfirmar) errConfirmar.textContent = 'Las contraseñas no coinciden.';
      ok = false;
    }

    if (vActual && vNueva && vActual === vNueva) {
      if (errNueva) errNueva.textContent = 'La nueva contraseña no puede ser idéntica a la contraseña actual.';
      ok = false;
    }

    return ok;
  }

  abrirBtn.addEventListener('click', abrirModal);
  cancelar.addEventListener('click', cerrarModal);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) cerrarModal();
  });

  document.addEventListener('keydown', manejarEscape);

  if (nueva) {
    nueva.addEventListener('input', actualizarIndicadores);
  }

  var toggles = overlay.querySelectorAll('.perfil-toggle-clave');
  for (var i = 0; i < toggles.length; i++) {
    toggles[i].addEventListener('click', function() {
      var targetId = this.getAttribute('data-target');
      var inputTarget = document.getElementById(targetId);
      if (!inputTarget) return;
      var mostrar = inputTarget.type === 'password';
      inputTarget.type = mostrar ? 'text' : 'password';
      var use = this.querySelector('use');
      if (use) use.setAttribute('href', mostrar ? '#i-eye-off' : '#i-eye');
    });
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validar()) return;

    fetch('/api/change_password.ashx', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actual: actual.value,
        nueva: nueva.value,
        confirmar: confirmar.value
      })
    })
    .then(function(resp) {
      return resp.json().then(function(body) {
        body.__status = resp.status;
        return body;
      });
    })
    .then(function(data) {
      if (!data) return;
      if (data.__status === 401) {
        if (mensaje) { mensaje.textContent = 'No autorizado.'; mensaje.style.color = '#ff6b6b'; }
        return;
      }
      if (data.__status >= 400 || data.success === false) {
        if (mensaje) { mensaje.textContent = data.message || 'No fue posible actualizar la contraseña.'; mensaje.style.color = '#ff6b6b'; }
        return;
      }
      if (mensaje) {
        mensaje.textContent = 'Contraseña actualizada. Tu contraseña se cambió correctamente.';
        mensaje.style.color = '#ED1C2E';
      }
      setTimeout(function() {
        cerrarModal();
      }, 900);
    })
    .catch(function() {
      if (mensaje) { mensaje.textContent = 'No fue posible conectar con el servidor.'; mensaje.style.color = '#ff6b6b'; }
    });
  });

  actualizarIndicadores();
}

document.addEventListener('DOMContentLoaded', initCambioContrasena);
