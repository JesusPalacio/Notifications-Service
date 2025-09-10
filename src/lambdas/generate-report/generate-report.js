const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const { format } = require("date-fns");

const s3 = new AWS.S3();
const sqs = new AWS.SQS();

const BUCKET_NAME = process.env.REPORTS_BUCKET || "683104418449-inferno-bank-reports";
const URL_EXPIRATION = 60 * 60; // 1 hora

exports.handler = async (event) => {
  try {
    console.log("🚀 Generando reporte de actividad...");

    // 1. Simular transacciones
    const transactions = [
      { date: "2025-08-27", description: "Compra en Tienda X", amount: -50000 },
      { date: "2025-08-27", description: "Depósito", amount: 200000 },
      { date: "2025-08-28", description: "Transferencia enviada", amount: -100000 }
    ];

    // 2. Generar CSV
    const header = "Fecha,Descripción,Monto\n";
    const rows = transactions
      .map(t => `${t.date},${t.description},${t.amount}`)
      .join("\n");
    const csvContent = header + rows;

    // 3. Subir CSV a S3
    const reportId = uuidv4();
    const fileName = `reports/user-${reportId}.csv`;

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: csvContent,
      ContentType: "text/csv"
    }).promise();

    console.log(`✅ Reporte subido a S3: ${fileName}`);

    // 4. Generar URL firmada
    const url = s3.getSignedUrl("getObject", {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Expires: URL_EXPIRATION
    });

    console.log("📄 URL generada:", url);

    // 5. Enviar mensaje a SQS (para que send-notifications mande el correo)
    await sqs.sendMessage({
      QueueUrl: process.env.NOTIFICATION_EMAIL_SQS_URL,
      MessageBody: JSON.stringify({
        type: "REPORT.ACTIVITY",
        email: "zullymelisaloopez@gmail.com", // puedes pasar esto dinámico en event
        data: {
          date: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          url
        }
      })
    }).promise();

    console.log("📨 Mensaje enviado a SQS con URL del reporte");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Reporte generado y enviado a SQS",
        url
      })
    };
  } catch (error) {
    console.error("❌ Error generando el reporte:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
