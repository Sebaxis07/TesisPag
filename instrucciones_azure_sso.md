# Guía de Configuración: Microsoft Entra ID (Azure AD) para ThesisFlow 🔑

Esta guía detalla los pasos para registrar tu aplicación en el portal de Microsoft Azure y obtener las credenciales necesarias para habilitar el inicio de sesión real con cuentas institucionales de **INACAP** o cuentas personales Microsoft.

---

## Paso 1: Registrar la Aplicación en Azure

1. Ve al [Portal de Azure](https://portal.azure.com/) e inicia sesión con cualquier cuenta Microsoft (puede ser tu cuenta personal u otra cuenta de Azure).
2. En la barra de búsqueda superior, escribe **Microsoft Entra ID** (anteriormente conocido como *Azure Active Directory*) y selecciónalo.
3. En el menú lateral izquierdo, haz clic en **App registrations** (Registro de aplicaciones).
4. En la barra superior, selecciona **+ New registration** (Nuevo registro).

---

## Paso 2: Configurar los Detalles del Registro

En la pantalla de creación, completa los siguientes campos:

1. **Name (Nombre)**: Escribe un nombre descriptivo para identificar tu aplicación (ejemplo: `ThesisFlow - Gestión Académica`).
2. **Supported account types (Tipos de cuenta compatibles)**:
   * Selecciona la opción: **"Accounts in any organizational directory (Any Microsoft Entra ID directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**.
   * *¿Por qué esta opción?* Permite que inicien sesión tanto estudiantes/docentes de INACAP como cualquier otra cuenta corporativa, estudiantil o personal de Microsoft.
3. **Redirect URI (URI de redireccionamiento)**:
   * En el selector desplegable, elige **Web**.
   * En el campo de texto de la derecha, ingresa exactamente tu ruta callback local:
     ```text
     http://localhost:5000/api/auth/microsoft/callback
     ```
   * *(Nota: Cuando despliegues a producción, deberás agregar otra URI aquí con tu dominio real).*
4. Haz clic en el botón **Register** (Registrar) en la parte inferior.

---

## Paso 3: Obtener Client ID y Tenant ID

Una vez creada la aplicación, serás redirigido a la pantalla de **Overview** (Información general):

1. Copia el valor de **Application (client) ID** (ID de la aplicación - cliente). Este valor corresponde a tu `MICROSOFT_CLIENT_ID`.
2. Copia el valor de **Directory (tenant) ID** (ID del directorio - inquilino). Este valor corresponde a tu `MICROSOFT_TENANT_ID`. *(Puedes dejar la variable como `common` en el archivo `.env` para permitir acceso multi-inquilino).*

---

## Paso 4: Crear la Clave Secreta (Client Secret)

Para que el backend de Node.js pueda verificar la autenticidad del handshake, necesitas un Secret:

1. En el menú lateral izquierdo de tu aplicación registrada, haz clic en **Certificates & secrets** (Certificados y secretos).
2. Selecciona la pestaña **Client secrets** (Secretos de cliente) y haz clic en **+ New client secret** (Nuevo secreto de cliente).
3. En **Description** escribe una etiqueta (ejemplo: `ThesisFlow Local Dev Secret`).
4. Selecciona el tiempo de expiración recomendado (ejemplo: `180 days` / 6 meses).
5. Haz clic en **Add** (Agregar).
6. ⚠️ **IMPORTANTE**: Copia inmediatamente el contenido de la columna **Value** (Valor), **NO** el *Secret ID*. Este valor es una clave secreta (ejemplo: `4qB8Q~...`) y solo se mostrará una vez. Si refrescas la página, se ocultará permanentemente por seguridad. Este valor corresponde a tu `MICROSOFT_CLIENT_SECRET`.

---

## Paso 5: Verificar Permisos de API

Por defecto, Azure asigna los permisos necesarios para la autenticación básica de perfiles:

1. Ve a **API permissions** (Permisos de API) en el menú lateral izquierdo.
2. Verifica que aparezca el permiso **User.Read** bajo la API *Microsoft Graph* de tipo *Delegated*. Si está presente, no debes hacer nada más.

---

## Paso 6: Actualizar tu archivo `.env` en el Backend

Abre el archivo `backend/.env` y reemplaza los valores de prueba por los valores reales que acabas de copiar de Azure:

```env
MICROSOFT_CLIENT_ID=pega_aqui_el_Application_Client_ID
MICROSOFT_CLIENT_SECRET=pega_aqui_el_Valor_del_Client_Secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:5000/api/auth/microsoft/callback
FRONTEND_URL=http://localhost:5173
```

¡Listo! Con esto configurado, el botón de tu aplicación iniciará sesión de forma 100% real utilizando el portal oficial de Microsoft.
