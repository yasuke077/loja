const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "static")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "index.html"));
});

// 🚀 Rota de compra
app.post("/comprar", (req, res) => {
  // Simula o pagamento via LivePix gerando QR code dinâmico
  const chavePix = "H7PvTd93+7Lm34P4r/GXqycv6Z8qQYXrwKXX8xTT0OO12wJzImax+0cL+Td3R+Xu+2uqyZ7indk0DLqIbDKVlk/PDawlvIlDV9CJ9eIQLWGxTJPQlKQjDkCP7H5qf3PJ15YPM9ToShFC7ZEM4gUEeBBKheEJ7PzfVmyBKJyqaRw";

  const valor = 15.00;
  const nome = "StellaxSec";
  const cidade = "Internet";
  const descricao = "Essencial do Hacker";

  const payloadPix = `00020126400014br.gov.bcb.pix0114${chavePix}5204000053039865405${valor.toFixed(2)}5802BR5913${nome}6009${cidade}62070503***6304`;
  const paginaPagamento = `
    <html>
    <head><title>Pagamento Pix</title></head>
    <body style="text-align:center; font-family:sans-serif;">
      <h1>🧾 Pagamento</h1>
      <p>Use o Pix abaixo para pagar <strong>R$${valor}</strong></p>
      <textarea rows="6" style="width:90%">${payloadPix}</textarea>
      <br><br>
      <a href="/">← Voltar à Loja</a>
    </body>
    </html>
  `;

  res.send(paginaPagamento);
});

app.listen(PORT, () => {
  console.log("✅ StellaxSec rodando na porta " + PORT);
});
