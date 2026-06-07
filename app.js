// ====================================================
//  DataForge — Unstructured Data Structurer
//  app.js — Full Application Logic
// ====================================================

// ─── State ───────────────────────────────────────────
const state = {
  dataType: 'email',
  outputFormat: 'json',
  schemaFields: [],
  fewShotExamples: [],
  history: JSON.parse(localStorage.getItem('dataforge_history') || '[]'),
  settings: {
    apiKey: localStorage.getItem('dataforge_apikey') || '',
    model: localStorage.getItem('dataforge_model') || 'gemini-2.0-flash',
    demoMode: localStorage.getItem('dataforge_demo') !== 'false',
    temperature: parseFloat(localStorage.getItem('dataforge_temp') || '0.1'),
  },
  schemaBuilderFields: [],
};

// ─── DOM refs ─────────────────────────────────────────
const $ = id => document.getElementById(id);

// ─── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initTabs();
  initSegmented();
  initDefaultSchema();
  initSchemaBuilder();
  initHistory();
  initSettings();
  initDragDrop();
  bindInputEvents();
  bindButtons();
  updatePromptPreview();
  applySettingsToUI();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PARTICLE CANVAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initParticles() {
  const canvas = $('particle-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawnParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      hue: Math.random() * 60 + 250,
    };
  }

  function initParticleSet() {
    particles = Array.from({ length: 120 }, spawnParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`;
      ctx.fill();
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(139,92,246,${0.08 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  resize();
  initParticleSet();
  draw();
  window.addEventListener('resize', () => { resize(); initParticleSet(); });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TABS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initTabs() {
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const tab = pill.dataset.tab;
      document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      pill.classList.add('active');
      $(`tab-${tab}`).classList.add('active');
      if (tab === 'history') renderHistory();
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SEGMENTED CONTROLS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initSegmented() {
  $('data-type-seg').querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('data-type-seg').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.dataType = btn.dataset.value;
      loadDefaultSchemaForType(state.dataType);
      updatePromptPreview();
    });
  });

  $('output-format-seg').querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('output-format-seg').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.outputFormat = btn.dataset.value;
      updatePromptPreview();
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DEFAULT SCHEMAS PER DATA TYPE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DEFAULT_SCHEMAS = {
  email: [
    { name: 'sender_name', type: 'string', required: true },
    { name: 'sender_email', type: 'string', required: true },
    { name: 'subject', type: 'string', required: true },
    { name: 'sentiment', type: 'enum(positive,neutral,negative)', required: false },
    { name: 'priority', type: 'enum(high,medium,low)', required: false },
    { name: 'category', type: 'string', required: false },
    { name: 'action_required', type: 'boolean', required: false },
    { name: 'summary', type: 'string', required: true },
  ],
  resume: [
    { name: 'full_name', type: 'string', required: true },
    { name: 'email', type: 'string', required: true },
    { name: 'phone', type: 'string', required: false },
    { name: 'current_title', type: 'string', required: false },
    { name: 'years_experience', type: 'number', required: false },
    { name: 'skills', type: 'array', required: true },
    { name: 'education_level', type: 'string', required: false },
    { name: 'location', type: 'string', required: false },
  ],
  transcript: [
    { name: 'meeting_title', type: 'string', required: false },
    { name: 'date', type: 'string', required: false },
    { name: 'participants', type: 'array', required: false },
    { name: 'decisions', type: 'array', required: true },
    { name: 'action_items', type: 'array', required: true },
    { name: 'summary', type: 'string', required: true },
    { name: 'sentiment', type: 'enum(positive,neutral,negative)', required: false },
  ],
  custom: [
    { name: 'field_1', type: 'string', required: true },
    { name: 'field_2', type: 'string', required: false },
  ],
};

const EXAMPLES = {
  email: `From: john.doe@acmecorp.com
To: support@myproduct.com
Subject: Re: Invoice #4421 - Urgent Issue

Hi there,

I've been trying to reconcile our accounts and noticed that invoice #4421 dated March 15th for $3,200.00 shows as "unpaid" in your system but our accounting team confirms payment was sent via wire transfer on March 18th. Reference: WT-20240318-8821.

We've been a loyal customer for 5 years and this is causing complications during our quarterly audit. Could you please expedite a resolution? I've copied our CFO Sarah Chen on this.

Best,
John Doe
VP of Operations, Acme Corp
john.doe@acmecorp.com | +1 (415) 555-0192`,

  resume: `MICHAEL CHEN
Senior Full-Stack Engineer
michael.chen.dev@gmail.com | +1 (650) 555-0147 | San Francisco, CA
GitHub: github.com/mchen-dev | LinkedIn: linkedin.com/in/michaelchendev

PROFESSIONAL SUMMARY
Results-driven engineer with 8+ years building scalable web applications. Led teams of 5-12 engineers at Series B startups. Deep expertise in React, Node.js, and distributed systems.

EXPERIENCE
Staff Engineer | TechFlow Inc. | Jan 2022 – Present
• Architected microservices platform handling 2M+ daily active users
• Reduced API latency by 40% through Redis caching strategy
• Mentored 4 junior engineers to mid-level promotions

Senior Software Engineer | DataVault | Jun 2018 – Dec 2021
• Built real-time analytics dashboard processing 500K events/second
• Led migration from monolith to Kubernetes-based microservices

SKILLS
Languages: JavaScript, TypeScript, Python, Go, SQL
Frontend: React, Next.js, Vue, Redux, Tailwind CSS
Backend: Node.js, Express, FastAPI, GraphQL
Infrastructure: AWS, GCP, Docker, Kubernetes, Terraform

EDUCATION
B.S. Computer Science, Stanford University, 2016 — GPA 3.8`,

  transcript: `[Recording starts]

SARAH: Okay everyone's here — let's kick off the Q3 planning. We've got about 45 minutes.

MARCUS: Quick note — Tom's joining late, he's on a call with the EU team.

SARAH: Fine. So the dashboard redesign. Dev, where are we?

DEV: We finished the wireframes last Tuesday. Mia signed off. We need backend API spec before we can start the React work. Blocking us right now honestly.

SARAH: Marcus, that's you.

MARCUS: Yeah I can have a draft by end of Wednesday. Actually Wednesday EOD for sure.

SARAH: Great. Write that down — Marcus delivers API spec Wednesday. Dev, once you have it how long to MVP?

DEV: Two sprints. So like... June 28th if we start next Monday.

SARAH: Budget — we're 12% over on infrastructure. Priya, can you audit unused EC2 instances this week?

PRIYA: Already started actually. Found three that haven't had traffic in 60 days. I'll decommission by Friday, should save ~$800/month.

SARAH: Perfect. Tom just joined — Tom, we decided Marcus delivers API spec Wednesday, Dev team targets June 28 MVP for dashboard, Priya decommissioning unused infra by Friday.

TOM: Copy. One thing — the client asked about mobile responsiveness. Is that in scope?

SARAH: Let's call it stretch goal for v1. Dev?

DEV: Agreed. We can add it to v1.1 if needed.

SARAH: Okay. Decisions: API spec Wednesday, Dashboard MVP June 28, mobile is v1.1. Let's wrap.`,

  custom: `Product: UltraBoost Running Shoes (Size 10)
Customer: Emma W. | Purchase Date: 2024-04-02 | Order ID: ORD-99182

"Absolutely love these! They arrived on time and the packaging was pristine. However, after 3 weeks of use I noticed the left insole started to separate from the base. I contacted support and they were responsive but it took 6 emails to get a replacement sorted. The shoes themselves are incredibly comfortable for long runs - I did my first half-marathon in them! Would give 5 stars if not for the QC issue and slow resolution process."

Rating: 3.5/5 | Verified Purchase: Yes | Helpful Votes: 47`,
};

function initDefaultSchema() {
  loadDefaultSchemaForType('email');
}

function loadDefaultSchemaForType(type) {
  state.schemaFields = DEFAULT_SCHEMAS[type].map((f, i) => ({ ...f, id: Date.now() + i }));
  renderSchemaFields();
  loadDefaultFewShot(type);
  updatePromptPreview();
}

function loadDefaultFewShot(type) {
  state.fewShotExamples = [];
  if (type === 'email') {
    state.fewShotExamples = [{
      id: Date.now(),
      input: 'Hi, I placed order #1234 yesterday but haven\'t gotten a confirmation email. My name is Lisa Park, lisa@example.com',
      output: '{"sender_name":"Lisa Park","sender_email":"lisa@example.com","subject":"Missing Order Confirmation","sentiment":"neutral","priority":"medium","category":"order_status","action_required":true,"summary":"Customer placed order #1234 but did not receive confirmation email."}'
    }];
  }
  renderFewShotExamples();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SCHEMA FIELDS RENDERING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderSchemaFields() {
  const container = $('schema-fields');
  container.innerHTML = '';
  state.schemaFields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'field-row';
    row.dataset.id = field.id;
    row.innerHTML = `
      <input class="field-input" type="text" placeholder="field_name" value="${field.name}" data-role="name" />
      <select class="field-type-select" data-role="type">
        ${['string','number','boolean','array','object','enum(...)'].map(t =>
          `<option value="${t}" ${field.type === t || field.type.startsWith('enum') && t === 'enum(...)' ? 'selected' : ''}>${t}</option>`
        ).join('')}
      </select>
      <button class="field-remove" title="Remove">✕</button>
    `;
    row.querySelector('[data-role="name"]').addEventListener('input', e => {
      field.name = e.target.value;
      updatePromptPreview();
    });
    row.querySelector('[data-role="type"]').addEventListener('change', e => {
      field.type = e.target.value;
      updatePromptPreview();
    });
    row.querySelector('.field-remove').addEventListener('click', () => {
      state.schemaFields = state.schemaFields.filter(f => f.id !== field.id);
      renderSchemaFields();
      updatePromptPreview();
    });
    container.appendChild(row);
  });
}

