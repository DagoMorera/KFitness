<%@ WebHandler Language="C#" Class="ProfileHandler" %>
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Web;
using System.Web.Script.Serialization;

public class ProfileResponse
{
    public bool success { get; set; }
    public string message { get; set; }
    public string nombre { get; set; }
    public string apellido1 { get; set; }
    public string apellido2 { get; set; }
    public string correo { get; set; }
    public string telefono { get; set; }
    public string rol { get; set; }
    public string fotoUrl { get; set; }
}

public class ProfileHandler : IHttpHandler
{
    private const int MaxPhotoBytes = 5 * 1024 * 1024;

    public bool IsReusable
    {
        get { return false; }
    }

    public void ProcessRequest(HttpContext context)
    {
        context.Response.ContentType = "application/json";
        var js = new JavaScriptSerializer();

        try
        {
            if (context.User == null || context.User.Identity == null || !context.User.Identity.IsAuthenticated)
            {
                context.Response.SuppressFormsAuthenticationRedirect = true;
                context.Response.StatusCode = 401;
                EscribirJson(context, js, new ProfileResponse { success = false, message = "No autorizado." });
                return;
            }

            var correo = context.User.Identity.Name;
            if (string.IsNullOrWhiteSpace(correo))
            {
                context.Response.SuppressFormsAuthenticationRedirect = true;
                context.Response.StatusCode = 401;
                EscribirJson(context, js, new ProfileResponse { success = false, message = "No autorizado." });
                return;
            }

            if (string.Equals(context.Request.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase))
            {
                var action = Convert.ToString(context.Request["action"]);
                if (string.Equals(action, "uploadPhoto", StringComparison.OrdinalIgnoreCase))
                {
                    ProcesarSubidaFoto(context, js, correo);
                    return;
                }
                if (string.Equals(action, "deletePhoto", StringComparison.OrdinalIgnoreCase))
                {
                    ProcesarEliminarFoto(context, js, correo);
                    return;
                }

                ProcesarActualizacionPerfil(context, js, correo);
                return;
            }

            if (!string.Equals(context.Request.HttpMethod, "GET", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 405;
                EscribirJson(context, js, new ProfileResponse { success = false, message = "Método no permitido." });
                return;
            }

            var usuario = RepositorioUsuario.ObtenerPorCorreo(correo);
            if (usuario == null)
            {
                context.Response.StatusCode = 404;
                EscribirJson(context, js, new ProfileResponse { success = false, message = "Usuario no encontrado." });
                return;
            }

            var rolNombre = RepositorioUsuario.ObtenerNombreRolPorId(usuario.IdRol);
            var fotoUrl = string.IsNullOrWhiteSpace(usuario.FotoPerfil)
                ? null
                : "/api/profile-photo.ashx?v=" + HttpUtility.UrlEncode(usuario.FotoPerfil);

            var resp = new ProfileResponse
            {
                success = true,
                nombre = usuario.Nombre,
                apellido1 = usuario.Apellido1,
                apellido2 = usuario.Apellido2,
                correo = usuario.Correo,
                telefono = usuario.Telefono,
                rol = rolNombre,
                fotoUrl = fotoUrl
            };

            EscribirJson(context, js, resp);
        }
        catch (Exception)
        {
            context.Response.StatusCode = 500;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Error del servidor." });
        }
    }

    private static void ProcesarActualizacionPerfil(HttpContext context, JavaScriptSerializer js, string correo)
    {
        var body = new StreamReader(context.Request.InputStream).ReadToEnd();
        Dictionary<string, object> req = null;
        try
        {
            req = js.DeserializeObject(body) as Dictionary<string, object>;
        }
        catch
        {
            req = null;
        }

        if (req == null)
        {
            context.Response.StatusCode = 400;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Datos inválidos." });
            return;
        }

        string nombre = req.ContainsKey("nombre") ? Convert.ToString(req["nombre"]) : "";
        string apellido1 = req.ContainsKey("apellido1") ? Convert.ToString(req["apellido1"]) : "";
        string apellido2 = req.ContainsKey("apellido2") ? Convert.ToString(req["apellido2"]) : null;
        string telefono = req.ContainsKey("telefono") ? Convert.ToString(req["telefono"]) : null;

        nombre = nombre != null ? nombre.Trim() : null;
        apellido1 = apellido1 != null ? apellido1.Trim() : null;
        apellido2 = apellido2 != null ? apellido2.Trim() : null;
        telefono = telefono != null ? telefono.Trim() : null;

        if (string.IsNullOrWhiteSpace(nombre))
        {
            context.Response.StatusCode = 400;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Nombre es obligatorio." });
            return;
        }
        if (string.IsNullOrWhiteSpace(apellido1))
        {
            context.Response.StatusCode = 400;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Primer apellido es obligatorio." });
            return;
        }
        if (nombre.Length > 100 || apellido1.Length > 100 || (apellido2 != null && apellido2.Length > 100) || (telefono != null && telefono.Length > 30))
        {
            context.Response.StatusCode = 400;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Uno o más campos exceden la longitud permitida." });
            return;
        }

        var ok = RepositorioUsuario.ActualizarPerfil(correo, nombre, apellido1, apellido2, telefono);
        if (!ok)
        {
            context.Response.StatusCode = 404;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Usuario no encontrado." });
            return;
        }

        EscribirJson(context, js, new ProfileResponse { success = true, message = "Perfil actualizado correctamente." });
    }

    private static void ProcesarSubidaFoto(HttpContext context, JavaScriptSerializer js, string correo)
    {
        var archivo = context.Request.Files["foto"];
        if (archivo == null || archivo.ContentLength <= 0)
        {
            context.Response.StatusCode = 400;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Debe seleccionar una imagen válida." });
            return;
        }

        if (archivo.ContentLength > MaxPhotoBytes)
        {
            context.Response.StatusCode = 413;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "La imagen supera el tamaño máximo permitido (5 MB)." });
            return;
        }

