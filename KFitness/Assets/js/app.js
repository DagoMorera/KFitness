const headerTemplate = `
  <div class='contenedor nav-bar'>
    <a href='/Pages/index.html' class='nav-logo' aria-label='KFitness - Inicio'>
      <img src='img/Logo1.png' alt='KFitness'>
    </a>
    <button class='menu-hamburguesa' aria-expanded='false' aria-controls='nav-menu'>Menú</button>
    <nav id='nav-menu' class='nav-links' aria-label='Navegación principal'>
      <a href='/Pages/index.html'>Inicio</a>
      <a href='servicios.html'>Servicios</a>
      <a href='horarios.html'>Horarios</a>
      <a href='promociones.html'>Promociones</a>
      <a href='contacto.html'>Contacto</a>
      <div id='nav-auth-actions'>
        <!-- Auth actions will be populated dynamically -->
      </div>
    </nav>
  </div>
`;

const footerTemplate = `
  <div class='contenedor footer-grid'>
    <div>
      <a href='/Pages/index.html' class='footer-logo' aria-label='KFitness - Inicio'>
        <img src='img/Logo1.png' alt='KFitness'>
      </a>
    </div>
    <div>
      <h3>Enlaces rápidos</h3>
      <ul class='footer-links'>
        <li><a href='/Pages/index.html'>Inicio</a></li>
        <li><a href='servicios.html'>Servicios</a></li>
        <li><a href='horarios.html'>Horarios</a></li>
        <li><a href='promociones.html'>Promociones</a></li>
      </ul>
    </div>
    <div>
      <h3>Contacto</h3>
      <p>Iveth Karina Martinez Garcia</p>
      <p>Propietaria de KFitness</p>
      <p>Teléfono: <a href='tel:+50670124477'>+506 7012 4477</a></p>
      <p>Correo: <a href='mailto:karinamartinezg19@gmail.com'>karinamartinezg19@gmail.com</a></p>
    </div>
  </div>
  <div class='contenedor footer-copyright'>
    <p>© <span id='anio-actual'></span> KFitness. Todos los derechos reservados.</p>
  </div>
`;

function initHeaderFooter() {
  // Prevent double initialization if script is accidentally executed twice
  if (window.__kf_header_initialized) return;
  const header = document.querySelector('.site-header');
  const footer = document.querySelector('.site-footer');
  window.__kf_header_initialized = true;
  try { console.debug('[KF] initHeaderFooter: rendering header/footer'); } catch (e) {}
  if (header) {
    header.innerHTML = headerTemplate;
  }

// Centralized logout function used by dropdown and perfil.html
window.kfLogout = function () {
  return fetch('/api/logout.ashx', { method: 'POST', credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.success) window.location.href = '/Pages/index.html';
      return d;
    })
    .catch(function (e) {
      window.location.href = '/Pages/index.html';
      throw e;
    });
};
  if (footer) {
    footer.innerHTML = footerTemplate;
  }
  // After rendering header, update authentication-dependent links
  updateAuthHeader();
}

