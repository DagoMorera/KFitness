using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;

public class AdminDashboardData
{
    public int? ClientesRegistrados { get; set; }
    public int? ReservasPendientes { get; set; }
    public int? ConsultasPendientes { get; set; }
    public int? RutinasActivas { get; set; }

    public bool TieneClientes { get; set; }
    public bool TieneReservas { get; set; }
    public bool TieneConsultas { get; set; }
    public bool TieneRutinas { get; set; }
}

public class AdminResumenUsuarios
{
    public int UsuariosTotales { get; set; }
    public int UsuariosActivos { get; set; }
    public int Administradores { get; set; }
    public int Clientes { get; set; }
    public int Operadores { get; set; }
}

public class AdminUsuarioListadoItem
{
    public int IdUsuario { get; set; }
    public string NombreCompleto { get; set; }
    public string Correo { get; set; }
    public string Rol { get; set; }
    public bool Activo { get; set; }
}

public class AdminUsuarioDetalle
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; }
    public string Apellido1 { get; set; }
    public string Apellido2 { get; set; }
    public string NombreCompleto { get; set; }
    public string Correo { get; set; }
    public string Rol { get; set; }
    public int IdRol { get; set; }
    public bool Activo { get; set; }
    public string Telefono { get; set; }
}

public class AdminRolItem
{
    public int IdRol { get; set; }
    public string Nombre { get; set; }
}

public class AdminUsuariosPaginados
{
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalRegistros { get; set; }
    public List<AdminUsuarioListadoItem> Usuarios { get; set; }
}

public static class RepositorioAdmin
{
    public static AdminDashboardData ObtenerDashboard()
    {
        AdminDashboardData data = new AdminDashboardData();

        data.TieneClientes = ExisteTabla("cli", "Clientes");
        data.TieneReservas = ExisteTabla("res", "Reservas");
        data.TieneConsultas = ExisteTabla("con", "Consultas");
        data.TieneRutinas = ExisteTabla("rut", "Rutinas");

        data.ClientesRegistrados = data.TieneClientes ? ContarClientesRegistrados() : (int?)null;
        data.ReservasPendientes = data.TieneReservas ? ContarReservasPendientes() : (int?)null;
        data.ConsultasPendientes = data.TieneConsultas ? ContarConsultasPendientes() : (int?)null;
        data.RutinasActivas = data.TieneRutinas ? ContarRutinasActivas() : (int?)null;

        return data;
    }

