<%@ WebHandler Language="C#" Class="AdminDashboardHandler" %>
using System;
using System.Web;
using System.Web.Script.Serialization;

public class AdminDashboardHandler : IHttpHandler
{
    public bool IsReusable { get { return false; } }

    public void ProcessRequest(HttpContext context)
    {
        context.Response.ContentType = "application/json";
        JavaScriptSerializer js = new JavaScriptSerializer();

        try
        {
            AdminAuthorizationResult auth = AdminAuthorization.ValidateCurrentUser(context);

            if (!auth.IsAuthenticated)
            {
                context.Response.SuppressFormsAuthenticationRedirect = true;
                context.Response.StatusCode = 401;
                context.Response.Write(js.Serialize(new { success = false, message = "No autenticado." }));
                return;
            }

            if (!auth.UserExists || !auth.IsAdmin)
            {
                context.Response.SuppressFormsAuthenticationRedirect = true;
                context.Response.StatusCode = 403;
                context.Response.Write(js.Serialize(new { success = false, message = "Acceso denegado." }));
                return;
            }

            AdminDashboardData dashboard = RepositorioAdmin.ObtenerDashboard();

            context.Response.Write(js.Serialize(new
            {
                success = true,
                nombre = auth.Usuario != null ? auth.Usuario.Nombre : "Administrador",
                rol = auth.RolNombre,
                kpis = new
                {
                    clientesRegistrados = dashboard.ClientesRegistrados,
                    reservasPendientes = dashboard.ReservasPendientes,
                    consultasPendientes = dashboard.ConsultasPendientes,
                    rutinasActivas = dashboard.RutinasActivas
                },
                disponibilidad = new
                {
                    clientes = dashboard.TieneClientes,
                    reservas = dashboard.TieneReservas,
                    consultas = dashboard.TieneConsultas,
                    rutinas = dashboard.TieneRutinas
                }
            }));
        }
        catch (Exception)
        {
            context.Response.SuppressFormsAuthenticationRedirect = true;
            context.Response.StatusCode = 500;
            context.Response.Write(js.Serialize(new { success = false, message = "Error interno." }));
        }
    }
}
