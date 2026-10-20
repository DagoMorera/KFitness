using System;
using System.Data;
using System.Data.SqlClient;

public static class RepositorioUsuario
{
    public static bool ExistePorCorreo(string correo)
    {
        const string sql = "SELECT COUNT(1) FROM seg.Usuarios WHERE Correo = @correo";
        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@correo", correo);
            conn.Open();
            var count = (int)cmd.ExecuteScalar();
            return count > 0;
        }
    }

    public static Usuario ObtenerPorCorreo(string correo)
    {
        const string sql = "SELECT IdUsuario, Correo, ClaveHash, IdRol, Nombre, Apellido1, Apellido2, Telefono, FotoPerfil, Activo, IntentosFallidos, BloqueadoHasta, UltimoAcceso FROM seg.Usuarios WHERE Correo = @correo";
        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@correo", correo);
            conn.Open();
            using (var reader = cmd.ExecuteReader())
            {
                if (!reader.Read()) return null;
                var u = new Usuario();
                u.IdUsuario = reader.GetInt32(reader.GetOrdinal("IdUsuario"));
                u.Correo = reader.GetString(reader.GetOrdinal("Correo"));
                u.ClaveHash = reader.GetString(reader.GetOrdinal("ClaveHash"));
                u.IdRol = reader.GetInt32(reader.GetOrdinal("IdRol"));
                u.Nombre = reader.GetString(reader.GetOrdinal("Nombre"));
                u.Apellido1 = reader.GetString(reader.GetOrdinal("Apellido1"));
                int idx = reader.GetOrdinal("Apellido2");
                if (!reader.IsDBNull(idx)) u.Apellido2 = reader.GetString(idx);
                idx = reader.GetOrdinal("Telefono");
                if (!reader.IsDBNull(idx)) u.Telefono = reader.GetString(idx);
                idx = reader.GetOrdinal("FotoPerfil");
                if (!reader.IsDBNull(idx)) u.FotoPerfil = reader.GetString(idx);
                u.Activo = reader.GetBoolean(reader.GetOrdinal("Activo"));
                u.IntentosFallidos = reader.GetInt32(reader.GetOrdinal("IntentosFallidos"));
                idx = reader.GetOrdinal("BloqueadoHasta");
                if (!reader.IsDBNull(idx)) u.BloqueadoHasta = reader.GetDateTime(idx);
                idx = reader.GetOrdinal("UltimoAcceso");
                if (!reader.IsDBNull(idx)) u.UltimoAcceso = reader.GetDateTime(idx);
                return u;
            }
        }
    }

    public static string ObtenerNombreRolPorId(int idRol)
    {
        const string sql = "SELECT Nombre FROM seg.Roles WHERE IdRol = @idRol";
        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@idRol", idRol);
            conn.Open();
            var result = cmd.ExecuteScalar();
            if (result == null || result == DBNull.Value) return null;
            return Convert.ToString(result);
        }
    }

    public static void UpdateUltimoAcceso(int idUsuario)
    {
        const string sql = "UPDATE seg.Usuarios SET UltimoAcceso = SYSDATETIME() WHERE IdUsuario = @idUsuario";
        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@idUsuario", idUsuario);
            conn.Open();
            cmd.ExecuteNonQuery();
        }
    }
    public static int? ObtenerIdRolPorNombre(string nombreRol)
    {
        const string sql = "SELECT IdRol FROM seg.Roles WHERE Nombre = @nombre";
        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@nombre", nombreRol);
            conn.Open();
            var result = cmd.ExecuteScalar();
            if (result == null || result == DBNull.Value) return null;
            return Convert.ToInt32(result);
        }
    }

    public static int CrearUsuario(Usuario u)
    {
        const string sql = @"
INSERT INTO seg.Usuarios (Correo, ClaveHash, IdRol, Nombre, Apellido1, Apellido2, Telefono)
VALUES (@Correo, @ClaveHash, @IdRol, @Nombre, @Apellido1, @Apellido2, @Telefono);
SELECT SCOPE_IDENTITY();
";
        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@Correo", u.Correo);
            cmd.Parameters.AddWithValue("@ClaveHash", u.ClaveHash);
            cmd.Parameters.AddWithValue("@IdRol", u.IdRol);
            cmd.Parameters.AddWithValue("@Nombre", u.Nombre);
            cmd.Parameters.AddWithValue("@Apellido1", u.Apellido1);
            cmd.Parameters.AddWithValue("@Apellido2", (object)u.Apellido2 ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Telefono", (object)u.Telefono ?? DBNull.Value);
            conn.Open();
            var scalar = cmd.ExecuteScalar();
            return Convert.ToInt32(scalar);
        }
    }

    public static bool ActualizarPerfil(string correo, string nombre, string apellido1, string apellido2, string telefono)
    {
        const string sql = @"
UPDATE seg.Usuarios
SET Nombre = @Nombre,
    Apellido1 = @Apellido1,
    Apellido2 = @Apellido2,
    Telefono = @Telefono
WHERE Correo = @Correo";

        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@Nombre", nombre);
            cmd.Parameters.AddWithValue("@Apellido1", apellido1);
            cmd.Parameters.AddWithValue("@Apellido2", (object)apellido2 ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Telefono", (object)telefono ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Correo", correo);
            conn.Open();
            var rows = cmd.ExecuteNonQuery();
            return rows > 0;
        }
    }

    public static bool ActualizarClavePorCorreo(string correo, string nuevoHash)
    {
        const string sql = @"
UPDATE seg.Usuarios
SET ClaveHash = @ClaveHash
WHERE Correo = @Correo";

        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@ClaveHash", nuevoHash);
            cmd.Parameters.AddWithValue("@Correo", correo);
            conn.Open();
            var rows = cmd.ExecuteNonQuery();
            return rows > 0;
        }
    }

    public static string ObtenerFotoPerfilPorCorreo(string correo)
    {
        const string sql = "SELECT FotoPerfil FROM seg.Usuarios WHERE Correo = @Correo";
        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@Correo", correo);
            conn.Open();
            var result = cmd.ExecuteScalar();
            if (result == null || result == DBNull.Value) return null;
            return Convert.ToString(result);
        }
    }

    public static bool ActualizarFotoPerfilPorCorreo(string correo, string fotoPerfil)
    {
        const string sql = @"
UPDATE seg.Usuarios
SET FotoPerfil = @FotoPerfil
WHERE Correo = @Correo";

        using (var conn = DbHelper.GetConnection())
        using (var cmd = new SqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@FotoPerfil", (object)fotoPerfil ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Correo", correo);
            conn.Open();
            var rows = cmd.ExecuteNonQuery();
            return rows > 0;
        }
    }
}
