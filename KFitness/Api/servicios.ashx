<%@ WebHandler Language="C#" Class="ServiciosHandler" %>

using System;
using System.Collections.Generic;
using System.Web;
using System.Web.Script.Serialization;

// Handler que expone los servicios del catálogo como API REST en formato JSON.
// Responde a peticiones GET desde el frontend (servicios.html y index.html).
public class ServiciosHandler : IHttpHandler
{
    // El handler puede ser reutilizado por múltiples peticiones
    public bool IsReusable { get { return false; } }

    public void ProcessRequest(HttpContext context)
    {
        // Todas las respuestas de este handler son JSON
        context.Response.ContentType = "application/json";

        try
        {
            string accion = context.Request.QueryString["accion"];

            // Si se pasa ?accion=detalle&id=X retorna un servicio específico
            // Si no se pasa acción retorna todos los servicios activos
            if (accion == "detalle")
            {
                ManejarDetalle(context);
            }
            else
            {
                ManejarListado(context);
            }
        }
        catch (Exception ex)
        {
            // En caso de error retorna un mensaje genérico sin exponer detalles internos
            context.Response.StatusCode = 500;
            context.Response.Write(new JavaScriptSerializer().Serialize(new
            {
                success = false,
                message = "Error al obtener los servicios: " + ex.Message
            }));
        }
    }

    // Retorna la lista de todos los servicios activos
    private void ManejarListado(HttpContext context)
    {
        var js = new JavaScriptSerializer();
        List<Servicio> servicios = RepositorioServicio.ObtenerServiciosActivos();

        if (servicios.Count == 0)
        {
            // Si no hay servicios disponibles retorna success true con lista vacía
            // El frontend se encarga de mostrar el mensaje informativo
            context.Response.Write(js.Serialize(new
            {
                success = true,
                mensaje = "No hay servicios disponibles en este momento.",
                data = new List<Servicio>()
            }));
            return;
        }

        context.Response.Write(js.Serialize(new
        {
            success = true,
            data = servicios
        }));
    }

    // Retorna el detalle de un servicio específico por su ID
    private void ManejarDetalle(HttpContext context)
    {
        var js = new JavaScriptSerializer();

        // Validar que se haya enviado un ID válido
        int id;
        if (!int.TryParse(context.Request.QueryString["id"], out id) || id <= 0)
        {
            context.Response.StatusCode = 400;
            context.Response.Write(js.Serialize(new
            {
                success = false,
                message = "ID de servicio inválido."
            }));
            return;
        }

        Servicio servicio = RepositorioServicio.ObtenerServicioPorId(id);

        if (servicio == null)
        {
            // El servicio no existe o no está activo
            context.Response.StatusCode = 404;
            context.Response.Write(js.Serialize(new
            {
                success = false,
                message = "El servicio no existe o no está disponible."
            }));
            return;
        }

        context.Response.Write(js.Serialize(new
        {
            success = true,
            data = servicio
        }));
    }
}