const AWS = require("aws-sdk");
const PDFDocument = require("pdfkit");

const s3 = new AWS.S3();

exports.handler = async (event) => {
  try {
    const bucketName = process.env.REPORTS_BUCKET; // asegúrate que esté definido en tu Lambda
    const key = `reports/user-${Date.now()}.pdf`;

    // === Generar PDF en memoria ===
    const doc = new PDFDocument();
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {});

    doc.fontSize(20).text("Reporte de actividad", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text("Este es un ejemplo de reporte generado desde AWS Lambda.");
    doc.end();

    const pdfBuffer = await new Promise((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
    });

    // === Subir PDF a S3 ===
    await s3
      .putObject({
        Bucket: bucketName,
        Key: key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      })
      .promise();

    // === Generar URL firmada de descarga (GET) ===
    const signedUrl = s3.getSignedUrl("getObject", {
      Bucket: bucketName,
      Key: key,
      Expires: 3600, // 1 hora
    });

    // === Respuesta limpia ===
    return {
      statusCode: 200,
      message: "Reporte PDF generado y subido correctamente",
      url: signedUrl,
    };
  } catch (error) {
    console.error("Error generando reporte:", error);

    return {
      statusCode: 500,
      message: "Error generando el reporte",
      error: error.message,
    };
  }
};
