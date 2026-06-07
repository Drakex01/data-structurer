# 🔮 DataForge — Unstructured Data Structurer

> Transform messy, unstructured text into perfectly structured JSON, CSV, or SQL using AI-powered prompting pipelines.

<img width="1189" height="922" alt="image" src="https://github.com/user-attachments/assets/c0ef0d06-1a72-4576-b844-6291a5449827" />


## ✨ Live Demo
👉 **[Try it live](https://YOUR_USERNAME.github.io/unstructured-data-structurer)**

---

## 🚀 What It Does

Paste any unstructured text — customer emails, PDF resumes, meeting transcripts — and DataForge uses a carefully engineered prompt pipeline to extract perfectly structured data every time.

### Supported Input Types
| Type | Example |
|------|---------|
| 📧 Customer Emails | Support threads, complaints, inquiries |
| 📄 Resumes/CVs | Raw resume text from PDFs |
| 🎤 Meeting Transcripts | Raw recordings or notes |
| ✨ Custom | Any text with a custom schema |

### Output Formats
- `{ }` **JSON** — syntax highlighted, schema-validated
- `⊞` **CSV** — ready for spreadsheets / databases
- `🗄️` **SQL** — `INSERT` statements ready to execute

---

## 🧠 Prompting Techniques Demonstrated

### 1. Strict Output Formatting
```
Return ONLY a valid JSON object.
No markdown, no explanation, no code fences.
```

### 2. Few-Shot Prompting
```
EXAMPLE 1:
INPUT: "Hi, I'm Lisa Park (lisa@example.com), my order #1234 never arrived."
OUTPUT: {"sender_name":"Lisa Park","sender_email":"lisa@example.com",...}
```

### 3. Constraint Management
```
If a field cannot be found in the text, set it to null.
Do NOT guess or invent values.
```

### 4. Schema Anchoring
```
Extract these fields:
  - "sender_name" (string)
  - "sentiment" (enum: positive, neutral, negative)
  - "action_required" (boolean)
```

---

## 🛠️ How to Run

**Option 1 — Open directly:**
```bash
# Just open index.html in any browser!
```

**Option 2 — Local server:**
```bash
python -m http.server 3000
# Visit: http://localhost:3000
```

**Option 3 — Node.js:**
```bash
npx serve .
```

---

## 🔑 Using with Gemini API

1. Get a free API key at [aistudio.google.com](https://aistudio.google.com)
2. Click the ⚙️ **Settings** icon in the app
3. Paste your key and **disable Demo Mode**
4. Works with `gemini-2.0-flash` (recommended) or `gemini-1.5-pro`

> **Demo Mode** works out of the box with no API key — great for exploring!

---

## 📁 Project Structure

```
unstructured-data-structurer/
├── index.html   # App shell, tabs, panels, modals
├── style.css    # Dark-mode design system, glassmorphism, animations
└── app.js       # Prompt builder, Gemini API, demo engine, history
```

## 🎨 Tech Stack

- **Pure HTML + CSS + JavaScript** — zero dependencies
- **Gemini API** (`gemini-2.0-flash`) for live AI structuring
- **Glassmorphism UI** with animated particle canvas
- **localStorage** for history & settings persistence

---

## 🌟 Features

- [x] 4 data type presets with smart schema defaults
- [x] Visual schema builder with drag-to-reorder
- [x] Few-shot example editor (inject examples into the prompt live)
- [x] Constraint toggles (null for missing, normalize dates, etc.)
- [x] Live generated prompt preview
- [x] Syntax-highlighted JSON / CSV / SQL output
- [x] Conversion history (last 50 runs, localStorage)
- [x] Download output as file
- [x] Drag-and-drop `.txt` file input
- [x] `Ctrl+Enter` keyboard shortcut
- [x] GitHub Pages deployable (no backend)

---

## 📄 License
MIT — free to use, modify, and build upon.
