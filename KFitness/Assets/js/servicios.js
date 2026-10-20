// servicios.js
// Maneja la carga dinámica de servicios desde la API y la interacción del usuario.
// Se comunica con /Api/servicios.ashx para obtener los datos de la base de datos.

document.addEventListener('DOMContentLoaded', function () {
    cargarServicios();
});

// Solicita todos los servicios activos a la API y los renderiza en la página
function cargarServicios() {
    fetch('/Api/servicios.ashx')
        .then(function (response) {
            return response.json();
        })
        .then(function (resultado) {
            if (!resultado.success) {
                mostrarError();
                return;
            }

            // La API devuelve los servicios en resultado.data
            var servicios = resultado.data;

            if (!servicios || servicios.length === 0) {
                // Si no hay servicios muestra el mensaje informativo
                document.getElementById('mensaje-sin-servicios').style.display = 'block';
                return;
            }

            // Genera los filtros de categorías dinámicamente
            generarFiltros(servicios);

            // Renderiza las tarjetas de servicios
            renderizarServicios(servicios);
        })
        .catch(function () {
            mostrarError();
        });
}

// Genera los botones de filtro por categoría a partir de los servicios recibidos.
// Evita categorías duplicadas usando un Set.
function generarFiltros(servicios) {
    var contenedor = document.getElementById('filtros-categorias');
    var categorias = new Set();

    servicios.forEach(function (s) {
        // Usa NombreCategoria para mostrar y CategoriaCode para filtrar
        categorias.add(JSON.stringify({ codigo: s.CategoriaCode, nombre: s.NombreCategoria }));
    });

    categorias.forEach(function (item) {
        var cat = JSON.parse(item);
        var btn = document.createElement('button');
        btn.className = 'boton boton-pequeno filtro';
        btn.setAttribute('data-filtro', cat.codigo);
        btn.textContent = cat.nombre;
        btn.addEventListener('click', function () {
            filtrarPor(cat.codigo);
            // Marca el botón activo y desmarca los demás
            document.querySelectorAll('.filtro').forEach(function (b) {
                b.classList.remove('activo');
            });
            btn.classList.add('activo');
        });
        contenedor.appendChild(btn);
    });

    // El botón "Todos" muestra todos los servicios al hacer clic
    document.querySelector('.filtro[data-filtro="todos"]').addEventListener('click', function () {
        filtrarPor('todos');
        document.querySelectorAll('.filtro').forEach(function (b) {
            b.classList.remove('activo');
        });
        this.classList.add('activo');
    });
}

// Renderiza las tarjetas de servicios en el contenedor principal
function renderizarServicios(servicios) {
    var lista = document.getElementById('lista-servicios');
    lista.innerHTML = '';

    servicios.forEach(function (s) {
        // Si el servicio tiene imagen la usa, de lo contrario usa una imagen por defecto
        var imagen = s.ImagenPrincipal && s.ImagenPrincipal !== ''
            ? '../' + s.ImagenPrincipal
            : '../Assets/img/hero-kfitness.png';

        // Si el precio existe lo formatea, si no muestra "Consultar"
        var precioTexto = s.Precio !== null && s.Precio !== undefined
            ? '₡' + parseFloat(s.Precio).toLocaleString('es-CR')
            : 'Consultar';

        // Si hay horario lo muestra, si no lo omite
        var horarioHtml = s.Horario && s.Horario !== ''
            ? '<p class="detalle"><strong>Horario:</strong> ' + s.Horario + '</p>'
            : '';

        var article = document.createElement('article');
        article.className = 'tarjeta servicio';
        // data-categoria usa el código (ej: "entrenamiento") para que el filtro funcione
        article.setAttribute('data-categoria', s.CategoriaCode);
        article.innerHTML =
            '<img class="servicio-imagen" src="' + imagen + '" alt="' + s.Nombre + '">' +
            '<h3>' + s.Nombre + '</h3>' +
            '<p>' + s.Descripcion + '</p>' +
            '<p class="detalle"><strong>Categoría:</strong> ' + s.NombreCategoria + '</p>' +
            horarioHtml +
            '<p class="detalle"><strong>Precio:</strong> ' + precioTexto + '</p>' +
            '<div class="acciones-tarjeta">' +
            // IdProducto es el id del servicio (mapeado desde IdServicio en la BD)
            '<button class="boton boton-secundario" onclick="verDetalle(' + s.IdProducto + ')">Ver detalles</button>' +
            '<a href="../Pages/reservas.html" class="boton boton-principal">Reservar</a>' +
            '</div>';

        lista.appendChild(article);
    });
}

// Filtra las tarjetas visibles según la categoría seleccionada
function filtrarPor(categoria) {
    var tarjetas = document.querySelectorAll('.tarjeta.servicio');
    tarjetas.forEach(function (t) {
        if (categoria === 'todos' || t.getAttribute('data-categoria') === categoria) {
            t.style.display = '';
        } else {
            t.style.display = 'none';
        }
    });
}

// Llama a la API para obtener el detalle de un servicio y abre el modal
function verDetalle(id) {
    fetch('/Api/servicios.ashx?accion=detalle&id=' + id)
        .then(function (response) {
            return response.json();
        })
        .then(function (resultado) {
            if (!resultado.success) {
                alert('No se pudo cargar el detalle del servicio.');
                return;
            }

            var s = resultado.data;

            // Imagen con prefijo de ruta relativa
            var imagen = s.ImagenPrincipal && s.ImagenPrincipal !== ''
                ? '../' + s.ImagenPrincipal
                : '../Assets/img/hero-kfitness.png';
            document.getElementById('modal-imagen').src = imagen;
            document.getElementById('modal-imagen').alt = s.Nombre;

            // Categoría (pastilla roja sobre la imagen)
            document.getElementById('modal-categoria').textContent = s.NombreCategoria;

            // Nombre y descripción
            document.getElementById('modal-nombre').textContent = s.Nombre;
            document.getElementById('modal-descripcion').textContent = s.Descripcion;

            // Horario: solo se muestra si existe
            var horarioContenedor = document.getElementById('modal-horario-contenedor');
            if (s.Horario && s.Horario !== '') {
                document.getElementById('modal-horario').textContent = s.Horario;
                horarioContenedor.style.display = 'flex';
            } else {
                horarioContenedor.style.display = 'none';
            }

            // Precio: muestra "Consultar" si viene null
            document.getElementById('modal-precio').textContent = s.Precio !== null && s.Precio !== undefined
                ? '₡' + parseFloat(s.Precio).toLocaleString('es-CR')
                : 'Consultar';

            // Abre el modal
            var modal = document.getElementById('modal-servicio');
            modal.style.display = 'flex';
        })
        .catch(function () {
            alert('Error al cargar el detalle del servicio.');
        });
}

// Cierra el modal de detalle del servicio
function cerrarModal() {
    document.getElementById('modal-servicio').style.display = 'none';
}

// Cierra el modal si el usuario hace clic fuera del contenido
document.getElementById('modal-servicio').addEventListener('click', function (e) {
    if (e.target === this) {
        cerrarModal();
    }
});

// Muestra el mensaje de error general ocultando el listado
function mostrarError() {
    document.getElementById('lista-servicios').style.display = 'none';
    document.getElementById('mensaje-error').style.display = 'block';
}