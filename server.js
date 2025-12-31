const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Porta para Render
const PORT = process.env.PORT || 3000;

// ===== DADOS EM MEMÓRIA (simulação) =====
let checkouts = {};
let vendas = [];

// ===== ROTA TESTE =====
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Backend ExpCocoRaiz rodando 👍",
  });
});

// ===== CRIAR CHECKOUT =====
app.post("/api/criar-checkout", (req, res) => {
  const { maquinaId, quantidade, valorCentavos } = req.body;

  if (!maquinaId || !quantidade || !valorCentavos) {
    return res.status(400).json({ ok: false, error: "Dados inválidos" });
  }

  const id = "CHK_" + Date.now();

  checkouts[id] = {
    id,
    maquinaId,
    quantidade,
    valorCentavos,
    status: "PENDENTE",
    createdAt: new Date().toISOString(),
    paidAt: null,
    consumedAt: null,
  };

  res.json({
    ok: true,
    checkoutId: id,
    checkout: checkouts[id],
  });
});

// ===== APROVAR CHECKOUT (manual por enquanto) =====
app.post("/api/teste-aprovar", (req, res) => {
  const { checkoutId } = req.body;

  const c = checkouts[checkoutId];
  if (!c) return res.status(404).json({ ok: false, error: "Checkout não existe" });

  c.status = "APROVADO";
  c.paidAt = new Date().toISOString();

  res.json({ ok: true, checkout: c });
});

// ===== CONSUMIR CHECKOUT (quando a máquina abre) =====
app.post("/api/consumir", (req, res) => {
  const { checkoutId } = req.body;

  const c = checkouts[checkoutId];
  if (!c) return res.status(404).json({ ok: false, error: "Checkout não existe" });
  if (c.status !== "APROVADO")
    return res.status(400).json({ ok: false, error: "Checkout ainda não aprovado" });

  c.status = "CONSUMIDO";
  c.consumedAt = new Date().toISOSt
