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
  res.send(`
    <h1>Bienvenido a la App con OAuth</h1>
    <a href="/login">Iniciar Sesión con GitHub</a>
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
    return res.send('No se recibió el código de autorización.');
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
    res.send('Ocurrió un error al obtener el token de acceso');
  }
});

// Ruta protegida que requiere un access token
app.get('/profile', async (req, res) => {
  if (!req.session.accessToken) {
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
      <h1>Perfil de Usuario en GitHub</h1>
      <p>Usuario: ${user.login}</p>
      <p>ID: ${user.id}</p>
      <img src="${user.avatar_url}" alt="avatar" width="100" />
      <br>
      <a href="/logout">Cerrar Sesión</a>
    `);
  } catch (error) {
    console.error('Error al obtener el perfil de usuario:', error.message);
    res.send('Ocurrió un error al obtener el perfil de usuario');
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
