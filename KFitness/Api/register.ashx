<%@ WebHandler Language="C#" Class="RegisterHandler" %>
using System;
using System.IO;
using System.Web;
using System.Web.Script.Serialization;

public class RegisterRequest
{
    public string nombre { get; set; }
    public string apellido1 { get; set; }
    public string apellido2 { get; set; }
    public string correo { get; set; }
    public string telefono { get; set; }
    public string nacimiento { get; set; }
    public string password { get; set; }
}

public class JsonResponse
{
    public bool success { get; set; }
    public string message { get; set; }
}

public class RegisterHandler : IHttpHandler
{
    public bool IsReusable
    {
        get { return false; }
    }

    public void ProcessRequest(HttpContext context)
    {
        context.Response.ContentType = "application/json";
        try
        {
            string body;
            using (var reader = new StreamReader(context.Request.InputStream)) body = reader.ReadToEnd();

            var js = new JavaScriptSerializer();
            var req = js.Deserialize<RegisterRequest>(body);

            if (req == null)
            {
                context.Response.Write(js.Serialize(new JsonResponse { success = false, message = "Solicitud inválida." }));
                return;
            }

            // Validaciones servidor mínimas
            if (string.IsNullOrWhiteSpace(req.nombre) || string.IsNullOrWhiteSpace(req.apellido1) || string.IsNullOrWhiteSpace(req.correo) || string.IsNullOrWhiteSpace(req.password))
            {
                context.Response.Write(js.Serialize(new JsonResponse { success = false, message = "Faltan campos obligatorios." }));
                return;
            }

            var correo = req.correo.Trim().ToLowerInvariant();

            // Verificar si existe correo
            if (RepositorioUsuario.ExistePorCorreo(correo))
            {
                context.Response.Write(js.Serialize(new JsonResponse { success = false, message = "El correo ya está asociado a una cuenta." }));
                return;
            }

            // Obtener IdRol de Cliente
            var idRol = RepositorioUsuario.ObtenerIdRolPorNombre("Cliente");
            if (!idRol.HasValue)
            {
                context.Response.Write(js.Serialize(new JsonResponse { success = false, message = "Rol por defecto no configurado en el sistema." }));
                return;
            }

            // Hashear contraseña
            var hash = PasswordHasher.HashPassword(req.password);

            var usuario = new Usuario
            {
                Correo = correo,
                ClaveHash = hash,
                IdRol = idRol.Value,
                Nombre = req.nombre.Trim(),
                Apellido1 = req.apellido1.Trim(),
                Apellido2 = string.IsNullOrWhiteSpace(req.apellido2) ? null : req.apellido2.Trim(),
                Telefono = string.IsNullOrWhiteSpace(req.telefono) ? null : req.telefono.Trim()
            };

            var newId = RepositorioUsuario.CrearUsuario(usuario);
            if (newId > 0)
            {
                context.Response.Write(js.Serialize(new JsonResponse { success = true, message = "Registro exitoso." }));
                return;
            }

            context.Response.Write(js.Serialize(new JsonResponse { success = false, message = "No se pudo crear el usuario." }));
        }
        catch (Exception ex)
        {
            // No devolver detalles internos
            var js = new JavaScriptSerializer();
            context.Response.StatusCode = 500;
            context.Response.Write(js.Serialize(new JsonResponse { success = false, message = "Error del servidor. Intenta nuevamente más tarde." }));
        }
    }
}