        var extension = Path.GetExtension(archivo.FileName);
        var extensionNormalizada = NormalizarExtension(extension);
        if (extensionNormalizada == null)
        {
            context.Response.StatusCode = 400;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Formato no permitido. Use JPEG o PNG." });
            return;
        }

        var mime = (archivo.ContentType ?? string.Empty).Trim().ToLowerInvariant();
        if (mime != "image/jpeg" && mime != "image/png")
        {
            context.Response.StatusCode = 400;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Tipo MIME no permitido. Use JPEG o PNG." });
            return;
        }

        byte[] contenido;
        using (var ms = new MemoryStream())
        {
            archivo.InputStream.CopyTo(ms);
            contenido = ms.ToArray();
        }

        if (!ContenidoCoincideConFormato(contenido, extensionNormalizada))
        {
            context.Response.StatusCode = 400;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "El archivo no corresponde a una imagen JPEG o PNG válida." });
            return;
        }

        var carpeta = context.Server.MapPath("~/App_Data/ProfilePhotos");
        Directory.CreateDirectory(carpeta);

        var nuevoNombre = Guid.NewGuid().ToString("N") + extensionNormalizada;
        var nuevaRuta = Path.Combine(carpeta, nuevoNombre);
        var fotoAnterior = RepositorioUsuario.ObtenerFotoPerfilPorCorreo(correo);

        try
        {
            File.WriteAllBytes(nuevaRuta, contenido);
            var actualizado = RepositorioUsuario.ActualizarFotoPerfilPorCorreo(correo, nuevoNombre);
            if (!actualizado)
            {
                if (File.Exists(nuevaRuta)) File.Delete(nuevaRuta);
                context.Response.StatusCode = 404;
                EscribirJson(context, js, new ProfileResponse { success = false, message = "Usuario no encontrado." });
                return;
            }

            EliminarArchivoSeguroDelUsuario(carpeta, fotoAnterior, nuevoNombre);

            EscribirJson(context, js, new ProfileResponse
            {
                success = true,
                message = "Foto de perfil actualizada correctamente.",
                fotoUrl = "/api/profile-photo.ashx?v=" + HttpUtility.UrlEncode(nuevoNombre)
            });
        }
        catch
        {
            if (File.Exists(nuevaRuta)) File.Delete(nuevaRuta);
            context.Response.StatusCode = 500;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "No fue posible guardar la foto de perfil." });
        }
    }

    private static void ProcesarEliminarFoto(HttpContext context, JavaScriptSerializer js, string correo)
    {
        var fotoAnterior = RepositorioUsuario.ObtenerFotoPerfilPorCorreo(correo);
        var actualizado = RepositorioUsuario.ActualizarFotoPerfilPorCorreo(correo, null);
        if (!actualizado)
        {
            context.Response.StatusCode = 404;
            EscribirJson(context, js, new ProfileResponse { success = false, message = "Usuario no encontrado." });
            return;
        }

        var carpeta = context.Server.MapPath("~/App_Data/ProfilePhotos");
        EliminarArchivoSeguroDelUsuario(carpeta, fotoAnterior, null);

        EscribirJson(context, js, new ProfileResponse
        {
            success = true,
            message = "Foto de perfil eliminada correctamente.",
            fotoUrl = null
        });
    }

    private static void EliminarArchivoSeguroDelUsuario(string carpeta, string referencia, string nombreExcluido)
    {
        if (string.IsNullOrWhiteSpace(referencia)) return;

        var nombre = Path.GetFileName(referencia);
        if (!string.Equals(nombre, referencia, StringComparison.Ordinal)) return;
        if (!string.IsNullOrWhiteSpace(nombreExcluido) && string.Equals(nombre, nombreExcluido, StringComparison.OrdinalIgnoreCase)) return;

        var ruta = Path.Combine(carpeta, nombre);
        if (File.Exists(ruta))
        {
            File.Delete(ruta);
        }
    }

    private static string NormalizarExtension(string extension)
    {
        if (string.IsNullOrWhiteSpace(extension)) return null;

        extension = extension.Trim().ToLowerInvariant();
        if (extension == ".jpg" || extension == ".jpeg") return ".jpg";
        if (extension == ".png") return ".png";
        return null;
    }

    private static bool ContenidoCoincideConFormato(byte[] contenido, string extensionNormalizada)
    {
        if (contenido == null || contenido.Length < 4) return false;

        var firmaJpg = contenido[0] == 0xFF && contenido[1] == 0xD8;
        var firmaPng = contenido[0] == 0x89 && contenido[1] == 0x50 && contenido[2] == 0x4E && contenido[3] == 0x47;

        if (extensionNormalizada == ".jpg" && !firmaJpg) return false;
        if (extensionNormalizada == ".png" && !firmaPng) return false;

        try
        {
            using (var ms = new MemoryStream(contenido))
            using (var img = Image.FromStream(ms, true, true))
            {
                return img.Width > 0 && img.Height > 0;
            }
        }
        catch
        {
            return false;
        }
    }

    private static void EscribirJson(HttpContext context, JavaScriptSerializer js, ProfileResponse payload)
    {
        context.Response.ContentType = "application/json";
        context.Response.Write(js.Serialize(payload));
    }
}
