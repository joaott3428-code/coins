// ===== CONFIG =====
  const MOEDAS = [
    { code: 'BRL', nome: 'Real', bandeira: '🇧🇷', base: true },
    { code: 'USD', nome: 'Dólar', bandeira: '🇺🇸', par: 'USDBRL' },
    { code: 'EUR', nome: 'Euro', bandeira: '🇪🇺', par: 'EURBRL' },
    { code: 'GBP', nome: 'Libra', bandeira: '🇬🇧', par: 'GBPBRL' },
    { code: 'BTC', nome: 'Bitcoin', bandeira: '₿', par: 'BTCBRL' },
    { code: 'ETH', nome: 'Ethereum', bandeira: 'Ξ', par: 'ETHBRL' },
    { code: 'ARS', nome: 'Peso Arg.', bandeira: '🇦🇷', par: 'ARSBRL' },
    { code: 'JPY', nome: 'Iene', bandeira: '🇯🇵', par: 'JPYBRL' },
    { code: 'CNY', nome: 'Yuan', bandeira: '🇨🇳', par: 'CNYBRL' },
  ];

  const API_URL = 'https://economia.awesomeapi.com.br/last/' +
    MOEDAS.filter(m => m.par).map(m => m.par).join(',');

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);
  const cardsEl = $('cards');
  const statusEl = $('status');
  const loaderEl = $('loader');
  const errorEl = $('error');
  const refreshBtn = $('refresh-btn');
  const toastContainer = $('toast-container');

  // ===== UTILS =====
  function formatar(num) {
    return 'R$ ' + num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function toast(msg, tipo = 'info') {
    const t = document.createElement('div');
    t.className = 'toast ' + tipo;
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }

  function mostrarLoader() {
    loaderEl.style.display = 'block';
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Atualizando...';
  }

  function esconderLoader() {
    loaderEl.style.display = 'none';
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Atualizar';
  }

  // ===== RENDER =====
  function renderCards(dados) {
    console.log('Renderizando cards com dados:', dados);

    cardsEl.innerHTML = MOEDAS.map((m, i) => {
      const isBase = m.base;
      let valor = null;
      let change = 0;
      let changeClass = 'neutral';

      if (isBase) {
        valor = 1;
      } else if (dados && dados[m.par] && dados[m.par].bid) {
        valor = parseFloat(dados[m.par].bid);
      }

      // Calcular variação (simples — compara com anterior se tiver)
      if (!isBase && valor !== null && window.__ultimasCotacoes && window.__ultimasCotacoes[m.par]) {
        const anterior = window.__ultimasCotacoes[m.par];
        change = ((valor - anterior) / anterior) * 100;
        if (change > 0.01) changeClass = 'up';
        else if (change < -0.01) changeClass = 'down';
      }

      const valorTexto = valor !== null ? formatar(valor) : '—';
      const changeTexto = (!isBase && valor !== null && window.__ultimasCotacoes && window.__ultimasCotacoes[m.par])
        ? (change >= 0 ? '+' : '') + change.toFixed(2) + '%'
        : '';

      return `
        <div class="card ${isBase ? 'base' : ''}">
          <div class="card-left">
            <span class="bandeira">${m.bandeira}</span>
            <div>
              <div class="code">${m.code}</div>
              <div class="nome">${m.nome}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div class="value ${isBase ? 'base' : changeClass}">${valorTexto}</div>
            ${changeTexto ? `<span class="change ${changeClass}">${changeTexto}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Salvar para próxima comparação
    if (dados) {
      window.__ultimasCotacoes = {};
      MOEDAS.filter(m => m.par && dados[m.par] && dados[m.par].bid).forEach(m => {
        window.__ultimasCotacoes[m.par] = parseFloat(dados[m.par].bid);
      });
    }
  }

  // ===== CARREGAR =====
  async function carregar() {
    console.log('Iniciando carregar...');
    mostrarLoader();
    errorEl.style.display = 'none';

    try {
      console.log('Buscando:', API_URL);
      const resp = await fetch(API_URL, { cache: 'no-store' });
      console.log('Status HTTP:', resp.status);

      if (!resp.ok) {
        throw new Error('HTTP ' + resp.status);
      }

      const dados = await resp.json();
      console.log('Dados recebidos:', dados);

      // Validar que temos dados
      const temDados = MOEDAS.filter(m => m.par).some(m => dados[m.par]);
      if (!temDados) {
        throw new Error('API não retornou dados válidos');
      }

      renderCards(dados);

      const agora = new Date();
      statusEl.textContent = 'Atualizado às ' + agora.toLocaleTimeString('pt-BR');
      toast('Cotações atualizadas!', 'success');

    } catch (erro) {
      console.error('Erro ao carregar:', erro);
      errorEl.textContent = '⚠️ ' + erro.message + '. Verifique sua conexão e tente novamente.';
      errorEl.style.display = 'block';
      toast('Falha ao buscar cotações', 'error');
      // Mostrar cards com "—" se já tiver dados anteriores
      if (!cardsEl.innerHTML || cardsEl.innerHTML.trim() === '') {
        renderCards(null);
      }
    } finally {
      esconderLoader();
    }
  }

  // ===== INIT =====
  window.addEventListener('load', () => {
    console.log('Página carregada');
    // Renderizar cards vazios imediatamente
    renderCards(null);
    // Buscar dados
    carregar();

    // Auto-refresh a cada 5 min
    setInterval(() => {
      if (!document.hidden) carregar();
    }, 5 * 60 * 1000);
  });