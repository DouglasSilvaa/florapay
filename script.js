/** FloraPay — interface de demonstração. Sem API, backend, cobranças ou coleta de cartões. */
(() => {
  'use strict';

  const formatarBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const estados = {
    modo: 'pagamento',
    metodo: 'pix',
    frequencia: 'unica',
    valor: 89.9,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const campoValor = $('#amount-input');
  const erroValor = $('#amount-error');
  const entradaValor = $('.amount-input-wrap');
  const opcoesValor = $('#presets');
  const previaMetodo = $('#method-preview');
  const modal = $('#result-modal');
  const caixaModal = $('.result-modal');
  const botaoEnviar = $('#submit-button');
  const valores = { pagamento: [49.9, 89.9, 149.9], doacao: [25, 50, 100, 200] };
  const nomesMetodos = { pix: 'Pix', boleto: 'Boleto', credito: 'Cartão de crédito', debito: 'Cartão de débito' };
  let ultimoFoco = null;

  function lerValor(texto) {
    // Aceita 50, 50,90, 1.250,50 e 50.90; não arredonda silenciosamente centavos extras.
    const limpo = texto.trim().replace(/\s|R\$/gi, '');
    if (!/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$|^\d+(?:[,.]\d{1,2})?$/.test(limpo)) return NaN;
    const agrupamentoMilhar = /^\d{1,3}(?:\.\d{3})+$/.test(limpo);
    const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : agrupamentoMilhar ? limpo.replace(/\./g, '') : limpo;
    return Number(normalizado);
  }

  function validarValor(mostrarErro = false) {
    const valor = lerValor(campoValor.value);
    const valido = Number.isFinite(valor) && valor >= 1 && valor <= 100000;
    estados.valor = valido ? valor : NaN;
    erroValor.hidden = valido || !mostrarErro;
    entradaValor.classList.toggle('has-error', !valido && mostrarErro);
    campoValor.setAttribute('aria-invalid', String(!valido && mostrarErro));
    $('#summary-amount').textContent = valido ? formatarBRL.format(valor) : '—';
    botaoEnviar.disabled = false; // Mantém a ação disponível para explicar um valor inválido ao clicar.
    return valido;
  }

  function atualizarPresets() {
    const valoresAtuais = valores[estados.modo];
    opcoesValor.innerHTML = '';
    for (const valor of valoresAtuais) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'preset';
      botao.dataset.amount = String(valor);
      botao.textContent = formatarBRL.format(valor);
      botao.addEventListener('click', () => {
        campoValor.value = valor.toFixed(2).replace('.', ',');
        validarValor();
        selecionarPreset();
      });
      opcoesValor.append(botao);
    }
    selecionarPreset();
  }

  function selecionarPreset() {
    for (const botao of $$('.preset')) {
      const selecionado = Number.isFinite(estados.valor) && Math.abs(Number(botao.dataset.amount) - estados.valor) < 0.001;
      botao.classList.toggle('is-selected', selecionado);
      botao.setAttribute('aria-pressed', String(selecionado));
    }
  }

  function mudarModo(modo) {
    if (modo === estados.modo) return;
    estados.modo = modo;
    estados.frequencia = 'unica';
    campoValor.value = modo === 'pagamento' ? '89,90' : '50,00';
    $$('.mode-tab').forEach((botao) => {
      const selecionado = botao.dataset.mode === modo;
      botao.classList.toggle('is-active', selecionado);
      botao.setAttribute('aria-pressed', String(selecionado));
    });
    $('#frequency-section').hidden = modo !== 'doacao';
    $('#amount-label').textContent = modo === 'pagamento' ? 'Escolha o valor' : 'Quanto deseja doar?';
    atualizarFrequencia();
    validarValor();
    atualizarPresets();
    atualizarResumo();
  }

  function atualizarFrequencia() {
    $$('.frequency-choice').forEach((botao) => {
      const selecionado = botao.dataset.frequency === estados.frequencia;
      botao.classList.toggle('is-selected', selecionado);
      botao.setAttribute('aria-pressed', String(selecionado));
    });
    $('#recurring-note').hidden = estados.frequencia !== 'mensal';
    atualizarResumo();
  }

  function criarIcone(nome) {
    const icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icone.setAttribute('class', 'icon');
    icone.setAttribute('aria-hidden', 'true');
    const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    uso.setAttribute('href', `#i-${nome}`);
    icone.append(uso);
    return icone;
  }

  function montarPrevia() {
    previaMetodo.replaceChildren();
    const textos = {
      pix: ['Prático e rápido com Pix', 'Na versão final, QR Code e código de pagamento serão gerados pelo provedor.'],
      boleto: ['Pagamento por boleto', 'A plataforma poderá gerar um boleto válido e acompanhar a confirmação pelo provedor.'],
      credito: ['Cartão de crédito', 'O checkout real usará o formulário seguro ou a página hospedada do provedor.'],
      debito: ['Cartão de débito', 'Disponibilidade e autenticação dependem do intermediador selecionado.'],
    };
    const [titulo, descricao] = textos[estados.metodo];
    const linha = document.createElement('div');
    linha.className = 'method-info';
    const simbolo = document.createElement('span');
    simbolo.className = 'preview-icon';
    simbolo.append(criarIcone(estados.metodo === 'pix' ? 'bolt' : estados.metodo === 'boleto' ? 'bill' : 'shield'));
    const corpo = document.createElement('div');
    const forte = document.createElement('strong');
    forte.textContent = titulo;
    const paragrafo = document.createElement('p');
    paragrafo.textContent = descricao;
    corpo.append(forte, paragrafo);
    linha.append(simbolo, corpo);
    previaMetodo.append(linha);

    if (estados.metodo === 'pix') {
      const arte = document.createElement('div');
      arte.className = 'pix-art';
      arte.innerHTML = '<canvas width="120" height="120" role="img" aria-label="Arte em quadrados ilustrativa, não é um QR Code válido."></canvas><div><span class="art-tag">EXEMPLO VISUAL</span><strong>QR ilustrativo</strong><small>Não escaneável · sem cobrança</small></div>';
      previaMetodo.append(arte);
      desenharArte(arte.querySelector('canvas'));
    } else if (estados.metodo === 'boleto') {
      const arte = document.createElement('div');
      arte.className = 'barcode-art';
      arte.innerHTML = '<span class="barcode-lines" aria-hidden="true"></span><span><strong>Barras ilustrativas</strong><small>Não é um boleto válido</small></span>';
      previaMetodo.append(arte);
    }
  }

  function desenharArte(canvas) {
    // Não tem marcadores de posição nem padrão codificado: é APENAS um mosaico decorativo.
    const contexto = canvas.getContext('2d');
    if (!contexto) return;
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, 120, 120);
    let semente = 1729;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        semente = (semente * 1664525 + 1013904223) >>> 0;
        if (semente % 5 < 2) {
          contexto.fillStyle = '#294d58';
          contexto.fillRect(x * 10 + 2, y * 10 + 2, 6, 6);
        }
      }
    }
  }

  function mudarMetodo(metodo) {
    estados.metodo = metodo;
    $$('.method').forEach((botao) => {
      const selecionado = botao.dataset.method === metodo;
      botao.classList.toggle('is-selected', selecionado);
      botao.setAttribute('aria-pressed', String(selecionado));
    });
    montarPrevia();
    atualizarResumo();
  }

  function atualizarResumo() {
    const doacao = estados.modo === 'doacao';
    $('#summary-label').textContent = doacao ? 'Total da doação' : 'Total do pagamento';
    $('#summary-frequency').textContent = doacao && estados.frequencia === 'mensal'
      ? 'Mensalidade ilustrativa · sem cobrança'
      : 'Cobrança demonstrativa';
    let acao = doacao ? 'Simular doação' : 'Simular pagamento';
    acao += ` com ${nomesMetodos[estados.metodo]}`;
    botaoEnviar.replaceChildren(document.createTextNode(`${acao} `), criarIcone('arrow-right'));
  }

  function abrirModal() {
    if (!validarValor(true)) {
      campoValor.focus();
      return;
    }
    ultimoFoco = document.activeElement;
    $('#receipt-type').textContent = estados.modo === 'doacao'
      ? (estados.frequencia === 'mensal' ? 'Doação mensal (demo)' : 'Doação única')
      : 'Pagamento';
    $('#receipt-method').textContent = nomesMetodos[estados.metodo];
    $('#receipt-value').textContent = formatarBRL.format(estados.valor);
    modal.hidden = false;
    document.body.classList.add('modal-open');
    caixaModal.focus();
  }

  function fecharModal() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (ultimoFoco && typeof ultimoFoco.focus === 'function') ultimoFoco.focus();
  }

  $$('.mode-tab').forEach((botao) => botao.addEventListener('click', () => mudarModo(botao.dataset.mode)));
  $$('.method').forEach((botao) => botao.addEventListener('click', () => mudarMetodo(botao.dataset.method)));
  $$('.frequency-choice').forEach((botao) => botao.addEventListener('click', () => {
    estados.frequencia = botao.dataset.frequency;
    atualizarFrequencia();
  }));
  campoValor.addEventListener('input', () => {
    validarValor();
    selecionarPreset();
  });
  campoValor.addEventListener('blur', () => {
    if (validarValor(true)) campoValor.value = estados.valor.toFixed(2).replace('.', ',');
  });
  botaoEnviar.addEventListener('click', abrirModal);
  $('#modal-close').addEventListener('click', fecharModal);
  $('#modal-done').addEventListener('click', fecharModal);
  modal.addEventListener('click', (evento) => { if (evento.target === modal) fecharModal(); });
  document.addEventListener('keydown', (evento) => {
    if (modal.hidden) return;
    if (evento.key === 'Escape') fecharModal();
    if (evento.key === 'Tab') {
      const botoes = [$('#modal-close'), $('#modal-done')];
      if (evento.shiftKey && document.activeElement === botoes[0]) {
        evento.preventDefault(); botoes[1].focus();
      } else if (!evento.shiftKey && document.activeElement === botoes[1]) {
        evento.preventDefault(); botoes[0].focus();
      } else if (document.activeElement === caixaModal) {
        evento.preventDefault(); (evento.shiftKey ? botoes[1] : botoes[0]).focus();
      }
    }
  });

  validarValor();
  atualizarPresets();
  montarPrevia();
  atualizarResumo();
})();
