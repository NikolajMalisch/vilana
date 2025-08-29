// assets/js/vilana-chat.js
// ==========================
// Dies ist der Chatbot-Client für Vilana Event & Catering.
// Er erzeugt ein Chat-Widget auf jeder Seite, lädt je nach Seite
// den passenden Prompt (Catering oder Event) und kommuniziert
// mit dem Cloudflare Worker (/api/chat), der Anfragen an OpenAI weiterleitet.

(function(){
const mountId = 'vilana-ai-chat';
  if (document.getElementById(mountId)) return; // verhindern, dass er doppelt geladen wird

  // Root-Container erzeugen
const root = document.createElement('div');
root.id = mountId;
document.body.appendChild(root);

  // HTML-Struktur des Widgets einfügen
root.innerHTML = `
    <button class="vaic-btn" aria-label="Open chat">
    <img src="/assets/icons/vilana_icon.png" alt="Chat" />
    </button>
    <div class="vaic-win" role="dialog" aria-modal="true">
    <div class="vaic-head">
        <div class="vaic-brand">
        <img src="/favicon-96x96.png" alt="Vilana" />
        <div>
            <div class="title">Vilana — AI Assistent</div>
            <div class="subtitle" data-i18n="subtitle">Fragen zu Menü, Events & Buchung</div>
        </div>
        </div>
        <select aria-label="Language" class="vaic-lang">
        <option value="de">DE</option>
        <option value="ru">RU</option>
        </select>
    </div>

    <div class="vaic-msgs"></div>
    <div class="vaic-quick"></div>

    <form class="vaic-form">
        <input class="vaic-input" type="text" required placeholder="Frage stellen…" />
        <button class="vaic-send" type="submit" data-i18n="send">Senden</button>
    </form>
    <div class="vaic-foot" data-i18n="disclaimer">
        Hinweis: Antworten können Fehler enthalten. Für verbindliche Angebote nutze bitte das Kontaktformular.
    </div>
    </div>
`;

  // Elemente referenzieren
const win = root.querySelector('.vaic-win');
const btn = root.querySelector('.vaic-btn');
const msgs = root.querySelector('.vaic-msgs');
const form = root.querySelector('.vaic-form');
const input = root.querySelector('.vaic-input');
const langSel = root.querySelector('.vaic-lang');
const quick = root.querySelector('.vaic-quick');

  // Standardsprache aus <html lang> bestimmen
const pageLang = (document.documentElement.lang || 'de').toLowerCase().startsWith('ru') ? 'ru' : 'de';
langSel.value = pageLang;

  // Wörterbuch für Übersetzungen (DE/RU)
const tDict = {
    de: {
    hello: 'Hallo! Wie kann ich helfen?',
    typing: 'Der Assistent schreibt…',
    placeholder: 'Frage stellen (z. B. „Buffet für 50 Personen?“)',
    send: 'Senden',
    disclaimer: 'Hinweis: Antworten können Fehler enthalten. Für verbindliche Angebote nutze bitte das Kontaktformular.',
    subtitle: 'Fragen zu Menü, Events & Buchung',
    quick: ['Angebot anfordern', 'Menü & Preise', 'Russian Oktoberfest']
    },
    ru: {
    hello: 'Здравствуйте! Чем могу помочь?',
    typing: 'Ассистент печатает…',
    placeholder: 'Задайте вопрос (например: «Буфет на 50 человек?»)',
    send: 'Отправить',
    disclaimer: 'Внимание: ответы могут содержать неточности. Для точного предложения используйте форму контакта.',
    subtitle: 'Вопросы по меню и бронированию',
    quick: ['Запросить предложение', 'Меню и цены', 'Russian Oktoberfest']
    }
    };

  // Sprache anwenden (Placeholder, Buttons, Quick Chips)
    function i18nApply(){
    const L = tDict[langSel.value];
    root.querySelector('[data-i18n="disclaimer"]').textContent = L.disclaimer;
    root.querySelector('[data-i18n="send"]').textContent = L.send;
    root.querySelector('[data-i18n="subtitle"]').textContent = L.subtitle;
    input.placeholder = L.placeholder;
    quick.innerHTML = '';
    L.quick.forEach(q => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'vaic-chip';
    chip.textContent = q;
    chip.addEventListener('click', () => {
        input.value = q;
        form.requestSubmit();
    });
    quick.appendChild(chip);
    });
}

  // Chatblasen hinzufügen
function addBubble(role, text){
    const div = document.createElement('div');
    div.className = 'vaic-bubble ' + (role === 'user' ? 'from-user' : 'from-bot');
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

  // "Tippt..." Indikator
function showTyping(show){
    let tip = root.querySelector('.vaic-typing');
    if (show) {
    if (!tip){
        tip = document.createElement('div');
        tip.className = 'vaic-typing';
        tip.textContent = tDict[langSel.value].typing;
        msgs.appendChild(tip);
    }
    } else if (tip) {
    tip.remove();
    }
}

  // Prompt-Datei laden (abhängig von Seite)
async function fetchSystem(){
    try {
      const isEvent = window.location.pathname.includes('event.html'); // wenn auf Event-Seite → spezieller Prompt
    const file = isEvent ? '/public/bot-prompt-event.txt' : '/public/bot-prompt.txt';
    const res = await fetch(file, { cache: 'no-store' });
    let txt = await res.text();
    txt += `\n\nAktuelle Sprache / Текущий язык: ${langSel.value}`;
    return txt;
    } catch {
    return `Du bist der AI-Assistent von Vilana. Antworte kurz, höflich. Keine Fixpreise, nur Richtwerte. Frage nach Personenanzahl, Datum, Ort, Budget, Menü (warm/kalt), Service.`;
    }
}

  // Anfrage an den Worker → OpenAI
async function callAI(history){
    const system = await fetchSystem();
    const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages: history, model: 'gpt-4o-mini', temperature: 0.4 })
    });
    if (!resp.ok) throw new Error('Netzwerkfehler');
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'AI Fehler');
    return data.answer || '';
}

  // UI: Button Klick
btn.addEventListener('click', () => {
    const opened = win.classList.toggle('open');
    btn.innerHTML = opened
    ? '<span style="font-size:18px;">✕</span>'
    : '<img src="/assets/icons/vilana_icon.png" alt="Chat" />';
    if (opened && msgs.children.length === 0){
    addBubble('assistant', tDict[langSel.value].hello);
    }
});

  // Sprache umstellen
langSel.addEventListener('change', i18nApply);
i18nApply();

    // Formular absenden
    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addBubble('user', text);
    input.value = '';

    showTyping(true);

    try {
      // Chatverlauf aus DOM extrahieren
    const history = Array.from(msgs.querySelectorAll('.vaic-bubble')).map(n => ({
        role: n.classList.contains('from-user') ? 'user' : 'assistant',
        content: n.textContent
    }));

    const answer = await callAI(history);
    showTyping(false);
    addBubble('assistant', answer);
    } catch (err) {
    showTyping(false);
    addBubble('assistant', 'Fehler / Ошибка: ' + (err.message || 'Unbekannt'));
    }
});
})();
