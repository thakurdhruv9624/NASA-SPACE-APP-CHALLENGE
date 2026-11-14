# 🌍 Climate Data Analysis & Visualization Platform
*NASA Space Apps Challenge Project*

## 🚀 About the Project
Our project is an interactive full-stack climate data visualization and analysis platform designed to address critical environmental challenges using authentic datasets. It bridges raw scientific datasets with user-friendly interfaces, allowing researchers, students, and citizens to explore climate trends and environmental metrics dynamically.

---

## 🛠️ Tech Stack & Architecture
This project uses a modern decoupled full-stack architecture:
* **Frontend:** React, TypeScript, Vite (Deployed on **Vercel**)
* **Backend:** Python, FastAPI, Uvicorn (Deployed on **Render**)
* **Version Control:** Git & GitHub

---

## 🌐 Live Links
* **Frontend Application (Vercel):** [View Live App](https://nasa-space-app-challenge-1.vercel.app)
* **Backend API (Render):** [API Endpoint](https://nasa-space-app-challenge-1.onrender.com)

---

## ⚙️ Local Setup & Installation

If you want to run this project locally, follow these steps:

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
\`\`\`

### 2. Run the Backend (FastAPI)
\`\`\`bash
# Navigate to backend directory (if applicable)
pip install -r requirements.txt
uvicorn climate_data:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

### 3. Run the Frontend (React)
\`\`\`bash
# Navigate to frontend directory
npm install
npm run dev
\`\`\`

---

## 💡 Features
* **Real-time Climate Queries:** Fetches and processes environmental data dynamically.
* **Interactive Visualizations:** Renders clean graphs and insights for users.
* **High Performance:** Fast API response times backed by Render and seamless frontend rendering via Vercel.
