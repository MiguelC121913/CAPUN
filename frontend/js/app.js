const API_URL = 'https://capun-api.onrender.com/api'; // CAMBIA A TU URL DE RENDER

let globalStudentData = null; // Guardamos los datos aquí para no hacer fetch cada vez que cambian de mes

// Lista de Materias (Debe coincidir con admin/teacher)
const subjectsList = [
    "Funciones Cognitivas y Ejecutivas", "Desarrollo de Independencia", "Lenguaje",
    "Matemáticas", "Psicomotricidad", "Habilidades Sociales",
    "Lectura y Escritura", "Arte", "Educación Física", "Música"
];

async function fetchConToken(endpoint) {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'pages/login.html'; return; }
    const res = await fetch(`${API_URL}${endpoint}`, { headers: { 'Authorization': token } });
    if (res.status === 401 || res.status === 403) { window.location.href = 'pages/login.html'; return; }
    return await res.json();
}

async function cargarDatosDashboard() {
    // 1. Detectar si viene ID en la URL (Vista Admin/Maestro) o es Padre normal
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');

    let endpoint = '/my-child-data';
    if (studentId) endpoint += `?studentId=${studentId}`;

    const data = await fetchConToken(endpoint);

    if (!data || data.message) {
        document.getElementById('student-name').innerText = "Sin datos asignados";
        return;
    }

    // 2. Guardar datos y Renderizar Info Básica
    globalStudentData = data;
    document.getElementById('student-name').innerText = data.name;
    document.getElementById('student-status').innerText = data.generalStatus || "En proceso";

    // 3. Renderizar Logros
    const logrosList = document.getElementById('achievements-list');
    logrosList.innerHTML = '';
    if (data.achievements && data.achievements.length > 0) {
        data.achievements.slice().reverse().forEach(logro => {
            logrosList.innerHTML += `<li>${logro.title}</li>`;
        });
    } else {
        logrosList.innerHTML = '<p style="font-size:0.9rem; color:#999;">Sin logros registrados aún.</p>';
    }

    // 4. Renderizar Boleta del Mes seleccionado por defecto
    renderBoleta();
}

function renderBoleta() {
    if (!globalStudentData) return;

    const month = document.getElementById('dashboard-month').value;
    const boleta = globalStudentData.boleta || {};
    
    // Datos del mes (o objeto vacío si no hay nada)
    const grades = (boleta.grades && boleta.grades[month]) ? boleta.grades[month] : {};
    const stats = (boleta.attendanceStats && boleta.attendanceStats[month]) ? boleta.attendanceStats[month] : {};

    // 1. Llenar Tabla de Notas
    const tbody = document.getElementById('boleta-body');
    tbody.innerHTML = '';
    
    let hayDatos = false;

    subjectsList.forEach(materia => {
        const nota = grades[materia];
        if (nota) hayDatos = true; // Al menos hay una nota

        // Color de la etiqueta
        let badgeClass = '';
        if(nota === 'E') badgeClass = 'grade-E';
        if(nota === 'MB') badgeClass = 'grade-MB';
        if(nota === 'B') badgeClass = 'grade-B';
        if(nota === 'R') badgeClass = 'grade-R';

        tbody.innerHTML += `
            <tr>
                <td>${materia}</td>
                <td style="text-align:center;">
                    ${nota ? `<span class="grade-badge ${badgeClass}">${nota}</span>` : '<span style="color:#ccc;">-</span>'}
                </td>
            </tr>
        `;
    });

    if (!hayDatos) {
        // Mensaje bonito si el mes está vacío
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:30px; color:#999;">
            <i class="fas fa-folder-open" style="font-size:2rem; margin-bottom:10px;"></i><br>
            No hay calificaciones registradas para ${month.toUpperCase()}
        </td></tr>`;
    }

    // 2. Llenar Estadísticas
    document.getElementById('disp-retardos').innerText = stats.retardos || 0;
    document.getElementById('disp-faltas').innerText = stats.inasistencias || 0;
    document.getElementById('disp-asistencias').innerText = stats.asistencias || 0;
}