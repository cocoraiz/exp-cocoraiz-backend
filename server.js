// server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());

// ===== "BANCO" EM MEMÓRIA (APENAS PARA TESTE) =====
const maquinas = {
  EXPCOCO01: {
    id: 'EXPCOCO01',
    nomeLocal: 'Loja Teste',
    precoGarrafaCentavos: 450, // R$ 4,50
    ativo: true
  }
};

const checkouts = {}; // checkoutId -> objeto
const vendas = [];    // lista simples de vendas

function gerarId(prefixo) {
  return prefixo + '_' + crypto.randomBytes(4).toString('hex');
}

// ===== ROTA DE TESTE =====
app.get('/', (req, res) => {
  res.send('Backend ExpCocoRaiz sem PIX2U rodando.');
});

// ===== 1) POST /api/checkout =====
app.post('/api/checkout', (req, res) => {
  const { maquinaId, quantidade } = req.body;

  if (!maquinaId || !quantidade) {
    return res.status(400).json({ error: 'maquinaId e quantidade são obrigatórios.' });
  }

  const maquina = maquinas[maquinaId];
  if (!maquina || !maquina.ativo) {
    return res.status(400).json({ error: 'Máquina inválida ou inativa.' });
  }

  const qtd = parseInt(quantidade, 10);
  if (isNaN(qtd) || qtd < 1 || qtd > 20) {
    return res.status(400).json({ error: 'Quantidade inválida (1 a 20).' });
  }

  const valorCentavos = qtd * maquina.precoGarrafaCentavos;

  const checkoutId = gerarId('CHK');

  const agora = new Date().toISOString();

  // Aqui no futuro entra Mercado Pago.
  // Por enquanto, vamos criar um "Pix Copia e Cola" fake.
  const pixFake = `PIX-FAKE-${checkoutId}`;

  checkouts[checkoutId] = {
    id: checkoutId,
    maquinaId,
    quantidade: qtd,
    valorCentavos,
    status: 'PENDENTE', // depois vira APROVADO e CONSUMIDO
    mpPaymentId: null,
    createdAt: agora,
    paidAt: null,
    consumedAt: null,
    pixCopiaECola: pixFake
  };

  res.json({
    checkoutId,
    maquinaId,
    quantidade: qtd,
    valorCentavos,
    valorFormatado: (valorCentavos / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }),
    pixCopiaECola: pixFake,
    expiraEm: null // no futuro podemos usar validade
  });
});

// ===== 2) GET /api/status-checkout =====
app.get('/api/status-checkout', (req, res) => {
  const { checkoutId } = req.query;

  if (!checkoutId || !checkouts[checkoutId]) {
    return res.status(404).json({ error: 'Checkout não encontrado.' });
  }

  const c = checkouts[checkoutId];
  res.json({
    checkoutId: c.id,
    status: c.status
  });
});

// ===== 3) GET /api/comandos =====
// Chamado pela ESP32
app.get('/api/comandos', (req, res) => {
  const { maquinaId } = req.query;

  if (!maquinaId || !maquinas[maquinaId]) {
    return res.status(400).json({ error: 'Máquina inválida.' });
  }

  // procura algum checkout APROVADO e ainda não CONSUMIDO
  const pendente = Object.values(checkouts).find(
    c => c.maquinaId === maquinaId && c.status === 'APROVADO'
  );

  if (!pendente) {
    return res.json({ temComando: false });
  }

  res.json({
    temComando: true,
    checkoutId: pendente.id,
    quantidade: pendente.quantidade,
    valorCentavos: pendente.valorCentavos
  });
});

// ===== 4) POST /api/confirmar-venda =====
// Chamado pela ESP32 após abrir a porta
app.post('/api/confirmar-venda', (req, res) => {
  const { checkoutId, maquinaId } = req.body;

  if (!checkoutId || !maquinaId || !checkouts[checkoutId]) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  const c = checkouts[checkoutId];

  if (c.maquinaId !== maquinaId) {
    return res.status(400).json({ error: 'Máquina não confere com o checkout.' });
  }

  if (c.status !== 'APROVADO' && c.status !== 'PENDENTE') {
    return res.status(400).json({ error: 'Checkout já consumido ou cancelado.' });
  }

  const agora = new Date().toISOString();
  c.status = 'CONSUMIDO';
  c.consumedAt = agora;

  vendas.push({
    id: gerarId('VENDA'),
    checkoutId: c.id,
    maquinaId: c.maquinaId,
    quantidade: c.quantidade,
    valorCentavos: c.valorCentavos,
    dataHora: agora
  });

  res.json({ ok: true });
});

// ===== 5) ROTA DE TESTE PARA "APROVAR" MANUALMENTE UM CHECKOUT =====
// (enquanto não integramos Mercado Pago)
app.post('/api/teste-aprovar', (req, res) => {
  const { checkoutId } = req.body;
  const c = checkouts[checkoutId];
  if (!c) {
    return res.status(404).json({ error: 'Checkout não encontrado.' });
  }
  c.status = 'APROVADO';
  c.paidAt = new Date().toISOString();
  res.json({ ok: true, checkoutId: c.id, status: c.status });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
