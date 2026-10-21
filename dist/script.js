(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.navigation');
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 30);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const closeMenu = (returnFocus = false) => {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (returnFocus) menuButton.focus();
  };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  const desktop = window.matchMedia('(min-width: 701px)');
  const onDesktopChange = () => { if (desktop.matches) closeMenu(); };
  if (desktop.addEventListener) desktop.addEventListener('change', onDesktopChange);
  else if (desktop.addListener) desktop.addListener(onDesktopChange);

  const messages = {
    run: 'Olá, Pulse! Gostava de me juntar aos encontros de corrida. Qual é o próximo treino, o ponto de encontro e o ritmo ou distância previstos? Como posso participar?',
    walk: 'Olá, Pulse! Gostava de participar nas caminhadas. Podem indicar o próximo encontro, o local, a duração e as condições de participação?',
    bike: 'Olá, Pulse! Quero saber mais sobre os encontros de bicicleta. Qual é o próximo, o percurso e a distância previstos? Que equipamento e preparação são necessários?',
    community: 'Olá, Pulse! Gostava de conhecer a comunidade e de experimentar um dos encontros de Run, Walk ou Bike. Podem ajudar-me a escolher o próximo e explicar como participar?'
  };
  const inquiryMessages = {
    partner: 'Olá, Pulse! Tenho interesse em ser vosso parceiro. Gostava de apresentar o meu projeto e conversar sobre uma possível parceria. Como podemos falar?',
    sweat: 'Olá, Pulse! Gostava de saber mais sobre o hoodie Pulse. Podem indicar tamanhos e condições?',
    tshirt: 'Olá, Pulse! Tenho interesse nas t-shirts Pulse. Podem enviar informações sobre modelos, tamanhos, cores, disponibilidade e como encomendar?',
    cap: 'Olá, Pulse! Gostava de saber mais sobre os bonés Pulse. Quais os modelos, cores, disponibilidade e como posso encomendar?',
    tank: 'Olá, Pulse! Tenho interesse nas camisolas de alças Pulse. Podem indicar tamanhos e condições?',
    longsleeve: 'Olá, Pulse! Gostava de saber mais sobre a camisola técnica de manga comprida Pulse. Podem indicar tamanhos e condições?',
    triathlon: 'Olá, Pulse! Tenho interesse no top de triatlo Pulse. Podem indicar tamanhos e condições?'
  };
  const message = document.querySelector('#message-text');
  const status = document.querySelector('#message-status');
  const copyButton = document.querySelector('#copy-message');
  const copyLabel = document.querySelector('#copy-label');
  const fallback = document.querySelector('#copy-fallback');
  const options = [...document.querySelectorAll('[data-goal]')];
  let messageRevision = 0;

  const prepareMessage = (text, goal = null) => {
    messageRevision += 1;
    options.forEach(option => {
      const selected = option.dataset.goal === goal;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    message.textContent = text;
    copyLabel.textContent = 'Copiar mensagem';
    status.textContent = 'Copia a mensagem e cola-a na conversa do Instagram.';
    status.classList.remove('is-error');
    fallback.hidden = true;
  };
  const selectGoal = goal => {
    if (Object.prototype.hasOwnProperty.call(messages, goal)) prepareMessage(messages[goal], goal);
  };
  document.querySelectorAll('[data-inquiry]').forEach(link => link.addEventListener('click', () => {
    const key = link.dataset.inquiry;
    if (Object.prototype.hasOwnProperty.call(inquiryMessages, key)) prepareMessage(inquiryMessages[key]);
  }));
  options.forEach(option => option.addEventListener('click', () => selectGoal(option.dataset.goal)));
  document.querySelectorAll('[data-goal-link]').forEach(link => link.addEventListener('click', () => selectGoal(link.dataset.goalLink)));

  copyButton.addEventListener('click', async () => {
    const text = message.textContent;
    const revision = messageRevision;
    let copied = false;
    copyButton.disabled = true;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      fallback.value = text;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      fallback.setSelectionRange(0, text.length);
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      if (copied) { fallback.hidden = true; copyButton.focus(); }
    } finally { copyButton.disabled = false; }
    if (revision !== messageRevision) {
      status.textContent = copied ? 'Copiaste a mensagem anterior. Copia novamente para usar o objetivo que acabaste de escolher.' : 'O objetivo mudou. Volta a copiar a mensagem atual.';
      copyLabel.textContent = 'Copiar mensagem atual';
      return;
    }
    if (copied) {
      copyLabel.textContent = 'Mensagem copiada ✓';
      status.textContent = 'Agora abre o Instagram e cola a mensagem na conversa com @pulse.training.';
    } else {
      copyLabel.textContent = 'Tentar copiar novamente';
      status.textContent = 'Seleciona e copia o texto abaixo. Depois cola-o na conversa do Instagram.';
      status.classList.add('is-error');
    }
  });
})();
