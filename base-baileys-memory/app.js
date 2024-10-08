const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const cron = require('node-cron');
const XLSX = require('xlsx'); // Importar la librería xlsx

// Función para leer datos desde un archivo Excel
const getUsersFromExcel = (filePath, startRow) => {
    const workbook = XLSX.readFile(filePath); // Ruta del archivo Excel
    const sheetName = workbook.SheetNames[0]; // Obtener el primer nombre de hoja
    const sheet = workbook.Sheets[sheetName]; // Obtener la hoja

    // Convertir a JSON, empezando a leer desde la fila especificada (0-indexado)
    const users = XLSX.utils.sheet_to_json(sheet, { header: 1, range: startRow }); 
    
    // Crear un array de objetos con los encabezados y los datos
    const headers = users[0]; // Primera fila (encabezados)
    const data = users.slice(1); // Las filas de datos

    const usersWithHeader = data.map(row => {
        let userObj = {};
        row.forEach((value, index) => {
            userObj[headers[index]] = value; // Asignar valores a las claves basadas en los encabezados
        });
        return userObj;
    });

    console.log(`Usuarios leídos desde ${filePath}:`, usersWithHeader); // Debug: verificar que se leyeron los usuarios correctamente
    return usersWithHeader; // Devuelve un array de objetos
};

// Función para enviar mensajes personalizados
const sendMessage = async (provider, number, message, mediaUrl = null) => {
    try {
        const formattedNumber = `${number}@s.whatsapp.net`;
        if (mediaUrl) {
            await provider.sendImage(formattedNumber, mediaUrl, message); // Ajustar para enviar imágenes
        } else {
            await provider.sendText(formattedNumber, message);
        }
    } catch (error) {
        console.error(`Error al enviar mensaje a ${number}:`, error);
    }
};

// Generar el mensaje basado en los días de retraso
const generateReminderMessage = (user) => {
    const nombre = user.Cliente; // Asegúrate de que este campo está correctamente definido en el Excel
    const diasRetraso = user['Dias de Atraso'] || 0; // Manejar el caso donde no haya días de atraso

    if (diasRetraso <= 0) {
        return `¡Hola ${nombre}! Recuerda pasar hoy a la sucursal a dejar tu pago correspondiente. Si ya lo has hecho, ignora este mensaje.`;
    } else if (diasRetraso <= 7) {
        return `¡Hola ${nombre}! Atención: tu pago está atrasado ${diasRetraso} días. Por favor regulariza tu situación para evitar recargos.`;
    } else {
        return `🚨 Urgente: ¡Hola ${nombre}, tu pago tiene más de ${diasRetraso} días de atraso! Contacta con nosotros para evitar consecuencias mayores.`;
    }
};

// Generar el mensaje de promoción para clientes sin deudas
const generatePromotionMessage = (user) => {
    const nombre = user.Cliente; // Asegúrate de que este campo está correctamente definido en el Excel
    return `¡Hola ${nombre}! 🎉 Te invitamos a conocer nuestros nuevos productos y promociones. ¡No te los pierdas!`;
};

// Enviar mensajes automáticos de recordatorio de pago
const schedulePaymentReminders = async (provider) => {
    const usersWithDebts = getUsersFromExcel('./uploads/adeudo.xlsx', 6); // Obtener usuarios deudores desde el archivo Excel
    cron.schedule('59 13 * * *', () => {  // Programado para las 5:30 PM todos los días
        usersWithDebts.forEach(user => {
            const message = generateReminderMessage(user);
            sendMessage(provider, user.telefono, message);
        });
    }, {
        timezone: "America/Mexico_City"
    });
};
// Enviar promociones a clientes sin deudas
const schedulePromotions = async (provider) => {
    const usersWithoutDebts = getUsersFromExcel('./uploads/sindeuda.xlsx', 0); // Obtener usuarios sin deudas desde otro archivo Excel
    const mediaUrl = './imagen.jpg'; // URL de la imagen a enviar

    cron.schedule('57 13 * * *', () => {  // Programado para las 10:00 AM todos los días
        usersWithoutDebts.forEach(user => {
            const saldo = user.Saldo || 0; // Manejar el caso donde no haya saldo
            if (saldo === 0) { // Si no deben nada
                const message = generatePromotionMessage(user);
                sendMessage(provider, user.telefono, message, mediaUrl);
            } else {
                console.log(`El usuario ${user.Cliente} tiene saldo de ${saldo}, no se enviará promoción.`); // Mensaje de depuración
            }
        });
    }, {
        timezone: "America/Mexico_City"
    });
};

// Crear el flujo para negociación de pagos
const flowNegotiation = addKeyword(['negociar', 'plan', 'opciones'])
    .addAnswer('Parece que tienes pagos pendientes. Aquí tienes algunas opciones para regularizar tu cuenta:')
    .addAnswer('1. Pagar el monto completo ahora y obtener un descuento del 5%.')
    .addAnswer('2. Dividir el pago en dos quincenas sin recargos adicionales.')
    .addAnswer('3. Refinanciar el saldo pendiente a 3 meses con un pequeño interés.')
    .addAnswer('Responde con el número de la opción que prefieras.');

// Crear el flujo principal
const flowPrincipal = addKeyword(['hola', 'ole', 'alo'])
    .addAnswer('🙌 Hola, bienvenido')
    //.addAnswer('¿Cómo estás? Si deseas negociar tu adeudo, escribe *negociar*.');

// Función principal para iniciar el bot
const main = async () => {
    const adapterFlow = createFlow([flowPrincipal, flowNegotiation]); // Incluye el flujo de negociación
    const adapterProvider = createProvider(BaileysProvider);
    const adapterDB = new MockAdapter();

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();

    // Programar el envío automático de recordatorios
    await schedulePaymentReminders(adapterProvider);
    // Programar el envío de promociones
    await schedulePromotions(adapterProvider);
};

// Iniciar el bot
main();

module.exports = { sendMessage };
