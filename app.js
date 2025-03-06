// app.js
const express = require('express');
const session = require('cookie-session');
const axios = require('axios');
require('dotenv').config(); // Para leer variables de entorno desde .env

const app = express();

// Configuración de sesiones con cookie-session
app.use(
  session({
    name: 'session',
    keys: ['llave_secreta_cualquiera'],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
  })
);

// Variables de entorno
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Ruta principal
app.get('/', (req, res) => {
  // Página de inicio con Bootstrap
  res.send(`
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Inicio - GitHub OAuth</title>
      <!-- Bootstrap CSS -->
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    </head>
    <body class="bg-light">
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
          <a class="navbar-brand" href="/">Mi App OAuth</a>
        </div>
      </nav>

      <div class="container d-flex flex-column justify-content-center align-items-center" style="min-height: 80vh;">
        <div class="text-center">
          <h1 class="mb-4">Bienvenido a la App con OAuth y GitHub</h1>
          <p class="lead mb-4">Esta aplicación te permite autenticarte con GitHub y ver tu perfil.</p>
          <a class="btn btn-primary btn-lg" href="/login">Iniciar Sesión con GitHub</a>
        </div>
      </div>

      <!-- Bootstrap JS (opcional, si necesitas funcionalidad de componentes) -->
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    </body>
  </html>
  `);
});

// Ruta para iniciar la autorización
app.get('/login', (req, res) => {
  // Endpoint de autorización de GitHub
  const authorizationEndpoint = 'https://github.com/login/oauth/authorize';

  // Parámetros de autorización
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'user', // Ajusta este scope según lo que requiera tu aplicación
  });

  // Redirigir al usuario al servidor de autorización
  res.redirect(`${authorizationEndpoint}?${params.toString()}`);
});

// Ruta de callback, a la que GitHub redirige tras la autenticación
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.send(`
      <html>
        <head>
          <meta charset="UTF-8"/>
          <title>Error</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
        </head>
        <body class="bg-light">
          <div class="container pt-5">
            <div class="alert alert-danger" role="alert">
              No se recibió el código de autorización. 
            </div>
            <a class="btn btn-secondary" href="/">Regresar al inicio</a>
          </div>
        </body>
      </html>
    `);
  }

  try {
    // Intercambiar el authorization code por un access token en GitHub
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      },
      {
        headers: {
          accept: 'application/json',
        },
      }
    );

    // Guardamos el access token en la sesión
    const accessToken = tokenResponse.data.access_token;
    req.session.accessToken = accessToken;

    // Redirigir a la ruta de perfil
    res.redirect('/profile');
  } catch (error) {
    console.error('Error al obtener el token de acceso:', error.message);
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8"/>
          <title>Error</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
        </head>
        <body class="bg-light">
          <div class="container pt-5">
            <div class="alert alert-danger" role="alert">
              Ocurrió un error al obtener el token de acceso.
            </div>
            <p>${error.message}</p>
            <a class="btn btn-secondary" href="/">Regresar al inicio</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Ruta protegida que requiere un access token
app.get('/profile', async (req, res) => {
  if (!req.session.accessToken) {
    // Si no hay token en sesión, redirigimos al inicio
    return res.redirect('/');
  }

  try {
    // Consumir la API de GitHub para obtener datos de usuario
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${req.session.accessToken}`,
      },
    });

    const user = userResponse.data;

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Perfil - GitHub OAuth</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
        </head>
        <body class="bg-light">
          <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container">
              <a class="navbar-brand" href="/">Mi App OAuth</a>
              <div>
                <a class="btn btn-outline-light" href="/logout">Cerrar Sesión</a>
              </div>
            </div>
          </nav>

          <div class="container pt-5">
            <div class="row justify-content-center">
              <div class="col-md-6">
                <div class="card shadow">
                  <div class="card-body text-center">
                    <h3 class="card-title mb-4">Perfil de Usuario en GitHub</h3>
                    <img src="${user.avatar_url}" alt="avatar" class="rounded-circle mb-3" width="100" />
                    <p class="card-text"><strong>Usuario:</strong> ${user.login}</p>
                    <p class="card-text"><strong>ID:</strong> ${user.id}</p>
                    <p class="card-text"><strong>URL de GitHub:</strong> <a href="${user.html_url}" target="_blank">${user.html_url}</a></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error al obtener el perfil de usuario:', error.message);
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8"/>
          <title>Error</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
        </head>
        <body class="bg-light">
          <div class="container pt-5">
            <div class="alert alert-danger" role="alert">
              Ocurrió un error al obtener el perfil de usuario
            </div>
            <p>${error.message}</p>
            <a class="btn btn-secondary" href="/">Regresar al inicio</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor iniciado en http://localhost:3000');
});
