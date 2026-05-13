<div align="center">

# CAPUN — Plataforma Web de Seguimiento Escolar

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Frontend-222222?style=for-the-badge&logo=githubpages&logoColor=white)
![Render](https://img.shields.io/badge/Render-Backend-46E3B7?style=for-the-badge&logo=render&logoColor=white)

**Plataforma web full-stack para CAPUN — Centro de Atención Psicopedagógica (Capacidades Únicas A.C.), Hermosillo, México.**

</div>

---

## 📖 Sobre el proyecto

**CAPUN — Centro de Atención Psicopedagógica (Capacidades Únicas A.C.)** es una asociación civil ubicada en Hermosillo, Sonora, que brinda atención psicopedagógica y terapéutica a niños y jóvenes con discapacidad intelectual. Su equipo de terapeutas trabaja día a día con cada alumno para impulsar su desarrollo cognitivo, lingüístico, motor y social.

### El problema

Antes de este sistema, toda la información de los alumnos —calificaciones, asistencias, logros y comunicados— se gestionaba en papel y archivos físicos dispersos. Esto dificultaba el seguimiento puntual de cada caso, la comunicación con las familias y la toma de decisiones del equipo docente.

### La solución

Esta plataforma digitaliza completamente la gestión de expedientes escolares de CAPUN. Tiene dos perfiles de usuario con interfaces independientes:

- **Padres de familia:** consultan en cualquier momento la boleta mensual de su hijo, historial de asistencias, logros registrados y comunicados del equipo.
- **Staff (terapeutas y directivos):** capturan calificaciones y asistencias por alumno, registran logros, administran cuentas de acceso y mantienen comunicación directa con las familias a través de mensajería interna.

---

## 🔗 Demo en vivo

| Componente | URL |
|---|---|
| Frontend | [capunservicio-gif.github.io/capun-web](https://capunservicio-gif.github.io/capun-web/index.html) |
| Backend API | [capun-api.onrender.com](https://capun-api.onrender.com) |

> **Nota:** El backend está desplegado en el plan gratuito de Render. Si lleva un tiempo inactivo puede tardar ~30 segundos en responder la primera solicitud.

---

## 📸 Capturas de pantalla

| Login | Dashboard Padres | Panel Admin |
|---|---|---|
| ![Login](./docs/img/login.png) | ![Dashboard Padres](./docs/img/dashboard-padres.png) | ![Dashboard Admin](./docs/img/dashboard-admin.png) |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────┐        HTTPS / REST API
│   FRONTEND (GitHub Pages)   │ ──────────────────────────────►  ┌──────────────────────────┐
│                             │                                   │   BACKEND (Render)       │
│  HTML5 · CSS3 · Vanilla JS  │ ◄──────────────────────────────  │                          │
│                             │        JSON Responses             │  Node.js · Express · JWT │
│  • Landing page             │                                   │                          │
│  • Portal de padres         │                                   └──────────────┬───────────┘
│  • Panel maestro            │                                                  │ Mongoose ODM
│  • Panel administrador      │                                                  │
└─────────────────────────────┘                                   ┌──────────────▼───────────┐
                                                                   │   MongoDB Atlas (Cloud)  │
                                                                   │                          │
                                                                   │  users · children        │
                                                                   │  messages · events       │
                                                                   └──────────────────────────┘
```

**Flujo de autenticación:** el usuario inicia sesión desde el frontend → el backend valida credenciales y emite un **JWT firmado** → el token se almacena en `localStorage` → todas las peticiones posteriores incluyen el token en el header `Authorization` → el backend verifica el token y el rol antes de procesar cada solicitud.

---

## 🛠️ Stack tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Frontend | HTML5 | Estructura semántica de las vistas |
| Frontend | CSS3 (Variables + Flexbox + Grid) | Estilos responsivos y sistema de diseño |
| Frontend | JavaScript ES6+ (Vanilla) | Lógica de cliente, fetch API, manejo de DOM |
| Backend | Node.js 20.x | Entorno de ejecución del servidor |
| Backend | Express 4.18 | Framework HTTP y enrutamiento |
| Backend | JSON Web Tokens (JWT) | Autenticación stateless y control de roles |
| Backend | bcryptjs | Hash seguro de contraseñas |
| Backend | Nodemailer | Envío de correos para recuperación de contraseña |
| Backend | dotenv | Gestión de variables de entorno |
| Backend | cors | Control de acceso entre dominios |
| Base de datos | MongoDB Atlas | Base de datos NoSQL en la nube |
| Base de datos | Mongoose 8 | ODM para modelado y validación de documentos |
| Deploy Frontend | GitHub Pages | Hosting estático gratuito |
| Deploy Backend | Render | Hosting de servidor Node.js |
| Versionado | Git / GitHub | Control de versiones y repositorio remoto |

---

## ✨ Funcionalidades

### 👨‍👩‍👧 Portal de Padres

- Visualizar la **boleta mensual** del hijo con calificaciones por área (Lenguaje, Matemáticas, Psicomotricidad, Habilidades Sociales, y 6 áreas más)
- Consultar **estadísticas de asistencia** mensuales (asistencias, faltas, retardos)
- Ver el **historial de logros** registrados por el equipo terapéutico
- Acceder al portal desde cualquier dispositivo con diseño responsivo
- **Recuperación de contraseña** por correo electrónico

### 🏫 Módulo Administrativo (Maestros y Admin)

**Panel Maestro:**
- Ver la lista completa de alumnos
- Capturar y actualizar calificaciones por alumno y mes
- Registrar estadísticas de asistencia
- Agregar y eliminar logros individuales
- Enviar mensajes a padres de familia

**Panel Administrador** (acceso completo):
- Crear cuentas de acceso para padres, maestros y administradores
- Restablecer contraseñas de cualquier usuario
- Eliminar usuarios y sus expedientes asociados
- Visualizar y editar expedientes académicos
- Gestionar el tablero de avisos y eventos
- Acceso al buzón completo de mensajería interna

---

## 📁 Estructura del proyecto

```
CAPUN/                          ← Raíz del monorepo
│
├── frontend/                   ← Aplicación cliente (GitHub Pages)
│   ├── assets/                 ← Imágenes institucionales y logo
│   ├── js/
│   │   ├── app.js              ← Lógica del portal de padres
│   │   └── login.js            ← Autenticación y redirección por rol
│   ├── pages/
│   │   ├── login.html          ← Pantalla de acceso
│   │   ├── admin.html          ← Panel de administrador
│   │   ├── teacher.html        ← Panel de maestro
│   │   ├── forgot-password.html
│   │   └── reset-password.html
│   ├── index.html              ← Landing page institucional
│   ├── dashboard.html          ← Portal de padres
│   └── style.css               ← Estilos globales
│
├── backend/                    ← API REST (Render)
│   ├── controllers/
│   │   ├── passwordController.js   ← Lógica de recuperación de contraseña
│   │   └── progressController.js   ← Lógica de progreso y estadísticas
│   ├── middleware/
│   │   └── auth.js             ← Verificación de tokens JWT
│   ├── models/
│   │   ├── User.js             ← Modelo de usuarios
│   │   ├── Child.js            ← Modelo de alumnos (boleta, asistencias, logros)
│   │   ├── Message.js          ← Modelo de mensajería
│   │   └── Event.js            ← Modelo de eventos/avisos
│   ├── routes/
│   │   ├── auth.js             ← Rutas de autenticación extendida
│   │   ├── childRoutes.js      ← Rutas de gestión de alumnos
│   │   ├── passwordRoutes.js   ← Rutas de recuperación de contraseña
│   │   └── progressRoutes.js   ← Rutas de progreso académico
│   ├── server.js               ← Punto de entrada principal
│   ├── .env.example            ← Plantilla de variables de entorno
│   └── package.json
│
├── docs/
│   └── img/                    ← Capturas de pantalla (README)
├── .gitignore
└── README.md
```

---

## ⚙️ Instalación local

### Prerrequisitos

- [Node.js v18+](https://nodejs.org/) y npm
- Cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas) (tier gratuito disponible)
- Un cliente para servir archivos estáticos: [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (VS Code) o `npx serve`

### 1. Clonar el repositorio

```bash
git clone https://github.com/MiguelC121913/CAPUN.git
cd CAPUN
```

### 2. Configurar el backend

```bash
cd backend
npm install
```

Copia el archivo de ejemplo y rellena tus valores:

```bash
cp .env.example .env
```

Abre `.env` y completa cada variable:

```env
MONGO_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/<nombre-db>
JWT_SECRET=una_cadena_larga_y_aleatoria
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5500
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion_gmail
```

> Para `EMAIL_PASS` necesitas una **contraseña de aplicación** de Google (no tu contraseña normal). Puedes generarla en: Cuenta Google → Seguridad → Verificación en dos pasos → Contraseñas de aplicación.

### 3. Levantar el backend

```bash
node server.js
# O con recarga automática:
npm run dev
```

El servidor quedará disponible en `http://localhost:3000`. Deberías ver en consola:

```
✅ MongoDB conectado
🚀 Servidor CAPUN corriendo en http://localhost:3000
```

### 4. Servir el frontend

Desde la raíz del proyecto, abre `frontend/index.html` con Live Server (puerto 5500) o:

```bash
npx serve frontend -p 5500
```

Navega a `http://localhost:5500` para ver la landing page.

---

## 🔌 Endpoints de la API

> Base URL: `https://capun-api.onrender.com` (producción) · `http://localhost:3000` (local)

### Autenticación

| Método | Ruta | Descripción | Auth requerida |
|---|---|---|---|
| `POST` | `/api/register` | Registrar nuevo usuario | No |
| `POST` | `/api/login` | Iniciar sesión — devuelve JWT | No |
| `POST` | `/api/password/forgot-password` | Solicitar correo de recuperación | No |
| `POST` | `/api/password/reset-password` | Restablecer contraseña con token | No |

### Portal de Padres

| Método | Ruta | Descripción | Auth requerida |
|---|---|---|---|
| `GET` | `/api/my-child-data` | Obtener expediente del hijo | ✅ JWT |
| `GET` | `/api/messages` | Ver mensajes del buzón propio | ✅ JWT |
| `POST` | `/api/messages` | Enviar mensaje al equipo | ✅ JWT |
| `GET` | `/api/events` | Ver avisos y eventos | ✅ JWT |

### Panel Maestro

| Método | Ruta | Descripción | Auth requerida |
|---|---|---|---|
| `GET` | `/api/teacher/students` | Listar todos los alumnos | ✅ JWT |
| `PUT` | `/api/teacher/students/:id/boleta` | Actualizar calificaciones y asistencia | ✅ JWT (teacher/admin) |
| `POST` | `/api/teacher/students/:id/achievement` | Agregar logro a un alumno | ✅ JWT |
| `DELETE` | `/api/teacher/students/:id/achievement/:itemId` | Eliminar logro | ✅ JWT |
| `GET` | `/api/teacher/messages` | Ver buzón completo de mensajería | ✅ JWT |
| `POST` | `/api/events` | Crear aviso o evento | ✅ JWT |
| `DELETE` | `/api/events/:id` | Eliminar aviso | ✅ JWT |

### Panel Administrador

| Método | Ruta | Descripción | Auth requerida |
|---|---|---|---|
| `GET` | `/api/admin/users` | Listar todos los usuarios | ✅ JWT (admin) |
| `POST` | `/api/admin/users` | Crear usuario (cualquier rol) | ✅ JWT (admin) |
| `PUT` | `/api/admin/users/:id/reset-password` | Restablecer contraseña de un usuario | ✅ JWT (admin) |
| `DELETE` | `/api/admin/users/:id` | Eliminar usuario y su expediente | ✅ JWT (admin) |

---

## 🗃️ Modelos de datos

### `User` — Cuentas de acceso

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | String | Nombre completo |
| `email` | String (único) | Correo electrónico — identificador de login |
| `password` | String | Hash bcrypt de la contraseña |
| `role` | Enum | `admin` · `teacher` · `parent` |
| `isActive` | Boolean | Estado de la cuenta |
| `lastLogin` | Date | Fecha del último acceso |
| `resetPasswordToken` | String | Token temporal para recuperación |
| `resetPasswordExpires` | Date | Expiración del token de recuperación |

### `Child` — Expediente del alumno

| Campo | Tipo | Descripción |
|---|---|---|
| `parentId` | ObjectId (ref: User) | Cuenta del padre vinculada |
| `name` | String | Nombre del alumno |
| `generalStatus` | String | Estado general del ciclo (p. ej. "En proceso") |
| `boleta.grades` | Object | Calificaciones por mes y materia |
| `boleta.attendanceStats` | Object | Asistencias, faltas y retardos por mes |
| `achievements` | Array | Historial de logros con título y fecha |

### `Message` — Mensajería interna

| Campo | Tipo | Descripción |
|---|---|---|
| `from` | ObjectId (ref: User) | Remitente |
| `toUser` | ObjectId (ref: User) | Destinatario específico (opcional) |
| `toRole` | Enum | Rol destinatario: `admin` · `teacher` · `parent` |
| `content` | String | Cuerpo del mensaje |
| `date` | Date | Fecha de envío |
| `read` | Boolean | Estado de lectura |

### `Event` — Avisos y eventos

| Campo | Tipo | Descripción |
|---|---|---|
| `title` | String | Título del aviso o evento |
| `date` | Date | Fecha en que ocurre el evento |
| `description` | String | Descripción extendida (opcional) |
| `createdBy` | ObjectId (ref: User) | Usuario que lo creó (admin o maestro) |

---

## 🔒 Seguridad

- **Autenticación JWT:** cada sesión emite un token firmado con `JWT_SECRET` (configurado en variables de entorno) con expiración de 24 horas. El servidor rechaza cualquier solicitud sin token válido.
- **Variables de entorno:** todas las credenciales sensibles (URI de MongoDB, secreto JWT, credenciales de correo) se gestionan en `.env`, excluido del repositorio mediante `.gitignore`.
- **Autorización por roles:** tres niveles de acceso (`admin`, `teacher`, `parent`). El backend verifica el rol en cada endpoint protegido antes de ejecutar cualquier operación.
- **Hash de contraseñas:** las contraseñas nunca se almacenan en texto plano — se hashean con `bcryptjs` usando salt de 10 rondas.
- **CORS configurado:** la API solo acepta peticiones de los orígenes declarados en `FRONTEND_URL` y `localhost:5500`. Se rechaza cualquier dominio no autorizado.

---

## 🗺️ Próximas mejoras

- Migración del frontend a un framework moderno (Angular o React) para mejor mantenibilidad y escalabilidad
- Tests automatizados: Jest para el backend, Playwright para el frontend
- Notificaciones push a padres sobre nuevos avisos, calificaciones o mensajes
- Dashboard de métricas agregadas para administradores (asistencia promedio, alumnos por área, etc.)
- Internacionalización (ES/EN) para alcanzar familias bilingües
- Modo offline con sincronización para zonas con conexión inestable

---

## 📞 Contacto

**Miguel Ángel Córdova Salcido** — Desarrollador Full-Stack

[![LinkedIn](https://img.shields.io/badge/LinkedIn-miguel--angel--córdova-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/miguel-angel-córdova/)
[![GitHub](https://img.shields.io/badge/GitHub-MiguelC121913-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/MiguelC121913)
[![Email](https://img.shields.io/badge/Email-miguelcordova111@gmail.com-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:miguelcordova111@gmail.com)

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.
