const https = require("https");

const apiKey = "93e4fd002cc03fd97b88fb11d696f5644bea04cab90f8f4180f3de8451b5400d";
const apiSecret = "b7ed28b0eb915faaf4a38df8a6aad4237554aed0c386c6f88d9baf145c72d741";

const methods = [
  { name: "Guichet PayTech", target: "PayTech" },
  { name: "Wave", target: "Wave" },
  { name: "Orange Money", target: "Orange Money" },
  { name: "Free Money", target: "Free Money" },
  { name: "Wizall", target: "Wizall" },
  { name: "Carte Bancaire", target: "Carte Bancaire" }
];

async function testMethod(item) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      item_name: `Test — ${item.name}`,
      item_price: 100000,
      currency: "XOF",
      ref_command: `INV-TEST-${item.target.replace(/\s+/g, '')}-${Date.now()}`,
      command_name: `Test PayTech ${item.name}`,
      target_payment: item.target,
      success_url: "https://inova-iris-main2.vercel.app/?payment_status=success",
      cancel_url: "https://inova-iris-main2.vercel.app/?payment_status=cancel",
      ipn_url: "https://inova-iris-main2.vercel.app/api/paytech-ipn",
      env: "test"
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

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          console.log(`[${item.name}] Status: ${res.statusCode} | Success: ${json.success} | Redirect: ${json.redirect_url || json.redirectUrl || json.message}`);
        } catch (e) {
          console.log(`[${item.name}] Raw output: ${body}`);
        }
        resolve();
      });
    });

    req.on("error", (err) => {
      console.log(`[${item.name}] Error: ${err.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function runAll() {
  for (const m of methods) {
    await testMethod(m);
  }
}

runAll();
