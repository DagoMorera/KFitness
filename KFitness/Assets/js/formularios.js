function validarEmail(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function mostrarMensaje(id, texto, exito = true) {
  const elemento = document.getElementById(id);
  if (elemento) {
    elemento.textContent = texto;
    elemento.style.color = exito ? '#ED1C2E' : '#ff6b6b';
  }
}

function manejarFormularioContacto() {
  const form = document.getElementById('form-contacto');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nombre = document.getElementById('contacto-nombre').value.trim();
    const email = document.getElementById('contacto-email').value.trim();
    const telefono = document.getElementById('contacto-telefono').value.trim();
    const asunto = document.getElementById('contacto-asunto').value.trim();
    const mensaje = document.getElementById('contacto-mensaje').value.trim();

    if (!nombre || !email || !telefono || !asunto || !mensaje) {
      mostrarMensaje('contacto-mensaje-respuesta', 'Por favor completa todos los campos.', false);
      return;
    }
    if (!validarEmail(email)) {
      mostrarMensaje('contacto-mensaje-respuesta', 'Ingresa un correo electrónico válido.', false);
      return;
    }
    if (mensaje.length < 20) {
      mostrarMensaje('contacto-mensaje-respuesta', 'El mensaje debe tener al menos 20 caracteres.', false);
      return;
    }

    mostrarMensaje('contacto-mensaje-respuesta', 'Mensaje enviado correctamente. Gracias por contactarnos.');
    form.reset();
  });
}

function manejarFormularioRegistro() {
  const form = document.getElementById('form-registro');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nombre = document.getElementById('registro-nombre').value.trim();
    const apellido1 = document.getElementById('registro-apellido1').value.trim();
    const apellido2 = document.getElementById('registro-apellido2').value.trim();
    const email = document.getElementById('registro-email').value.trim().toLowerCase();
    const telefono = document.getElementById('registro-telefono').value.trim();
    const nacimiento = document.getElementById('registro-nacimiento').value;
    const password = document.getElementById('registro-password').value;
    const password2 = document.getElementById('registro-password2').value;
    const terminos = document.getElementById('registro-terminos').checked;

    if (!nombre || !apellido1 || !apellido2 || !email || !telefono || !nacimiento || !password || !password2) {
      mostrarMensaje('registro-mensaje', 'Completa todos los campos obligatorios.', false);
      return;
    }
    if (!validarEmail(email)) {
      mostrarMensaje('registro-mensaje', 'Ingresa un correo válido.', false);
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      mostrarMensaje('registro-mensaje', 'La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.', false);
      return;
    }
    if (password !== password2) {
      mostrarMensaje('registro-mensaje', 'Las contraseñas deben coincidir.', false);
      return;
    }
    if (!terminos) {
      mostrarMensaje('registro-mensaje', 'Debes aceptar los términos y condiciones.', false);
      return;
    }

    // Enviar al backend para registro
    const payload = { nombre, apellido1, apellido2, correo: email, telefono, nacimiento, password };

    mostrarMensaje('registro-mensaje', 'Registrando...');

    fetch('/api/register.ashx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data && data.success) {
          mostrarMensaje('registro-mensaje', 'Registro exitoso. Serás redirigido al inicio de sesión.');
          form.reset();
          setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        } else {
          mostrarMensaje('registro-mensaje', (data && data.message) ? data.message : 'Error en el registro.', false);
        }
      })
      .catch((err) => {
        mostrarMensaje('registro-mensaje', 'Error de red o del servidor. Intenta nuevamente más tarde.', false);
      });
  });
}

function manejarFormularioRecuperar() {
  const form = document.getElementById('form-recuperar');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('recuperar-email').value.trim();
    if (!email) {
      mostrarMensaje('recuperar-mensaje', 'Ingresa un correo electrónico.', false);
      return;
    }
    if (!validarEmail(email)) {
      mostrarMensaje('recuperar-mensaje', 'Ingresa un correo válido.', false);
      return;
    }
    mostrarMensaje('recuperar-mensaje', 'Solicitud recibida. Revisa tu correo para continuar con la recuperación de acceso.');
    form.reset();
  });
}

function initFormularios() {
  manejarFormularioContacto();
  manejarFormularioRegistro();
  manejarFormularioRecuperar();
}

document.addEventListener('DOMContentLoaded', initFormularios);
