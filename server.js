const express = require('express');
const cors = require('cors');

// Cria app
const app = express();
app.use(cors());
app.use(express.json());

// Porta que o Render passa na variável de ambiente
const PORT = process.env.PORT || 3000;

// "Banco de dados" em memória
let checkouts = {}; // id -> checkout
let vendas = [];    // lista de vendas

// Função simples para gerar IDs
function gerarId(prefixo) {
  const aleatorio = Math.random().toString(36).substring(2, 10);
  const tempo = Date.now().toString(36);
  return `${prefixo}_${tempo}${aleatorio}`;
}

// Rota de teste (para ver se o backend está no ar)
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend ExpCocoRaiz rodando 👍'
  });
});

// ===== 1) CRIAR CHECKOUT =====
app.post('/api/criar-checkout', (req, res) => {
  const { maquinaId, quantidade, valorCentavos } = req.body;

  if (!maquinaId || !quantidade || !valorCentavos) {
    return res.status(400).json({
      ok: false,
      error: 'Dados inválidos'
    });
  }

  const checkoutId = gerarId('CHK');
  const totalCentavos = quantidade * valorCentavos;

  const checkout = {
    id: checkoutId,
    maquinaId,
    quantidade,
    valorCentavos,
    totalCentavos,
    status: 'PENDENTE',
    criadoEm: new Date().toISOString(),
    pagoEm: null,
    consumidoEm: null
  };

  checkouts[checkoutId] = checkout;

  // Aqui seria o PIX "copia e cola" real. Vamos simular.
  const pixCopiaECola = `PIX_FAKE_${checkoutId}`;

  res.json({
    ok: true,
    checkoutId,
    pixCopiaECola,
    totalCentavos
  });
});

// ===== 2) CONSULTAR STATUS DO CHECKOUT =====
app.get('/api/status-checkout/:id', (req, res) => {
  const { id } = req.params;
  const checkout = checkouts[id];

  if (!checkout) {
    return res.status(404).json({
      ok: false,
      error: 'Checkout não encontrado'
    });
  }

  res.json({
    ok: true,
    checkout
  });
});

// ===== 3) MARCAR CHECKOUT COMO PAGO (simulação) =====
app.post('/api/marcar-pago', (req, res) => {
  const { checkoutId } = req.body;

  const checkout = checkouts[checkoutId];
  if (!checkout) {
    return res.status(404).json({
      ok: false,
      error: 'Checkout não encontrado'
    });
  }

  checkout.status = 'PAGO';
  checkout.pagoEm = new Date().toISOString();

  res.json({
    ok: true,
    checkout
  });
});

// ===== 4) CONSUMIR CHECKOUT (abrir porta da máquina) =====
app.post('/api/consumir', (req, res) => {
  const { checkoutId } = req.body;

  const checkout = checkouts[checkoutId];
  if (!checkout) {
    return res.status(404).json({
      ok: false,
      error: 'Checkout não encontrado'
    });
  }

  if (checkout.status !== 'PAGO') {
    return res.status(400).json({
      ok: false,
      error: 'Checkout ainda não está pago'
    });
  }

  checkout.status = 'CONSUMIDO';
  checkout.consumidoEm = new Date().toISOString();

  // registra venda
  vendas.push({
    id: gerarId('VENDA'),
    checkoutId: checkout.id,
    maquinaId: checkout.maquinaId,
    quantidade: checkout.quantidade,
    valorCentavos: checkout.valorCentavos,
    totalCentavos: checkout.totalCentavos,
    dataHora: new Date().toISOString()
  });

  res.json({
    ok: true,
    message: 'Checkout consumido e venda registrada'
  });
});

// ===== 5) LISTAR VENDAS (simples) =====
app.get('/api/vendas', (req, res) => {
  res.json({
    ok: true,
    vendas
  });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