    public static AdminResumenUsuarios ObtenerResumenUsuarios()
    {
        const string sql = @"
SELECT
    COUNT(1) AS UsuariosTotales,
    SUM(CASE WHEN u.Activo = 1 THEN 1 ELSE 0 END) AS UsuariosActivos,
    SUM(CASE WHEN r.Nombre = N'Administrador' THEN 1 ELSE 0 END) AS Administradores,
    SUM(CASE WHEN r.Nombre = N'Cliente' THEN 1 ELSE 0 END) AS Clientes,
    SUM(CASE WHEN r.Nombre = N'Operador' THEN 1 ELSE 0 END) AS Operadores
FROM seg.Usuarios u
INNER JOIN seg.Roles r ON r.IdRol = u.IdRol;";

        AdminResumenUsuarios resumen = new AdminResumenUsuarios();

        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                if (reader.Read())
                {
                    resumen.UsuariosTotales = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader.GetValue(0));
                    resumen.UsuariosActivos = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader.GetValue(1));
                    resumen.Administradores = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader.GetValue(2));
                    resumen.Clientes = reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader.GetValue(3));
                    resumen.Operadores = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader.GetValue(4));
                }
            }
        }

        return resumen;
    }

    public static AdminUsuariosPaginados ObtenerUsuarios(string busqueda, int pagina, int tamanoPagina)
    {
        if (pagina < 1) pagina = 1;
        if (tamanoPagina < 1) tamanoPagina = 10;
        if (tamanoPagina > 50) tamanoPagina = 50;

        string filtro = string.IsNullOrWhiteSpace(busqueda) ? null : busqueda.Trim();
        int inicio = ((pagina - 1) * tamanoPagina) + 1;
        int fin = pagina * tamanoPagina;

        const string sqlCount = @"
SELECT COUNT(1)
FROM seg.Usuarios u
INNER JOIN seg.Roles r ON r.IdRol = u.IdRol
WHERE (@q IS NULL
       OR u.Correo LIKE '%' + @q + '%'
       OR u.Nombre LIKE '%' + @q + '%'
       OR u.Apellido1 LIKE '%' + @q + '%'
       OR ISNULL(u.Apellido2, N'') LIKE '%' + @q + '%');";

        const string sqlPage = @"
;WITH datos AS
(
    SELECT
        u.IdUsuario,
        u.Nombre,
        u.Apellido1,
        u.Apellido2,
        u.Correo,
        u.Activo,
        r.Nombre AS Rol,
        ROW_NUMBER() OVER (ORDER BY u.Nombre, u.Apellido1, u.IdUsuario) AS rn
    FROM seg.Usuarios u
    INNER JOIN seg.Roles r ON r.IdRol = u.IdRol
    WHERE (@q IS NULL
           OR u.Correo LIKE '%' + @q + '%'
           OR u.Nombre LIKE '%' + @q + '%'
           OR u.Apellido1 LIKE '%' + @q + '%'
           OR ISNULL(u.Apellido2, N'') LIKE '%' + @q + '%')
)
SELECT IdUsuario, Nombre, Apellido1, Apellido2, Correo, Activo, Rol
FROM datos
WHERE rn BETWEEN @inicio AND @fin
ORDER BY rn;";

        AdminUsuariosPaginados resultado = new AdminUsuariosPaginados();
        resultado.Pagina = pagina;
        resultado.TamanoPagina = tamanoPagina;
        resultado.TotalRegistros = 0;
        resultado.Usuarios = new List<AdminUsuarioListadoItem>();

        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmdCount = new SqlCommand(sqlCount, conn))
        using (SqlCommand cmdPage = new SqlCommand(sqlPage, conn))
        {
            cmdCount.Parameters.AddWithValue("@q", (object)filtro ?? DBNull.Value);
            cmdPage.Parameters.AddWithValue("@q", (object)filtro ?? DBNull.Value);
            cmdPage.Parameters.AddWithValue("@inicio", inicio);
            cmdPage.Parameters.AddWithValue("@fin", fin);

            conn.Open();
            resultado.TotalRegistros = Convert.ToInt32(cmdCount.ExecuteScalar());

            using (SqlDataReader reader = cmdPage.ExecuteReader())
            {
                while (reader.Read())
                {
                    string nombre = reader.IsDBNull(reader.GetOrdinal("Nombre")) ? string.Empty : reader.GetString(reader.GetOrdinal("Nombre"));
                    string apellido1 = reader.IsDBNull(reader.GetOrdinal("Apellido1")) ? string.Empty : reader.GetString(reader.GetOrdinal("Apellido1"));
                    string apellido2 = reader.IsDBNull(reader.GetOrdinal("Apellido2")) ? string.Empty : reader.GetString(reader.GetOrdinal("Apellido2"));

                    AdminUsuarioListadoItem item = new AdminUsuarioListadoItem();
                    item.IdUsuario = reader.GetInt32(reader.GetOrdinal("IdUsuario"));
                    item.Correo = reader.GetString(reader.GetOrdinal("Correo"));
                    item.Rol = reader.GetString(reader.GetOrdinal("Rol"));
                    item.Activo = reader.GetBoolean(reader.GetOrdinal("Activo"));
                    item.NombreCompleto = ConstruirNombreCompleto(nombre, apellido1, apellido2);
                    resultado.Usuarios.Add(item);
                }
            }
        }

        return resultado;
    }

    public static AdminUsuarioDetalle ObtenerUsuarioDetalle(int idUsuario)
    {
        const string sql = @"
SELECT
    u.IdUsuario,
    u.Nombre,
    u.Apellido1,
    u.Apellido2,
    u.Correo,
    u.Telefono,
    u.Activo,
    u.IdRol,
    r.Nombre AS Rol
FROM seg.Usuarios u
INNER JOIN seg.Roles r ON r.IdRol = u.IdRol
WHERE u.IdUsuario = @idUsuario;";

        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@idUsuario", idUsuario);
            conn.Open();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                if (!reader.Read()) return null;

                AdminUsuarioDetalle item = new AdminUsuarioDetalle();
                item.IdUsuario = reader.GetInt32(reader.GetOrdinal("IdUsuario"));
                item.Nombre = reader.GetString(reader.GetOrdinal("Nombre"));
                item.Apellido1 = reader.GetString(reader.GetOrdinal("Apellido1"));
                item.Apellido2 = reader.IsDBNull(reader.GetOrdinal("Apellido2")) ? null : reader.GetString(reader.GetOrdinal("Apellido2"));
                item.Correo = reader.GetString(reader.GetOrdinal("Correo"));
                item.Telefono = reader.IsDBNull(reader.GetOrdinal("Telefono")) ? null : reader.GetString(reader.GetOrdinal("Telefono"));
                item.Activo = reader.GetBoolean(reader.GetOrdinal("Activo"));
                item.IdRol = reader.GetInt32(reader.GetOrdinal("IdRol"));
                item.Rol = reader.GetString(reader.GetOrdinal("Rol"));
                item.NombreCompleto = ConstruirNombreCompleto(item.Nombre, item.Apellido1, item.Apellido2);
                return item;
            }
        }
    }

    public static List<AdminRolItem> ObtenerRolesActivos()
    {
        const string sql = @"
SELECT IdRol, Nombre
FROM seg.Roles
WHERE Activo = 1
ORDER BY Nombre;";

        List<AdminRolItem> roles = new List<AdminRolItem>();

        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    AdminRolItem rol = new AdminRolItem();
                    rol.IdRol = reader.GetInt32(reader.GetOrdinal("IdRol"));
                    rol.Nombre = reader.GetString(reader.GetOrdinal("Nombre"));
                    roles.Add(rol);
                }
            }
        }

        return roles;
    }


    public static bool CambiarRolUsuario(int idUsuarioActor, int idUsuarioObjetivo, int idRolNuevo, out string codigoError)
    {
        codigoError = null;

        const string sqlObjetivo = @"
SELECT u.IdUsuario, u.IdRol, r.Nombre AS Rol
FROM seg.Usuarios u
INNER JOIN seg.Roles r ON r.IdRol = u.IdRol
WHERE u.IdUsuario = @idUsuario;";

        const string sqlRolNuevo = @"
SELECT IdRol FROM seg.Roles WHERE IdRol = @idRol AND Activo = 1;";

        const string sqlRolAdmin = @"
SELECT TOP 1 IdRol FROM seg.Roles WHERE Nombre = N'Administrador';";

        const string sqlUpdate = @"
UPDATE seg.Usuarios
SET IdRol = @idRolNuevo,
    FechaModificacion = SYSDATETIME(),
    ModificadoPor = @idActor
WHERE IdUsuario = @idUsuarioObjetivo;";

        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmdObjetivo = new SqlCommand(sqlObjetivo, conn))
        using (SqlCommand cmdRolNuevo = new SqlCommand(sqlRolNuevo, conn))
        using (SqlCommand cmdRolAdmin = new SqlCommand(sqlRolAdmin, conn))
        using (SqlCommand cmdUpdate = new SqlCommand(sqlUpdate, conn))
        {
            cmdObjetivo.Parameters.AddWithValue("@idUsuario", idUsuarioObjetivo);
            cmdRolNuevo.Parameters.AddWithValue("@idRol", idRolNuevo);
            cmdUpdate.Parameters.AddWithValue("@idRolNuevo", idRolNuevo);
            cmdUpdate.Parameters.AddWithValue("@idActor", idUsuarioActor);
            cmdUpdate.Parameters.AddWithValue("@idUsuarioObjetivo", idUsuarioObjetivo);

            conn.Open();

            int? idRolActual = null;
            string rolActual = null;

            using (SqlDataReader reader = cmdObjetivo.ExecuteReader())
            {
                if (!reader.Read())
                {
                    codigoError = "USUARIO_NO_EXISTE";
                    return false;
                }

                idRolActual = reader.GetInt32(reader.GetOrdinal("IdRol"));
                rolActual = reader.GetString(reader.GetOrdinal("Rol"));
            }

            object rolValido = cmdRolNuevo.ExecuteScalar();
            if (rolValido == null || rolValido == DBNull.Value)
            {
                codigoError = "ROL_INVALIDO";
                return false;
            }

            if (idRolActual.HasValue && idRolActual.Value == idRolNuevo)
            {
                return true;
            }

            object rolAdminValue = cmdRolAdmin.ExecuteScalar();
            int idRolAdmin = rolAdminValue == null || rolAdminValue == DBNull.Value ? -1 : Convert.ToInt32(rolAdminValue);

            bool esAutoEdicion = idUsuarioActor == idUsuarioObjetivo;
            bool esAdminActual = string.Equals(rolActual, "Administrador", StringComparison.OrdinalIgnoreCase);
            bool intentaSalirDeAdmin = idRolNuevo != idRolAdmin;

            if (esAutoEdicion && esAdminActual && intentaSalirDeAdmin)
            {
                codigoError = "AUTO_REVOKE_NO_PERMITIDO";
                return false;
            }

            int filas = cmdUpdate.ExecuteNonQuery();
            if (filas <= 0)
            {
                codigoError = "NO_ACTUALIZADO";
                return false;
            }

            return true;
        }
    }

    public static bool ExisteIdentificacionEnClientes()
    {
        const string sql = @"
SELECT COUNT(1)
FROM sys.columns c
INNER JOIN sys.tables t ON t.object_id = c.object_id
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = N'cli'
  AND t.name = N'Clientes'
  AND c.name IN (N'Identificacion', N'Cedula', N'NumeroIdentificacion');";

        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            conn.Open();
            int count = Convert.ToInt32(cmd.ExecuteScalar());
            return count > 0;
        }
    }

    private static string ConstruirNombreCompleto(string nombre, string apellido1, string apellido2)
    {
        string n = string.IsNullOrWhiteSpace(nombre) ? string.Empty : nombre.Trim();
        string a1 = string.IsNullOrWhiteSpace(apellido1) ? string.Empty : apellido1.Trim();
        string a2 = string.IsNullOrWhiteSpace(apellido2) ? string.Empty : apellido2.Trim();
        return (n + " " + a1 + " " + a2).Trim();
    }

    private static bool ExisteTabla(string esquema, string tabla)
    {
        const string sql = "SELECT COUNT(1) FROM sys.tables t INNER JOIN sys.schemas s ON s.schema_id = t.schema_id WHERE s.name = @esquema AND t.name = @tabla";
        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@esquema", esquema);
            cmd.Parameters.AddWithValue("@tabla", tabla);
            conn.Open();
            int count = Convert.ToInt32(cmd.ExecuteScalar());
            return count > 0;
        }
    }

    private static int ContarClientesRegistrados()
    {
        const string sql = "SELECT COUNT(1) FROM cli.Clientes c INNER JOIN seg.Usuarios u ON u.IdUsuario = c.IdUsuario WHERE c.Activo = 1 AND u.Activo = 1";
        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            conn.Open();
            return Convert.ToInt32(cmd.ExecuteScalar());
        }
    }

    private static int ContarReservasPendientes()
    {
        const string sql = "SELECT COUNT(1) FROM res.Reservas WHERE Estado = @estado";
        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@estado", "Pendiente");
            conn.Open();
            return Convert.ToInt32(cmd.ExecuteScalar());
        }
    }

    private static int ContarConsultasPendientes()
    {
        const string sql = "SELECT COUNT(1) FROM con.Consultas WHERE Estado = @estado";
        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@estado", "Pendiente");
            conn.Open();
            return Convert.ToInt32(cmd.ExecuteScalar());
        }
    }

    private static int ContarRutinasActivas()
    {
        const string sql = "SELECT COUNT(1) FROM rut.Rutinas WHERE Activa = 1";
        using (SqlConnection conn = DbHelper.GetConnection())
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            conn.Open();
            return Convert.ToInt32(cmd.ExecuteScalar());
        }
    }
}
