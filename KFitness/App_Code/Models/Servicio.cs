using System;

// Modelo que representa un servicio del catálogo de KFitness.
// Se mapea desde ser.Servicios y ser.CategoriasServicio.
public class Servicio
{
    public int IdProducto { get; set; }          // Identificador único (IdServicio en la BD)
    public string Nombre { get; set; }            // Nombre del servicio
    public string Descripcion { get; set; }       // Descripción del servicio
    public decimal? Precio { get; set; }          // Precio (nullable: puede no estar definido aún)
    public string NombreCategoria { get; set; }   // Nombre de la categoría (ej: "Entrenamiento")
    public string CategoriaCode { get; set; }     // Código de la categoría (ej: "entrenamiento"), lo usan los filtros
    public string Horario { get; set; }           // Texto del horario (ej: "Lunes a viernes, 08:00 - 10:00")
    public int? DuracionMinutos { get; set; }     // Duración en minutos (nullable: puede no estar definido)
    public string ImagenPrincipal { get; set; }   // Ruta de la imagen (ej: "img/servicio-clases.png")
    public int OrdenCatalogo { get; set; }        // Orden de aparición en el catálogo
}