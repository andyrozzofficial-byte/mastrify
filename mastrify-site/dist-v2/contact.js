/* Kontaktsidan.
   Två saker bor här: vår egen ämnesväljare, som ersätter webbläsarens
   grå standardmeny, och knappen som lämnar över till mejlprogrammet.
   Sidan har ingen server som kan ta emot ett formulär, så ingenting
   skickas härifrån: vi skriver brevet färdigt och användaren trycker
   själv på skicka i sitt eget program. Allt lyssnas av på document, så
   det överlever att sidan ritas om när man byter vy. */
(() => {
  'use strict';
  const ADDRESS = 'hello@mastrify.com';
  const box = () => document.querySelector('.topic-picker');
  const items = frame => [...frame.querySelectorAll('[role=option]')];

  function setOpen(open, {focusList = true} = {}) {
    const frame = box();
    if (!frame) return;
    const button = frame.querySelector('.topic-button');
    const list = frame.querySelector('.topic-list');
    if (!button || !list) return;
    list.hidden = !open;
    frame.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    if (open && focusList) {
      const current = list.querySelector('[aria-selected=true]') || list.firstElementChild;
      current?.focus();
    }
  }

  function choose(option) {
    const frame = box();
    if (!frame || !option) return;
    for (const item of items(frame)) item.setAttribute('aria-selected', String(item === option));
    frame.dataset.value = option.dataset.topic || '';
    frame.dataset.tone = option.dataset.tone || '';
    const label = frame.querySelector('.topic-current');
    if (label) label.textContent = option.dataset.topic || '';
    setOpen(false);
    frame.querySelector('.topic-button')?.focus();
  }

  function step(from, move) {
    const frame = box();
    if (!frame) return;
    const list = items(frame);
    if (!list.length) return;
    const at = list.indexOf(from);
    const next = move === 'first' ? 0
      : move === 'last' ? list.length - 1
      : Math.min(list.length - 1, Math.max(0, (at < 0 ? 0 : at) + move));
    list[next].focus();
  }

  document.addEventListener('click', event => {
    const frame = box();
    if (!frame) return;
    if (event.target.closest('.topic-button')) {
      setOpen(frame.querySelector('.topic-list')?.hidden !== false);
      return;
    }
    const option = event.target.closest('[role=option]');
    if (option && frame.contains(option)) { choose(option); return; }
    if (!event.target.closest('.topic-picker')) setOpen(false, {focusList: false});
  });

  document.addEventListener('keydown', event => {
    const frame = box();
    if (!frame || !frame.contains(event.target)) return;
    const onButton = !!event.target.closest('.topic-button');
    const option = event.target.closest('[role=option]');
    if (event.key === 'Escape' && frame.classList.contains('is-open')) {
      event.preventDefault(); setOpen(false); frame.querySelector('.topic-button')?.focus(); return;
    }
    if (onButton && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault(); setOpen(true); return;
    }
    if (!option) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); step(option, 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); step(option, -1); }
    else if (event.key === 'Home') { event.preventDefault(); step(option, 'first'); }
    else if (event.key === 'End') { event.preventDefault(); step(option, 'last'); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(option); }
  });

  // v2: the ticket is posted to the support endpoint (MastrifyConfig).
  // Without a backend, or when it fails, the mail app opens with the
  // same message prepared: exactly the live site's fallback.
  const config = () => window.MastrifyConfig || {};
  const address = () => config().supportEmail || ADDRESS;
  function mailto(subject, body) {
    return 'mailto:' + address() + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  async function postTicket(ticket) {
    const endpoint = config().supportEndpoint;
    if (!endpoint || typeof fetch !== 'function') throw new Error('No support endpoint');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(config().supportTimeout) || 6000);
    try {
      const response = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(ticket), signal: controller.signal});
      if (!response.ok) throw new Error('Support endpoint answered ' + response.status);
      return response;
    } finally { clearTimeout(timer); }
  }
  let sending = false;
  document.addEventListener('submit', async event => {
    const form = event.target.closest('#support-form');
    if (!form) return;
    event.preventDefault();
    if (sending) return;
    const status = form.querySelector('#support-status');
    const field = form.querySelector('#support-message');
    const emailField = form.querySelector('#support-email');
    const button = form.querySelector('#support-send');
    const note = (field?.value || '').trim();
    const reply = (emailField?.value || '').trim();
    if (!note) {
      if (status) status.textContent = 'Write a short message first.';
      field?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(reply)) {
      if (status) status.textContent = 'Add the email you want the reply sent to.';
      emailField?.focus();
      return;
    }
    const topic = box()?.dataset.value || 'Support';
    const name = (form.querySelector('#support-name')?.value || '').trim();
    const subject = 'Mastrify support · ' + topic;
    const body = 'Topic: ' + topic + '\n' + (name ? 'Name: ' + name + '\n' : '') + 'Reply to: ' + reply + '\n\n' + note;
    sending = true;
    if (button) button.disabled = true;
    if (status) status.textContent = 'Sending your ticket…';
    try {
      await postTicket({topic, name, email: reply, message: note, page: location.pathname, sentAt: new Date().toISOString()});
      if (status) status.textContent = 'Ticket sent. We reply to ' + reply + ', typically within one business day.';
      form.reset();
    } catch (_) {
      if (status) status.textContent = 'The ticket service is not connected yet, so your mail app opens with the message ready. If nothing happens, write to ' + address() + '.';
      location.href = mailto(subject, body);
    } finally {
      sending = false;
      if (button) button.disabled = false;
    }
  });
})();
