// ==========================================
// CONFIGURACIÓN DE CONEXIÓN
// ==========================================
// Usamos la barra al inicio (/) para que siempre busque desde la raíz del servidor
const API_URL = 'https://capun-api.onrender.com/api';

// ==========================================
// LÓGICA DE REGISTRO
// ==========================================
const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Obtener datos del formulario
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value; // Asegúrate que tu HTML tenga este ID
        const childName = document.getElementById('child-name').value; // Asegúrate que tu HTML tenga este ID

        // 2. Validaciones básicas
        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        try {
            // 3. Enviar al Backend
            const response = await fetch(`${API_URL}/register`, { // Esto se traduce a https://capun-api.onrender.com/api/register
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, childName })
            });

            const data = await response.json();

            if (response.ok) {
                alert("¡Registro exitoso! Ahora inicia sesión.");
                window.location.href = 'login.html';
            } else {
                alert(data.error || "Error al registrarse.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error de conexión con el servidor.");
        }
    });
}

// ==========================================
// LÓGICA DE LOGIN
// ==========================================
const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            // OJO: Aquí es donde salía el error "Unexpected token <"
            // Ahora debería funcionar bien.
            const data = await response.json();

           if (response.ok) {
                // Guardar sesión
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role); // Asegúrate de guardar el rol
                localStorage.setItem('childName', data.childName);

                // REDIRECCIÓN SEGÚN ROL
                if (data.role === 'admin') {
                    window.location.href = '../pages/admin.html';
                } else if (data.role === 'teacher') {
                    window.location.href = '../pages/teacher.html';
                } else {
                    window.location.href = '../dashboard.html'; // Padres
                }
            } else {
                alert(data.error || "Credenciales incorrectas.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error de conexión. Revisa que el servidor esté corriendo.");
        }
    });
}