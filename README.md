# AI2ZIP

> Turn AI-generated code into a real project in seconds.

AI2ZIP is a browser-based tool that converts AI coding responses from tools like **ChatGPT, Claude, Gemini, Copilot, Cursor, Windsurf, and Bolt.new** into a complete project folder that you can edit, run, and download as a `.zip`.

No backend.  
No uploads.  
No accounts.  

Everything runs locally inside your browser.

---

# 🚀 What Does AI2ZIP Do?

When an AI gives you code for a project, it usually comes back as a bunch of separate code blocks:

```
index.html
style.css
script.js
package.json
src/App.jsx
```

Normally, you have to manually create every folder and file.

AI2ZIP does that work for you.

It:

✅ Reads AI-generated responses  
✅ Detects file names automatically  
✅ Recreates the folder structure  
✅ Lets you edit the project  
✅ Lets you save your work  
✅ Exports everything as a ready-to-use ZIP file  

---

# ✨ Features

## 🧠 Smart AI Code Parser

AI2ZIP can understand many different AI response formats.

It can find filenames from:

- `File:` labels

Example:
```
File: src/main.js
```

- Headings

Example:
```
src/main.js
```

- Code fence names

Example:

```
javascript title="src/app.js"
```

- The code itself

Example:

A file containing:

```html
<!DOCTYPE html>
```

can automatically become:

```
index.html
```

---

# 📁 Project Builder

AI2ZIP automatically rebuilds projects like:

```
My Project
│
├── index.html
├── css
│   └── style.css
│
├── js
│   └── app.js
│
└── assets
    └── logo.png
```

No more manually making hundreds of files.

---

# 🛠 Editing Tools

AI2ZIP includes a built-in coding environment:

- VS Code style file explorer
- Code editor
- Syntax highlighting
- Search files
- Find and replace
- Rename files
- Delete files
- Create folders
- Create new files
- Undo and redo

---

# 📦 Export Options

After building your project you can:

### Generate ZIP

Download your finished project:

```
MyProject.zip
```

Ready to open in:

- VS Code
- Visual Studio
- Unity
- Web browsers
- Other development tools

---

### Save Project

Save your work as:

```
Project.ai2zip
```

You can reopen it later and continue editing.

---

# 🔒 Privacy

AI2ZIP runs completely inside your browser.

Your projects:

✅ Stay on your computer  
✅ Are never uploaded  
✅ Do not require an account  
✅ Do not use a server  

Your code belongs to you.

---

# 📂 Project Structure

```
AI2ZIP/
│
├── index.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── main.js       # Application startup
│   ├── parser.js     # AI response parser
│   ├── tree.js       # File system manager
│   ├── zip.js        # ZIP generator
│   ├── editor.js     # Code editor
│   ├── ui.js         # Interface controls
│   ├── storage.js    # Save/load projects
│   └── utils.js      # Helper functions
│
├── assets/
│
└── README.md
```

---

# ▶️ How To Run AI2ZIP

## Method 1: Local Server (Recommended)

### 1. Download AI2ZIP

Download the project ZIP file.

---

### 2. Extract the ZIP

Place the files somewhere on your computer.

Example:

```
Desktop/AI2ZIP
```

---

### 3. Open Command Prompt

Press:

```
Windows Key + R
```

Type:

```
cmd
```

Press Enter.

---

### 4. Navigate to the AI2ZIP folder

Example:

```bash
cd Desktop/AI2ZIP/AI2ZIP
```

Make sure you are inside the folder containing:

```
index.html
```

---

### 5. Start the server

Run:

```bash
python -m http.server 8000
```

---

### 6. Open AI2ZIP

Go to:

```
http://localhost:8000/
```

AI2ZIP should now open.

---

# 📝 How To Use AI2ZIP

1. Copy an AI-generated coding response.

2. Paste it into AI2ZIP.

3. Click:

```
Parse Project
```

or press:

```
CTRL + ENTER
```

4. Review the detected files.

5. Fix any filenames if needed.

6. Edit your project.

7. Click:

```
Generate ZIP
```

8. Open your finished project.

---

# 💡 Supported AI Tools

AI2ZIP works with responses from:

- ChatGPT
- Claude
- Gemini
- Microsoft Copilot
- Cursor
- Windsurf
- Bolt.new
- Other AI coding assistants

---

# 🧪 Recommended Test

Try giving an AI this request:

```
Create a website with:

index.html
css/style.css
js/script.js
assets folder
README.md
```

Then paste the AI response into AI2ZIP.

It should rebuild the project automatically.

---

# 🛣 Roadmap

Future ideas:

- More AI response formats
- AI-powered filename guessing
- Built-in preview window
- GitHub export
- npm project detection
- Framework support:
  - React
  - Vue
  - Angular
  - Next.js
  - Unity projects

---

# 📄 License

MIT License

You are free to use, modify, and improve AI2ZIP.

---

# Made With ❤️

AI2ZIP was created to make turning AI-generated code into real software easier for everyone.
```

This version makes it feel more like a real GitHub project README instead of just documentation notes. It also explains the **problem AI2ZIP solves**, which is usually what makes people understand a project immediately.