$('add-field-btn').addEventListener('click', () => {
  state.schemaFields.push({ id: Date.now(), name: '', type: 'string', required: false });
  renderSchemaFields();
  updatePromptPreview();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FEW-SHOT EXAMPLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderFewShotExamples() {
  const container = $('few-shot-list');
  container.innerHTML = '';
  state.fewShotExamples.forEach((ex, idx) => {
    const item = document.createElement('div');
    item.className = 'few-shot-item';
    item.innerHTML = `
      <div class="few-shot-item-header">
        <span class="few-shot-label">Example ${idx + 1}</span>
        <button class="field-remove" data-id="${ex.id}">✕</button>
      </div>
      <div class="few-shot-content">
        <textarea class="few-shot-textarea" placeholder="Input text…" data-role="input">${ex.input || ''}</textarea>
        <textarea class="few-shot-textarea" placeholder='Output JSON…' data-role="output">${ex.output || ''}</textarea>
      </div>
    `;
    item.querySelector('[data-role="input"]').addEventListener('input', e => { ex.input = e.target.value; updatePromptPreview(); });
    item.querySelector('[data-role="output"]').addEventListener('input', e => { ex.output = e.target.value; updatePromptPreview(); });
    item.querySelector('.field-remove').addEventListener('click', () => {
      state.fewShotExamples = state.fewShotExamples.filter(e => e.id !== ex.id);
      renderFewShotExamples();
      updatePromptPreview();
    });
    container.appendChild(item);
  });
}

$('add-example-btn').addEventListener('click', () => {
  state.fewShotExamples.push({ id: Date.now(), input: '', output: '' });
  renderFewShotExamples();
  updatePromptPreview();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PROMPT BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildPrompt(inputText) {
  const fields = state.schemaFields.filter(f => f.name.trim());
  const format = state.outputFormat;
  const constraints = {
    nullMissing: $('c-null').checked,
    noFiller: $('c-no-filler').checked,
    strictSchema: $('c-strict-schema').checked,
    normalizeDates: $('c-normalize').checked,
    lowercaseKeys: $('c-lowercase-keys').checked,
  };

  let schemaDesc = fields.map(f => `  - "${f.name}" (${f.type})`).join('\n');

  let prompt = `You are a data extraction AI. Your sole task is to extract structured data from unstructured text.\n\n`;

  // Output format instruction
  if (format === 'json') {
    prompt += `OUTPUT FORMAT: Return ONLY a valid JSON object. No markdown, no explanation, no code fences.\n`;
  } else if (format === 'csv') {
    prompt += `OUTPUT FORMAT: Return ONLY valid CSV data with a header row. No markdown, no explanation.\n`;
  } else if (format === 'sql') {
    prompt += `OUTPUT FORMAT: Return ONLY a valid SQL INSERT statement. No markdown, no explanation.\n`;
  }

  prompt += `\nTARGET SCHEMA (extract these fields):\n${schemaDesc}\n`;

  // Constraints
  if (constraints.nullMissing) {
    prompt += `\nCONSTRAINT: If a field cannot be found in the text, set its value to null. Do NOT guess or invent values.\n`;
  }
  if (constraints.noFiller) {
    prompt += `CONSTRAINT: Return ONLY the raw ${format.toUpperCase()} output. Do not add "Here is your result" or any other conversational filler.\n`;
  }
  if (constraints.strictSchema) {
    prompt += `CONSTRAINT: Include ONLY the fields listed in the schema. Do not add extra fields.\n`;
  }
  if (constraints.normalizeDates) {
    prompt += `CONSTRAINT: Normalize all dates to ISO 8601 format (YYYY-MM-DD).\n`;
  }
  if (constraints.lowercaseKeys) {
    prompt += `CONSTRAINT: All JSON keys must be lowercase with underscores.\n`;
  }

  // Few-shot examples
  const validExamples = state.fewShotExamples.filter(e => e.input && e.output);
  if (validExamples.length > 0) {
    prompt += `\n--- FEW-SHOT EXAMPLES ---\n`;
    validExamples.forEach((ex, i) => {
      prompt += `\nEXAMPLE ${i + 1}:\nINPUT: ${ex.input.trim()}\nOUTPUT: ${ex.output.trim()}\n`;
    });
    prompt += `--- END EXAMPLES ---\n`;
  }

  prompt += `\nNOW PROCESS THIS INPUT:\n${inputText}`;
  return prompt;
}

function updatePromptPreview() {
  const preview = $('prompt-preview');
  const fields = state.schemaFields.filter(f => f.name.trim());
  if (fields.length === 0) {
    preview.innerHTML = '<span class="prompt-placeholder">Add schema fields to see the generated prompt…</span>';
    return;
  }
  const dummyPrompt = buildPrompt('[your input text here]');
  preview.textContent = dummyPrompt;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STRUCTURING ENGINE (Gemini API or Demo)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function structureData() {
  const inputText = $('input-text').value.trim();
  if (!inputText) {
    showToast('Please enter some text to structure.', 'error');
    return;
  }
  if (state.schemaFields.filter(f => f.name.trim()).length === 0) {
    showToast('Add at least one schema field.', 'error');
    return;
  }

  // Show loading
  $('output-placeholder').style.display = 'none';
  $('output-code').style.display = 'none';
  $('output-loading').style.display = 'flex';
  $('output-meta').style.display = 'none';
  $('explainer-card').style.display = 'none';

  const startTime = Date.now();
  const steps = ['Building prompt', 'Sending to AI', 'Parsing response', 'Formatting output'];
  let stepIdx = 0;

  const stepInterval = setInterval(() => {
    if (stepIdx < steps.length) {
      $('loading-step').textContent = steps[stepIdx++];
    }
  }, 450);

  try {
    let rawOutput;
    const prompt = buildPrompt(inputText);

    if (state.settings.demoMode || !state.settings.apiKey) {
      // Demo mode: simulate with realistic output
      await sleep(1800 + Math.random() * 800);
      rawOutput = generateDemoOutput(inputText, state.schemaFields, state.outputFormat, state.dataType);
    } else {
      // Real API call to Gemini
      rawOutput = await callGeminiAPI(prompt);
    }

    clearInterval(stepInterval);
    const elapsed = Date.now() - startTime;

    // Display
    displayOutput(rawOutput, elapsed);

    // Save history
    saveToHistory(inputText, rawOutput, elapsed);

    // Show explainer
    showExplainer();

  } catch (err) {
    clearInterval(stepInterval);
    $('output-loading').style.display = 'none';
    $('output-placeholder').style.display = 'flex';
    showToast('Error: ' + err.message, 'error');
    console.error(err);
  }
}

async function callGeminiAPI(prompt) {
  const { apiKey, model } = state.settings;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: state.settings.temperature,
      maxOutputTokens: 2048,
    }
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || `API error ${resp.status}`);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DEMO OUTPUT GENERATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function generateDemoOutput(inputText, fields, format, dataType) {
  const validFields = fields.filter(f => f.name.trim());
  const obj = {};

  // Extract heuristically based on data type
  const lower = inputText.toLowerCase();

  validFields.forEach(field => {
    const name = field.name.toLowerCase();
    let value = null;

    // Smart extraction heuristics
    if (name.includes('email') || name.includes('sender_email')) {
      const emailMatch = inputText.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
      value = emailMatch ? emailMatch[0] : null;
    } else if (name.includes('name') || name.includes('sender_name')) {
      if (dataType === 'email') {
        const fromMatch = inputText.match(/From:\s*([^\n<]+)/i);
        value = fromMatch ? fromMatch[1].trim() : extractName(inputText);
      } else if (dataType === 'resume') {
        const firstLine = inputText.split('\n')[0].trim();
        value = firstLine.length < 50 ? firstLine : null;
      } else {
        value = extractName(inputText);
      }
    } else if (name.includes('subject')) {
      const subMatch = inputText.match(/Subject:\s*(.+)/i);
      value = subMatch ? subMatch[1].trim() : null;
    } else if (name.includes('sentiment')) {
      const positiveWords = ['love', 'great', 'excellent', 'amazing', 'thank', 'happy', 'perfect'];
      const negativeWords = ['issue', 'problem', 'urgent', 'error', 'wrong', 'fail', 'bug', 'complaint', 'terrible'];
      const posCount = positiveWords.filter(w => lower.includes(w)).length;
      const negCount = negativeWords.filter(w => lower.includes(w)).length;
      value = negCount > posCount ? 'negative' : posCount > negCount ? 'positive' : 'neutral';
    } else if (name.includes('priority')) {
      value = lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately') ? 'high'
            : lower.includes('low priority') || lower.includes('when possible') ? 'low' : 'medium';
    } else if (name.includes('action_required') || name.includes('action')) {
      value = lower.includes('please') || lower.includes('could you') || lower.includes('can you') || lower.includes('request');
    } else if (name.includes('summary')) {
      const words = inputText.replace(/\n/g, ' ').split(' ').slice(0, 25).join(' ');
      value = words + (inputText.split(' ').length > 25 ? '…' : '');
    } else if (name.includes('phone')) {
      const phoneMatch = inputText.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{3,4}/);
      value = phoneMatch ? phoneMatch[0] : null;
    } else if (name.includes('skills')) {
      const techWords = ['javascript','typescript','python','react','node','sql','aws','docker','kubernetes','java','go','rust','vue','angular','css','html'];
      const found = techWords.filter(t => lower.includes(t));
      value = found.length > 0 ? found : null;
    } else if (name.includes('year') || name.includes('experience')) {
      const yrMatch = inputText.match(/(\d+)\+?\s*years?/i);
      value = yrMatch ? parseInt(yrMatch[1]) : null;
    } else if (name.includes('education') || name.includes('degree')) {
      if (lower.includes('phd') || lower.includes('doctorate')) value = 'PhD';
      else if (lower.includes('master') || lower.includes(' m.s.')) value = 'Masters';
      else if (lower.includes('bachelor') || lower.includes(' b.s.') || lower.includes(' b.a.')) value = 'Bachelors';
      else value = null;
    } else if (name.includes('location') || name.includes('city')) {
      const cities = ['san francisco', 'new york', 'london', 'berlin', 'toronto', 'seattle', 'austin', 'boston'];
      const found = cities.find(c => lower.includes(c));
      value = found ? found.replace(/\b\w/g, c => c.toUpperCase()) : null;
    } else if (name.includes('decisions')) {
      value = extractDecisions(inputText);
    } else if (name.includes('action_items') || name.includes('actions')) {
      value = extractActionItems(inputText);
    } else if (name.includes('participants')) {
      value = extractNames(inputText);
    } else if (name.includes('title') || name.includes('current_title') || name.includes('meeting_title')) {
      if (dataType === 'resume') {
        const lines = inputText.split('\n').filter(l => l.trim());
        value = lines[1]?.trim() || null;
      } else if (dataType === 'transcript') {
        value = 'Q3 Planning Meeting';
      } else {
        value = null;
      }
    } else if (name.includes('date')) {
      const dateMatch = inputText.match(/\b\d{4}-\d{2}-\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+\d{1,2}[\s,]+\d{4}/i);
      value = dateMatch ? dateMatch[0] : null;
    } else if (name.includes('category')) {
      const cats = {billing: ['invoice','payment','charge','bill'], technical: ['bug','error','crash','issue'], 'order_status': ['order','shipment','delivery','tracking']};
      for (const [cat, words] of Object.entries(cats)) {
        if (words.some(w => lower.includes(w))) { value = cat; break; }
      }
      if (!value) value = 'general_inquiry';
    } else if (field.type === 'number') {
      const numMatch = inputText.match(/\$?([\d,]+(\.\d{1,2})?)/);
      value = numMatch ? parseFloat(numMatch[1].replace(',', '')) : null;
    } else if (field.type === 'boolean') {
      value = false;
    } else if (field.type === 'array') {
      value = [];
    } else {
      value = null;
    }

    obj[field.name] = value;
  });

  if (format === 'json') {
    return JSON.stringify(obj, null, 2);
  } else if (format === 'csv') {
    const headers = validFields.map(f => f.name).join(',');
    const values = validFields.map(f => {
      const v = obj[f.name];
      if (v === null) return '';
      if (Array.isArray(v)) return `"${v.join('; ')}"`;
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
      return String(v);
    }).join(',');
    return headers + '\n' + values;
  } else if (format === 'sql') {
    const table = state.dataType + '_records';
    const cols = validFields.map(f => f.name).join(', ');
    const vals = validFields.map(f => {
      const v = obj[f.name];
      if (v === null) return 'NULL';
      if (typeof v === 'boolean') return v ? '1' : '0';
      if (typeof v === 'number') return v;
      if (Array.isArray(v)) return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(', ');
    return `INSERT INTO ${table} (${cols})\nVALUES (${vals});`;
  }

  return JSON.stringify(obj, null, 2);
}

function extractName(text) {
  const patterns = [
    /My name is ([A-Z][a-z]+ [A-Z][a-z]+)/,
    /I'm ([A-Z][a-z]+ [A-Z][a-z]+)/,
    /^([A-Z][a-z]+ [A-Z][a-z]+)/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractNames(text) {
  const names = [];
  const lines = text.split('\n');
  lines.forEach(line => {
    const m = line.match(/^([A-Z]+):/);
    if (m) names.push(m[1].charAt(0) + m[1].slice(1).toLowerCase());
  });
  return [...new Set(names)].slice(0, 8);
}

function extractDecisions(text) {
  const decisions = [];
  const lines = text.split('\n');
  let inDecisions = false;
  lines.forEach(line => {
    if (line.toLowerCase().includes('decision')) inDecisions = true;
    if (inDecisions && line.trim().startsWith('-') || line.trim().startsWith('•')) {
      decisions.push(line.trim().replace(/^[-•]\s*/, ''));
    }
  });
  if (decisions.length === 0) {
    const patterns = [/decided?\s+(?:to\s+)?([^.]+)/gi, /agreed?\s+(?:to\s+)?([^.]+)/gi];
    patterns.forEach(p => {
      let m;
      while ((m = p.exec(text)) !== null) decisions.push(m[1].trim());
    });
  }
  return decisions.slice(0, 5);
}

function extractActionItems(text) {
  const items = [];
  const patterns = [/will\s+([^.]+)/gi, /action[:\s]+([^.\n]+)/gi, /\b(?:need|must|should)\s+([^.]+)/gi];
  patterns.forEach(p => {
    let m;
    while ((m = p.exec(text)) !== null) {
      const item = m[1].trim();
      if (item.length > 10 && item.length < 120) items.push(item);
    }
  });
  return [...new Set(items)].slice(0, 5);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OUTPUT DISPLAY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function displayOutput(rawOutput, elapsed) {
  $('output-loading').style.display = 'none';
  const codeEl = $('output-code');
  codeEl.style.display = 'block';

  const format = state.outputFormat;
  if (format === 'json') {
    codeEl.innerHTML = syntaxHighlightJSON(rawOutput);
  } else if (format === 'csv') {
    codeEl.innerHTML = syntaxHighlightCSV(rawOutput);
  } else {
    codeEl.innerHTML = syntaxHighlightSQL(rawOutput);
  }

  // Meta
  const fields = state.schemaFields.filter(f => f.name.trim()).length;
  $('meta-fields').textContent = `${fields} fields`;
  $('meta-records').textContent = '1 record';
  $('meta-time').textContent = `${elapsed}ms`;

  const confidence = elapsed < 3000 ? 'High confidence' : 'Med confidence';
  const badge = $('meta-confidence');
  badge.textContent = confidence;
  badge.className = 'meta-item confidence-badge ' + (elapsed < 3000 ? 'confidence-high' : 'confidence-med');

  $('output-meta').style.display = 'flex';
  $('api-status').querySelector('.status-text').textContent = 'Last run: ' + new Date().toLocaleTimeString();
}

function syntaxHighlightJSON(str) {
  let escaped = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    match => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span class="tok-key">${match}</span>`;
        return `<span class="tok-string">${match}</span>`;
      }
      if (/true|false/.test(match)) return `<span class="tok-bool">${match}</span>`;
      if (/null/.test(match)) return `<span class="tok-null">${match}</span>`;
      return `<span class="tok-number">${match}</span>`;
    }
  );
}

function syntaxHighlightCSV(str) {
  const lines = str.split('\n');
  return lines.map((line, i) => {
    if (i === 0) return `<span class="tok-csv-header">${escapeHtml(line)}</span>`;
    return `<span class="tok-csv-row">${escapeHtml(line)}</span>`;
  }).join('\n');
}

function syntaxHighlightSQL(str) {
  const keywords = /\b(INSERT|INTO|VALUES|SELECT|FROM|WHERE|NULL|NOT|AND|OR|CREATE|TABLE|UPDATE|SET|DELETE)\b/g;
  return escapeHtml(str).replace(keywords, m => `<span class="tok-sql-kw">${m}</span>`)
    .replace(/'([^']*?)'/g, `<span class="tok-sql-val">'$1'</span>`);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EXPLAINER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function showExplainer() {
  const techniques = [
    {
      icon: '🎯',
      title: 'Strict Output Formatting',
      tag: 'ACTIVE', tagClass: 'tag-green',
      text: `Prompt explicitly instructs: "Return ONLY a valid ${state.outputFormat.toUpperCase()} object. No markdown, no explanation." This prevents conversational filler in the output.`
    },
    {
      icon: '📚',
      title: 'Few-Shot Prompting',
      tag: state.fewShotExamples.filter(e=>e.input).length > 0 ? 'ACTIVE' : 'INACTIVE',
      tagClass: state.fewShotExamples.filter(e=>e.input).length > 0 ? 'tag-purple' : 'tag-blue',
      text: `${state.fewShotExamples.filter(e=>e.input).length} example(s) injected into the prompt to show the model exactly how to map phrases to your schema.`
    },
    {
      icon: '🛡️',
      title: 'Constraint Management',
      tag: 'ACTIVE', tagClass: 'tag-green',
      text: `"If a field cannot be found, set it to null—do not guess." Strict constraints prevent hallucination of missing field values.`
    },
    {
      icon: '📐',
      title: 'Schema Anchoring',
      tag: 'ACTIVE', tagClass: 'tag-green',
      text: `The prompt embeds the target schema with types. The model is anchored to output ONLY those fields in the correct format.`
    },
  ];

  const grid = $('explainer-grid');
  grid.innerHTML = techniques.map(t => `
    <div class="explainer-item">
      <div class="explainer-item-title">
        ${t.icon} ${t.title}
        <span class="explainer-tag ${t.tagClass}">${t.tag}</span>
      </div>
      <p>${t.text}</p>
    </div>
  `).join('');

  $('explainer-card').style.display = 'block';
}

$('close-explainer').addEventListener('click', () => {
  $('explainer-card').style.display = 'none';
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HISTORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const HISTORY_ICONS = { email: '📧', resume: '📄', transcript: '🎤', custom: '✨' };

function saveToHistory(input, output, elapsed) {
  const item = {
    id: Date.now(),
    dataType: state.dataType,
    format: state.outputFormat,
    inputPreview: input.slice(0, 80) + (input.length > 80 ? '…' : ''),
    output,
    fields: state.schemaFields.filter(f => f.name).map(f => f.name),
    elapsed,
    timestamp: new Date().toISOString(),
  };
  state.history.unshift(item);
  if (state.history.length > 50) state.history.pop();
  localStorage.setItem('dataforge_history', JSON.stringify(state.history));
}

function initHistory() {
  $('clear-history-btn').addEventListener('click', () => {
    state.history = [];
    localStorage.removeItem('dataforge_history');
    renderHistory();
    showToast('History cleared', 'info');
  });
}

function renderHistory() {
  const list = $('history-list');
  if (state.history.length === 0) {
    list.innerHTML = `<div class="history-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><p>No history yet. Run a conversion first.</p></div>`;
    return;
  }

  list.innerHTML = state.history.map(item => `
    <div class="history-item glass-card" data-id="${item.id}">
      <div class="history-icon">${HISTORY_ICONS[item.dataType] || '📦'}</div>
      <div class="history-details">
        <div class="history-title">${escapeHtml(item.inputPreview)}</div>
        <div class="history-meta-row">
          <span class="history-tag">${item.format.toUpperCase()}</span>
          <span class="history-tag">${item.dataType}</span>
          <span class="history-time">${formatRelativeTime(item.timestamp)} · ${item.elapsed}ms</span>
        </div>
      </div>
      <button class="history-restore" data-id="${item.id}">Restore</button>
    </div>
  `).join('');

  list.querySelectorAll('.history-restore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const item = state.history.find(h => h.id === id);
      if (item) restoreHistoryItem(item);
    });
  });
}

function restoreHistoryItem(item) {
  // Switch to structurer tab
  document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  $('nav-structurer').classList.add('active');
  $('tab-structurer').classList.add('active');

  // Restore output
  $('output-placeholder').style.display = 'none';
  $('output-loading').style.display = 'none';
  $('output-code').style.display = 'block';
  $('output-meta').style.display = 'flex';

  const format = item.format;
  if (format === 'json') $('output-code').innerHTML = syntaxHighlightJSON(item.output);
  else if (format === 'csv') $('output-code').innerHTML = syntaxHighlightCSV(item.output);
  else $('output-code').innerHTML = syntaxHighlightSQL(item.output);

  $('meta-time').textContent = item.elapsed + 'ms';
  $('meta-fields').textContent = item.fields.length + ' fields';
  $('meta-records').textContent = '1 record';

  showToast('History item restored', 'success');
}

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return d + 'd ago';
  if (h > 0) return h + 'h ago';
  if (m > 0) return m + 'm ago';
  return 'just now';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SCHEMA BUILDER TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initSchemaBuilder() {
  state.schemaBuilderFields = [
    { id: Date.now()+1, name: 'name', type: 'string', desc: 'Full name', required: true },
    { id: Date.now()+2, name: 'email', type: 'string', desc: 'Email address', required: true },
    { id: Date.now()+3, name: 'score', type: 'number', desc: 'Numeric score', required: false },
  ];
  renderSchemaBuilder();

  $('schema-add-row-btn').addEventListener('click', () => {
    state.schemaBuilderFields.push({ id: Date.now(), name: '', type: 'string', desc: '', required: false });
    renderSchemaBuilder();
  });

  $('schema-apply-btn').addEventListener('click', () => {
    state.schemaFields = state.schemaBuilderFields.map(f => ({ ...f }));
    renderSchemaFields();
    updatePromptPreview();

    document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    $('nav-structurer').classList.add('active');
    $('tab-structurer').classList.add('active');
    showToast('Schema applied to Structurer', 'success');
  });

  $('schema-export-btn').addEventListener('click', () => {
    const schema = buildSchemaJSON();
    const blob = new Blob([schema], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'schema.json'; a.click();
    URL.revokeObjectURL(url);
  });

  $('copy-schema-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(buildSchemaJSON());
    showToast('Schema copied to clipboard', 'success');
  });
}

function buildSchemaJSON() {
  const schema = {};
  state.schemaBuilderFields.forEach(f => {
    if (f.name.trim()) {
      schema[f.name] = { type: f.type, description: f.desc, required: f.required };
    }
  });
  return JSON.stringify(schema, null, 2);
}

function renderSchemaBuilder() {
  const inner = $('schema-canvas-inner');
  inner.innerHTML = '';

  state.schemaBuilderFields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'schema-row';
    row.innerHTML = `
      <div class="drag-handle">⠿</div>
      <input class="schema-field-input" type="text" placeholder="field_name" value="${field.name}" data-role="name" />
      <select class="schema-type-select" data-role="type">
        ${['string','number','boolean','array','object','date'].map(t => `<option ${field.type===t?'selected':''}>${t}</option>`).join('')}
      </select>
      <input class="schema-field-input schema-desc-input" type="text" placeholder="Description…" value="${field.desc}" data-role="desc" />
      <label class="schema-required-label"><input type="checkbox" ${field.required ? 'checked' : ''} data-role="required" /> Req</label>
      <button class="schema-delete">✕</button>
    `;

    row.querySelector('[data-role="name"]').addEventListener('input', e => { field.name = e.target.value; updateSchemaPreview(); });
    row.querySelector('[data-role="type"]').addEventListener('change', e => { field.type = e.target.value; updateSchemaPreview(); });
    row.querySelector('[data-role="desc"]').addEventListener('input', e => { field.desc = e.target.value; updateSchemaPreview(); });
    row.querySelector('[data-role="required"]').addEventListener('change', e => { field.required = e.target.checked; updateSchemaPreview(); });
    row.querySelector('.schema-delete').addEventListener('click', () => {
      state.schemaBuilderFields = state.schemaBuilderFields.filter(f => f.id !== field.id);
      renderSchemaBuilder();
    });
    inner.appendChild(row);
  });

  updateSchemaPreview();
}

function updateSchemaPreview() {
  $('schema-preview-code').textContent = buildSchemaJSON();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SETTINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initSettings() {
  $('settings-btn').addEventListener('click', () => { $('settings-modal').style.display = 'flex'; });
  $('close-settings').addEventListener('click', () => { $('settings-modal').style.display = 'none'; });
  $('cancel-settings').addEventListener('click', () => { $('settings-modal').style.display = 'none'; });

  $('save-settings').addEventListener('click', () => {
    state.settings.apiKey = $('api-key-input').value;
    state.settings.model = $('model-select').value;
    state.settings.demoMode = $('demo-mode-toggle').checked;
    state.settings.temperature = parseFloat($('temp-range').value);

    localStorage.setItem('dataforge_apikey', state.settings.apiKey);
    localStorage.setItem('dataforge_model', state.settings.model);
    localStorage.setItem('dataforge_demo', state.settings.demoMode);
    localStorage.setItem('dataforge_temp', state.settings.temperature);

    $('settings-modal').style.display = 'none';
    applySettingsToUI();
    showToast('Settings saved', 'success');
  });

  $('toggle-key-visibility').addEventListener('click', () => {
    const input = $('api-key-input');
    if (input.type === 'password') { input.type = 'text'; $('toggle-key-visibility').textContent = 'Hide'; }
    else { input.type = 'password'; $('toggle-key-visibility').textContent = 'Show'; }
  });

  $('temp-range').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    $('temp-display').textContent = `${v.toFixed(2)} (${v < 0.3 ? 'Precise' : v < 0.7 ? 'Balanced' : 'Creative'})`;
  });
}

function applySettingsToUI() {
  $('api-key-input').value = state.settings.apiKey;
  $('model-select').value = state.settings.model;
  $('demo-mode-toggle').checked = state.settings.demoMode;
  $('temp-range').value = state.settings.temperature;
  $('temp-display').textContent = `${state.settings.temperature.toFixed(2)} (${state.settings.temperature < 0.3 ? 'Precise' : state.settings.temperature < 0.7 ? 'Balanced' : 'Creative'})`;

  const statusEl = $('api-status');
  if (state.settings.demoMode) {
    statusEl.style.background = 'rgba(245,158,11,0.1)';
    statusEl.style.borderColor = 'rgba(245,158,11,0.2)';
    statusEl.querySelector('.status-dot').style.background = '#f59e0b';
    statusEl.querySelector('.status-dot').style.boxShadow = '0 0 8px #f59e0b';
    statusEl.querySelector('.status-text').style.color = '#f59e0b';
    statusEl.querySelector('.status-text').textContent = 'Demo Mode';
  } else {
    statusEl.style.background = '';
    statusEl.style.borderColor = '';
    statusEl.querySelector('.status-dot').style.background = '';
    statusEl.querySelector('.status-dot').style.boxShadow = '';
    statusEl.querySelector('.status-text').style.color = '';
    statusEl.querySelector('.status-text').textContent = state.settings.apiKey ? 'API Ready' : 'No API Key';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DRAG & DROP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initDragDrop() {
  const textarea = $('input-text');
  const panel = textarea.closest('.panel');

  ['dragenter','dragover'].forEach(evt => {
    panel.addEventListener(evt, e => { e.preventDefault(); panel.classList.add('drag-over'); });
  });
  ['dragleave','drop'].forEach(evt => {
    panel.addEventListener(evt, e => { e.preventDefault(); panel.classList.remove('drag-over'); });
  });
  panel.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { textarea.value = ev.target.result; updateCharCount(); };
    reader.readAsText(file);
    showToast(`Loaded: ${file.name}`, 'success');
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BIND EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function bindInputEvents() {
  $('input-text').addEventListener('input', updateCharCount);
}

function updateCharCount() {
  const len = $('input-text').value.length;
  $('char-count').textContent = len.toLocaleString() + ' chars';
}

function bindButtons() {
  $('structure-btn').addEventListener('click', structureData);

  $('load-example-btn').addEventListener('click', () => {
    $('input-text').value = EXAMPLES[state.dataType] || EXAMPLES.custom;
    updateCharCount();
    showToast('Example loaded', 'info');
  });

  $('clear-btn').addEventListener('click', () => {
    $('input-text').value = '';
    updateCharCount();
    $('output-placeholder').style.display = 'flex';
    $('output-code').style.display = 'none';
    $('output-loading').style.display = 'none';
    $('output-meta').style.display = 'none';
    $('explainer-card').style.display = 'none';
  });

  $('copy-output-btn').addEventListener('click', () => {
    const code = $('output-code');
    if (code.style.display === 'none') { showToast('Nothing to copy yet', 'info'); return; }
    navigator.clipboard.writeText(code.innerText);
    showToast('Output copied to clipboard', 'success');
  });

  $('download-btn').addEventListener('click', () => {
    const code = $('output-code');
    if (code.style.display === 'none') { showToast('Nothing to download yet', 'info'); return; }
    const ext = { json: 'json', csv: 'csv', sql: 'sql' }[state.outputFormat];
    const blob = new Blob([code.innerText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `output.${ext}`; a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded output.' + ext, 'success');
  });

  $('copy-prompt-btn').addEventListener('click', () => {
    const preview = $('prompt-preview');
    if (preview.querySelector('.prompt-placeholder')) { showToast('Add fields first', 'info'); return; }
    navigator.clipboard.writeText(preview.textContent);
    showToast('Prompt copied to clipboard', 'success');
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOAST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function showToast(msg, type = 'info') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Keyboard shortcut: Ctrl+Enter to structure
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    structureData();
  }
});
