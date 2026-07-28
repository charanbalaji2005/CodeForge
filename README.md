# Orbit-Compiler — CodeForge Desktop IDE

> **CodeForge MCPC Compiler & Desktop Application**  
> High-performance handwritten MiniCPP (`mcpc`) compiler, real-time visual AST structural tree parser, Groq Llama-3 AI Suite, Google OAuth 2.0, and MongoDB Atlas database storage.

![CodeForge Logo](codeforge/frontend/public/logo.png)

---

## 🌟 Key Features

- ⚙️ **Handwritten MiniCPP (`mcpc`) Compiler**: Native compiler binary supporting heap classes, aggregate structs, pointer arithmetic, and system calls.
- 🚀 **Multi-Language Support**: Run C++, C, Python 3, JavaScript (Node.js), Java 17, Go, and Rust directly in Monaco Editor.
- 🤖 **Groq Llama-3 AI Suite**:
  - 📝 **AI Code Summary**: 1-click concise bullet-point summary of any active code file.
  - 🔧 **AI Error Auto-Fix**: Automatically diagnoses compiler errors and applies fixed code directly into Monaco Editor.
  - ✍️ **AI Code Writer**: Generates custom code functions from natural language prompts.
- 🌳 **Real-Time Visual AST Tree**: Parses preprocessor directives, structs, classes, parameters, and function scopes live as you type.
- 💻 **Offline Local Storage**: All workspace files persist in `Documents/mcpc-projects` across machine restarts.
- 🔑 **Google OAuth 2.0 & MongoDB Atlas**: Real Google authentication persisting user profiles in MongoDB Atlas (`CodeForge` database).
- 📱 **Mobile & Tablet Responsive**: Fully responsive layout designed for mobile screens, tablets, and desktop displays.

---

## 🚀 Quick Start

### 1. Web IDE & Frontend (Next.js)
```bash
cd codeforge/frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Execution Backend Sandbox
```bash
cd codeforge/backend
npm install
npm run dev
```
API server runs on `http://localhost:5000`.

### 3. Native Desktop Application (Electron)
```bash
# Launch Desktop App directly
npm run desktop

# Package Standalone Executable Setup (.exe)
npm run build:exe
```

---

## 🛠️ Environment Configuration (`.env`)

Create a `.env` file in the root directory:
```env
GOOGLE_CLIENT_ID="your_google_client_id_here"
GOOGLE_CLIENT_SECRET="your_google_client_secret_here"
MONGODB_URI="mongodb+srv://charan:Charan1234@cluster1.556pzyn.mongodb.net/CodeForge?appName=Cluster1"
GROQ_API_KEY="your_groq_api_key_here"
PORT=5000
```

---

## 📜 License
MIT License © 2026 CodeForge Orbit-Compiler Team