function updateAuthHeader() {
  try {
    var headerEl = document.querySelector('.site-header');
    if (!headerEl) {
      try { console.debug('[KF] updateAuthHeader: no .site-header found'); } catch (e) {}
      return;
    }
    var nav = headerEl.querySelector('#nav-menu');
    if (!nav) {
      try { console.debug('[KF] updateAuthHeader: no #nav-menu found inside header'); } catch (e) {}
      return;
    }
    // Query the server for profile to determine authentication state
    var authContainer = headerEl.querySelector('#nav-auth-actions');
    if (!authContainer) {
      try { console.debug('[KF] updateAuthHeader: no #nav-auth-actions found'); } catch (e) {}
      return;
    }

    // Do not assume visitor state while the server check is in progress.
    // Keep the auth container neutral (empty) until the request returns.
    if (authContainer) {
      try { console.debug('[KF] updateAuthHeader: clearing auth container (neutral)'); } catch (e) {}
      authContainer.innerHTML = '';
    }

    fetch('/api/profile.ashx', { method: 'GET', credentials: 'same-origin' })
      .then(function(resp) {
        // If unauthenticated, render visitor links explicitly
        if (resp.status === 401) {
          try { console.debug('[KF] updateAuthHeader: server returned 401 — rendering visitor links'); } catch (e) {}
          authContainer.innerHTML = "<a href='/Pages/login.html'>Iniciar sesión</a> <a class='boton boton-registro' href='/Pages/registro.html'>Registrarse</a>";
          return null;
        }

        // For server errors or other non-ok responses, do not assume logout: leave neutral
        if (resp.status >= 500 || !resp.ok) {
          return null;
        }

        // Validate content-type before parsing JSON
        var ct = resp.headers.get('content-type') || '';
        if (!ct.toLowerCase().includes('application/json')) {
          try { console.debug('[KF] updateAuthHeader: content-type not JSON:', ct); } catch (e) {}
          // Received non-JSON (e.g., HTML) — do not treat as authenticated; leave neutral
          return null;
        }

        return resp.json();
      })
      .then(function(data) {
        if (!data) return;
        if (data && data.success) {
          var rol = (data.rol || '').toLowerCase();
          var esAdmin = rol === 'administrador';
          var texto = esAdmin ? 'Administración' : 'Mi perfil';
          var linkPrincipal = esAdmin ? '/Pages/admin.html' : '/perfil.html';
          var etiquetaPrincipal = esAdmin ? 'Panel de administración' : 'Mi perfil';

          var isActive = window.location.pathname === linkPrincipal || window.location.pathname === linkPrincipal.replace('/', '');

          var iconDashboard = '<svg class="kf-item-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z"></path></svg>';
          var iconProfile = '<svg class="kf-item-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z"></path></svg>';
          var iconLogout = '<svg class="kf-item-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17 15 12 10 7M15 12H3M13 3h6v18h-6"></path></svg>';

          var menuItems = '';
          if (esAdmin) {
            menuItems += '<a href="' + linkPrincipal + '" class="kf-dropdown-item" role="menuitem">' + iconDashboard + '<span>' + etiquetaPrincipal + '</span></a>';
            menuItems += '<a href="/perfil.html" class="kf-dropdown-item" role="menuitem">' + iconProfile + '<span>Mi perfil</span></a>';
          } else {
            menuItems += '<a href="/perfil.html" class="kf-dropdown-item" role="menuitem">' + iconProfile + '<span>Mi perfil</span></a>';
          }
          menuItems += '<button type="button" id="kf-logout-btn" class="kf-dropdown-item kf-logout" role="menuitem">' + iconLogout + '<span>Cerrar sesión</span></button>';

          authContainer.innerHTML = `
            <div class="kf-dropdown" data-kf-dropdown>
              <button type="button" class="kf-dropdown-toggle boton boton-registro" aria-expanded="false">
                ${texto} <span class="kf-caret">▾</span>
              </button>
              <div class="kf-dropdown-menu" role="menu">
                ${menuItems}
              </div>
            </div>
          `;

          if (isActive) {
            var toggle = authContainer.querySelector('.kf-dropdown-toggle');
            if (toggle) toggle.classList.add('activo');
          }

          (function wireDropdown() {
            var root = authContainer.querySelector('[data-kf-dropdown]');
            if (!root) return;
            var toggle = root.querySelector('.kf-dropdown-toggle');
            var menu = root.querySelector('.kf-dropdown-menu');
            var logoutBtn = root.querySelector('#kf-logout-btn');

            function closeMenu() {
              if (toggle) toggle.setAttribute('aria-expanded', 'false');
              if (menu) menu.classList.remove('open');
            }

            function openMenu() {
              if (toggle) toggle.setAttribute('aria-expanded', 'true');
              if (menu) menu.classList.add('open');
            }

            toggle.addEventListener('click', function (e) {
              e.preventDefault();
              var expanded = toggle.getAttribute('aria-expanded') === 'true';
              if (expanded) closeMenu(); else openMenu();
            });

            document.addEventListener('click', function (ev) {
              if (!root.contains(ev.target)) closeMenu();
            });

            document.addEventListener('keydown', function (ev) {
              if (ev.key === 'Escape') { closeMenu(); }
            });

            if (logoutBtn) {
              logoutBtn.addEventListener('click', function () {
                if (window.kfLogout) {
                  window.kfLogout();
                } else {
                  window.location.href = '/Pages/index.html';
                }
              });
            }
          })();
        }
      })
      .catch(function() {
        // Network error: do not assume logout — keep neutral or previous state
      });
  } catch (e) {
    // ignore errors
  }
}

