const express = require('express');
const multer = require('multer'); // Para manejar la carga de archivos
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { sendMessage, schedulePaymentReminders, schedulePromotions } = require('./app.js'); // Importar el archivo que ya tienes

const app = express();
const upload = multer({ dest: 'uploads/' }); // Directorio temporal para guardar archivos subidos

// Configuración para servir archivos estáticos (HTML, CSS)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Ruta para mostrar el formulario de carga de archivos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/uploadAdeudo', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send('No se ha subido ningún archivo.');
    }

    const filePath = path.join(__dirname, 'uploads', 'adeudo.xlsx');
    fs.renameSync(file.path, filePath); // Sobrescribe el archivo de adeudo existente

    try {
        // Leer y procesar el archivo Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convertir a JSON
        const users = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Aquí puedes manejar la lógica de actualizar o cargar los datos
        console.log('Usuarios leídos:', users);

        // Envía la respuesta al cliente solo una vez
        return res.send('Archivo de adeudo actualizado y procesado exitosamente.');
    } catch (error) {
        // Si hay un error, envía una respuesta de error
        return res.status(500).send('Error al procesar el archivo.');
    }
});

// Ruta para actualizar archivos sin deuda
app.post('/uploadSindeuda', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send('No se ha subido ningún archivo.');
    }

    const filePath = path.join(__dirname, 'uploads', 'sindeuda.xlsx');
    fs.renameSync(file.path, filePath); // Sobrescribe el archivo sin deuda existente
    res.send('Archivo sin deuda actualizado exitosamente.');
});

// Inicializar el servidor
app.listen(4000, () => {
    console.log('Servidor escuchando en http://localhost:4000');
});
