using System;
using System.Collections.Generic;
using System.Data.SqlClient;

// Repositorio que maneja todas las consultas a la BD relacionadas con servicios.
// Lee de ser.Servicios, que es la tabla del gimnasio creada en 016_Servicios.sql.
// Utiliza DbHelper para obtener la conexión configurada en web.config.
public static class RepositorioServicio
{
    // Consulta base compartida por listado y detalle.
    // REGLA: solo se devuelven servicios cuyo estado Activo = 1
    // y cuya categoría también esté activa.
    private const string SelectBase = @"
        SELECT
            s.IdServicio,
            s.Nombre,
            s.Descripcion,
            s.Precio,
            s.HorarioTexto,
            s.DuracionMinutos,
            s.ImagenRuta        AS ImagenPrincipal,
            s.OrdenCatalogo,
            c.Codigo            AS CategoriaCode,
            c.Nombre            AS NombreCategoria
        FROM ser.Servicios s
        INNER JOIN ser.CategoriasServicio c ON c.IdCategoria = s.IdCategoria
        WHERE s.Activo = 1
          AND c.Activo = 1";

    // Retorna todos los servicios activos del catálogo, en el orden definido.
    public static List<Servicio> ObtenerServiciosActivos()
    {
        var lista = new List<Servicio>();
        string sql = SelectBase + " ORDER BY s.OrdenCatalogo ASC, s.Nombre ASC;";

        using (var conn = DbHelper.GetConnection())
        {
            conn.Open();
            var cmd = new SqlCommand(sql, conn);

            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    lista.Add(Mapear(reader));
                }
            }
        }

        return lista;
    }

    // Retorna un servicio específico por su ID.
    // Devuelve null si no existe o no está activo.
    public static Servicio ObtenerServicioPorId(int id)
    {
        string sql = SelectBase + " AND s.IdServicio = @Id;";

        using (var conn = DbHelper.GetConnection())
        {
            conn.Open();
            var cmd = new SqlCommand(sql, conn);

            // Parámetro para evitar inyección SQL
            cmd.Parameters.AddWithValue("@Id", id);

            using (var reader = cmd.ExecuteReader())
            {
                if (!reader.Read()) return null;
                return Mapear(reader);
            }
        }
    }

    // Convierte la fila actual del lector en un objeto Servicio.
    // Los campos nullable (Precio, DuracionMinutos, ImagenPrincipal)
    // se verifican con DBNull antes de asignarlos.
    private static Servicio Mapear(SqlDataReader reader)
    {
        return new Servicio
        {
            IdProducto = (int)reader["IdServicio"],
            Nombre = reader["Nombre"].ToString(),
            Descripcion = reader["Descripcion"].ToString(),
            NombreCategoria = reader["NombreCategoria"].ToString(),
            CategoriaCode = reader["CategoriaCode"].ToString(),
            Horario = reader["HorarioTexto"] == DBNull.Value ? "" : reader["HorarioTexto"].ToString(),
            DuracionMinutos = reader["DuracionMinutos"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["DuracionMinutos"]),
            Precio = reader["Precio"] == DBNull.Value ? (decimal?)null : (decimal)reader["Precio"],
            ImagenPrincipal = reader["ImagenPrincipal"] == DBNull.Value ? "" : reader["ImagenPrincipal"].ToString(),
            OrdenCatalogo = (int)reader["OrdenCatalogo"]
        };
    }
}