function initMobileMenu() {
  const boton = document.querySelector('.menu-hamburguesa');
  const nav = document.querySelector('.nav-links');
  if (!boton || !nav) return;

  boton.addEventListener('click', () => {
    const visible = nav.classList.toggle('visible');
    boton.setAttribute('aria-expanded', visible ? 'true' : 'false');
  });
}

function setActiveNavLink() {
  const url = window.location.pathname;
  const page = url.substring(url.lastIndexOf('/') + 1) || '/Pages/index.html';
  const links = document.querySelectorAll('.nav-links a');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === page) {
      link.classList.add('activo');
    }
  });
}

function initFiltroServicios() {
  const botones = document.querySelectorAll('.filtros-servicios button');
  const servicios = document.querySelectorAll('.tarjeta.servicio');
  if (!botones.length || !servicios.length) return;

  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      botones.forEach((item) => item.classList.remove('activo'));
      boton.classList.add('activo');
      const filtro = boton.dataset.filtro;
      servicios.forEach((servicio) => {
        const categoria = servicio.dataset.categoria;
        servicio.style.display = filtro === 'todos' || filtro === categoria ? '' : 'none';
      });
    });
  });

  const filtroInicial = new URLSearchParams(window.location.search).get('filtro');
  if (filtroInicial) {
    const botonInicial = Array.from(botones).find((boton) => boton.dataset.filtro === filtroInicial);
    if (botonInicial) botonInicial.click();
  }
}

function updateFooterYear() {
  const año = new Date().getFullYear();
  const span = document.getElementById('anio-actual');
  if (span) {
    span.textContent = año;
  }
}

function initScrollReveal() {
  const elementos = document.querySelectorAll(`
    .hero .hero-card,
    main section:not(.hero) h1,
    main section:not(.hero) h2,
    main section:not(.hero) h3,
    main section:not(.hero) p,
    main section:not(.hero) li,
    main section:not(.hero) table,
    main section:not(.hero) .boton
  `);

  if (!elementos.length) return;

  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducirMovimiento || !('IntersectionObserver' in window)) {
    elementos.forEach((elemento) => elemento.classList.add('reveal-visible'));
    return;
  }

  elementos.forEach((elemento, indice) => {
    elemento.classList.add('scroll-reveal');
    elemento.style.setProperty('--reveal-delay', `${(indice % 4) * 80}ms`);
  });

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add('reveal-visible');
      observador.unobserve(entrada.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px'
  });

  elementos.forEach((elemento) => observador.observe(elemento));
}

function initHeroCarousel() {
  const imagen = document.querySelector('.hero-main-image');
  if (!imagen) return;

  const imagenes = [
    { src: 'img/hero-kfitness.png', alt: 'Entrenamiento en KFitness' },
    { src: 'img/Kfitness2.png', alt: 'Atleta en las instalaciones de KFitness' },
    { src: 'img/Kfitness5.png', alt: 'Actividad física en KFitness' }
  ];
  let indice = 0;

  imagenes.slice(1).forEach((item) => {
    const precarga = new Image();
    precarga.src = item.src;
  });

  window.setInterval(() => {
    indice = (indice + 1) % imagenes.length;
    imagen.classList.add('cambiando-imagen');

    window.setTimeout(() => {
      imagen.src = imagenes[indice].src;
      imagen.alt = imagenes[indice].alt;
      imagen.classList.remove('cambiando-imagen');
    }, 500);
  }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  initHeaderFooter();
  initMobileMenu();
  setActiveNavLink();
  initFiltroServicios();
  updateFooterYear();
  initScrollReveal();
  initHeroCarousel();
  // Ensure header auth state is refreshed after other inits
  // updateAuthHeader called from initHeaderFooter which already ran
});
