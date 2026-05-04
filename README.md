# Code Canvas 🚀

Code Canvas is a real-time collaborative platform for developers. Write code, draw diagrams, and chat with your team in a synchronized environment.

## ✨ Features
- **Real-time Code Editor**: Multi-user synchronization using Monaco Editor and Socket.io.
- **Collaborative Whiteboard**: Draw diagrams and sketches together on a shared canvas.
- **Live Chat**: Instant messaging within rooms.
- **Code Execution**: Run your code snippets on-the-fly using JDoodle API.
- **Persistence**: Save session snapshots to Firebase Firestore.
- **Responsive Design**: Modern, dark-themed UI built with Tailwind CSS.

## 🛠 Tech Stack
- **Frontend**: React (v19), Tailwind CSS, Monaco Editor, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: Firebase Firestore.
- **Tools**: Vite, tsx.

## 🚀 Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env` and configure the following:
- `GEMINI_API_KEY`: (Optional) For AI features.
- `JDOODLE_CLIENT_ID` & `JDOODLE_CLIENT_SECRET`: Required for code execution. Get them from [JDoodle API](https://www.jdoodle.com/compiler-api/).

### 2. Installation
```bash
npm install
```

### 3. Development
```bash
npm run dev
```

### 4. Build & Production
```bash
npm run build
npm start
```

## 📂 Project Structure
- `/server.ts`: Entry point for Express & Socket.io server.
- `/src/components`: Reusable UI components (Editor, Whiteboard, Chat, Sidebar).
- `/src/pages`: Main application views (Home, EditorRoom).
- `/src/lib`: Logic for Firebase and Socket client initialization.
- `/firestore.rules`: Security rules for data persistence.

## 📝 Deployment Guide
This app is ready to be deployed to platforms like Cloud Run or Vercel (with a custom Node.js adapter for sockets). For AI Studio, it runs seamlessly using the provided Express + Vite middleware pattern.

---
Built with ❤️ using Google AI Studio
