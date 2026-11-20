// ===== CONFIG =====
  const MOEDAS = [
    { code: 'BRL', nome: 'Real', bandeira: '🇧🇷', base: true },
    { code: 'USD', nome: 'Dólar', bandeira: '🇺🇸', par: 'USD-BRL' },
    { code: 'EUR', nome: 'Euro', bandeira: '🇪🇺', par: 'EUR-BRL' },
    { code: 'GBP', nome: 'Libra', bandeira: '🇬🇧', par: 'GBP-BRL' },
    { code: 'BTC', nome: 'Bitcoin', bandeira: '₿', par: 'BTC-BRL' },
    { code: 'ETH', nome: 'Ethereum', bandeira: 'Ξ', par: 'ETH-BRL' },
    { code: 'ARS', nome: 'Peso Arg.', bandeira: '🇦🇷', par: 'ARS-BRL' },
    { code: 'JPY', nome: 'Iene', bandeira: '🇯🇵', par: 'JPY-BRL' },
    { code: 'CNY', nome: 'Yuan', bandeira: '🇨🇳', par: 'CNY-BRL' },
  ];

  const API_URL = 'https://economia.awesomeapi.com.br/json/last/' +
    MOEDAS.filter(m => m.par).map(m => m.par).join(',');

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);
  const cardsEl = $('cards');
  const statusEl = $('status');
  const loaderEl = $('loader');
  const errorEl = $('error');
  const refreshBtn = $('refresh-btn');
  const toastContainer = $('toast-container');

  // ===== CACHE LOCAL =====
  function salvarCache(dados) {
    try {
      localStorage.setItem('cambio-dados', JSON.stringify({ dados, quando: Date.now() }));
    } catch (e) {}
  }

  function lerCache() {
    try {
      const raw = localStorage.getItem('cambio-dados');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

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
    cardsEl.innerHTML = MOEDAS.map((m) => {
      const isBase = m.base;
      let valor = null;
      let change = 0;
      let changeClass = 'neutral';

      if (isBase) {
        valor = 1;
      } else if (dados) {
        const key = m.par.replace('-', ''); // USDBRL, EURBRL...
        if (dados[key] && dados[key].bid) {
          valor = parseFloat(dados[key].bid);
        }
      }

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
  }

  // ===== CARREGAR =====
  let ultimaChamada = 0;

  async function carregar(manual = false) {
    const agora = Date.now();
    if (manual && agora - ultimaChamada < 10000) {
      toast('Aguarde alguns segundos antes de atualizar de novo');
      return;
    }
    ultimaChamada = agora;

    mostrarLoader();
    errorEl.style.display = 'none';

    try {
      console.log('Buscando:', API_URL);
      const resp = await fetch(API_URL, { cache: 'no-store' });
      console.log('Status HTTP:', resp.status);

      if (resp.status === 429) {
        throw new Error('Limite de requisições da API atingido. Aguarde 1 minuto.');
      }
      if (!resp.ok) {
        throw new Error('HTTP ' + resp.status);
      }

      const dados = await resp.json();
      console.log('Dados recebidos:', dados);

      const temDados = MOEDAS.filter(m => m.par).some(m => dados[m.par.replace('-', '')]);
      if (!temDados) {
        throw new Error('API não retornou dados válidos');
      }

      renderCards(dados);
      salvarCache(dados);

      window.__ultimasCotacoes = {};
      MOEDAS.filter(m => m.par && dados[m.par.replace('-', '')] && dados[m.par.replace('-', '')].bid).forEach(m => {
        window.__ultimasCotacoes[m.par] = parseFloat(dados[m.par.replace('-', '')].bid);
      });

      statusEl.textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR');
      toast('Cotações atualizadas!', 'success');

    } catch (erro) {
      console.error('Erro ao carregar:', erro);

      const cache = lerCache();
      if (cache && cache.dados) {
        renderCards(cache.dados);
        const quando = new Date(cache.quando).toLocaleTimeString('pt-BR');
        statusEl.textContent = 'Sem conexão — mostrando dados de ' + quando;
        errorEl.textContent = '⚠️ ' + erro.message;
        errorEl.style.display = 'block';
      } else {
        if (!cardsEl.innerHTML.trim()) renderCards(null);
        errorEl.textContent = '⚠️ ' + erro.message + ' — verifique sua conexão.';
        errorEl.style.display = 'block';
      }
      toast('Falha ao buscar cotações', 'error');

    } finally {
      esconderLoader();
    }
  }

  // ===== INIT =====
  window.addEventListener('load', () => {
    const cache = lerCache();
    if (cache && cache.dados) {
      renderCards(cache.dados);
    } else {
      renderCards(null);
    }

    carregar(false);

    setInterval(() => {
      if (!document.hidden) carregar(false);
    }, 5 * 60 * 1000);
  });
