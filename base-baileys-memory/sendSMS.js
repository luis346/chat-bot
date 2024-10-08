const { Vonage } = require('@vonage/server-sdk');
const cron = require('node-cron');
// Inicializa el cliente de Vonage
const vonage = new Vonage({
    apiKey: 'e51482f9', // Reemplaza con tu API Key
    apiSecret: 'oQo9qbxPukEhfOHR' // Reemplaza con tu API Secret
});

// Función para enviar un mensaje SMS
const sendSMS = (to, from, text) => {
    vonage.sms.send({ to, from, text })
        .then(response => {
            const message = response.messages[0];
            if (message.status === '0') {
                console.log('Mensaje enviado con éxito.');
            } else {
                console.error(`Error al enviar el mensaje: ${message['error-text']}`);
            }
        })
        .catch(err => {
            console.error('Error al enviar el mensaje:', err);
        });
};

// Ejemplo para enviar un mensaje
const main = () => {
    const toNumber = '527121881562'; // Número de destino
    const fromNumber = '527122649212'; // Puede ser un número o texto corto
    const message = 'Recordatorio: Tu pago está pendiente, por favor pasa a realizarlo.';

    // Programar la tarea (por ejemplo, todos los días a las 10:00 AM)
    cron.schedule('12 14 * * *', () => {
        console.log('Enviando mensaje programado...');
        sendSMS(toNumber, fromNumber, message);
    }, {
        timezone: "America/Mexico_City" // Ajusta tu zona horaria
    });
};

// Llama a la función principal para iniciar la programación
main();