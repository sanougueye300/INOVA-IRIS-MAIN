const https = require("https");

const apiKey = "93e4fd002cc03fd97b88fb11d696f5644bea04cab90f8f4180f3de8451b5400d";
const apiSecret = "b7ed28b0eb915faaf4a38df8a6aad4237554aed0c386c6f88d9baf145c72d741";

const postData = JSON.stringify({
  item_name: "Inova Secure",
  item_price: 100000,
  currency: "XOF",
  ref_command: `INV-SOC-${Date.now()}`,
  command_name: "Abonnement SOC INOVA-IRIS",
  success_url: "https://inova-iris-main2.vercel.app/?payment_status=success",
  cancel_url: "https://inova-iris-main2.vercel.app/?payment_status=cancel",
  env: "prod"
});

const options = {
  hostname: "paytech.sn",
  path: "/api/payment/request-payment",
  method: "POST",
  headers: {
    "API_KEY": apiKey,
    "API_SECRET": apiSecret,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData)
  }
};

console.log("Sending request to PayTech...");

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("Response Body:", body);
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
