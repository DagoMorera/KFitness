function formatearFecha(fecha) {
  return fecha;
}

function guardarReservasLocalStorage(reservas) {
  localStorage.setItem('kfitness_reservas', JSON.stringify(reservas));
}

function obtenerReservasLocalStorage() {
  return JSON.parse(localStorage.getItem('kfitness_reservas') || '[]');
}

function cargarReservas() {
  const cuerpo = document.getElementById('reservas-lista');
  if (!cuerpo) return;
  const reservas = obtenerReservasLocalStorage();
  cuerpo.innerHTML = '';

  if (reservas.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="5">No hay reservas registradas aún.</td></tr>';
    return;
  }

  reservas.forEach((reserva, index) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${reserva.servicio}</td>
      <td>${formatearFecha(reserva.fecha)}</td>
      <td>${reserva.hora}</td>
      <td>${reserva.estado}</td>
      <td><button class='boton boton-secundario' data-indice='${index}'>Cancelar</button></td>
    `;
    cuerpo.appendChild(fila);
  });
}

function manejarCancelacion(event) {
  const boton = event.target.closest('button[data-indice]');
  if (!boton) return;
  const index = Number(boton.dataset.indice);
  const reservas = obtenerReservasLocalStorage();
  const reserva = reservas[index];
  if (!reserva) return;
  const confirmacion = window.confirm('¿Deseas cancelar esta reserva?');
  if (!confirmacion) return;
  reservas[index].estado = 'Cancelada';
  guardarReservasLocalStorage(reservas);
  cargarReservas();
  const mensaje = document.getElementById('reserva-mensaje');
  if (mensaje) {
    mensaje.textContent = 'Reserva cancelada correctamente.';
    mensaje.style.color = '#ED1C2E';
  }
}

function manejarFormularioReserva() {
  const form = document.getElementById('form-reserva');
  if (!form) return;
  const mensaje = document.getElementById('reserva-mensaje');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const servicio = document.getElementById('reserva-servicio').value;
    const fecha = document.getElementById('reserva-fecha').value;
    const hora = document.getElementById('reserva-hora').value;
    const instructor = document.getElementById('reserva-instructor').value.trim();

    if (!servicio || !fecha || !hora || !instructor) {
      if (mensaje) mostrarMensajeReserva('Por favor completa todos los campos obligatorios.', false);
      return;
    }

    const hoy = new Date();
    const seleccion = new Date(fecha + 'T00:00:00');
    if (seleccion < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
      if (mensaje) mostrarMensajeReserva('No se permiten fechas anteriores al día actual.', false);
      return;
    }

    const reservas = obtenerReservasLocalStorage();
    reservas.push({ servicio, fecha, hora, instructor, observaciones: document.getElementById('reserva-observaciones').value.trim(), estado: 'Activa' });
    guardarReservasLocalStorage(reservas);
    cargarReservas();
    form.reset();
    if (mensaje) mostrarMensajeReserva('Reserva registrada exitosamente.', true);
  });
}

function mostrarMensajeReserva(texto, exito) {
  const mensaje = document.getElementById('reserva-mensaje');
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.style.color = exito ? '#ED1C2E' : '#ff6b6b';
}

function initReservas() {
  manejarFormularioReserva();
  cargarReservas();
  document.getElementById('reservas-lista')?.addEventListener('click', manejarCancelacion);
}

document.addEventListener('DOMContentLoaded', initReservas);
