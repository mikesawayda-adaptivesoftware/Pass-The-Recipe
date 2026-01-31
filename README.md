# 🍳 Pass The Recipe

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Image Version](https://img.shields.io/docker/v/msawayda/pass-the-recipe?label=docker)](https://hub.docker.com/r/msawayda/pass-the-recipe)
[![Self-Hosted](https://img.shields.io/badge/Self--Hosted-Yes-blue)](https://github.com/msawayda/Pass-The-Recipe)

A robust, self-hosted recipe sharing application. Share your favorite recipes with friends and family, import from popular recipe websites, and migrate your existing Mealie collection.

---

## ✨ Features

- **🔐 User Authentication**: Secure email/password registration and login with JWT tokens.
- **📖 Recipe Management**: Create, edit, and organize your recipes with a beautiful UI.
- **🧠 Smart Ingredient Parser**: Automatically extracts quantities, units, and ingredients from text using AI (Ollama) or rules.
- **📥 URL Import**: Import recipes from any website using Schema.org/Recipe JSON-LD format.
- **🚀 Mealie Import**: Seamlessly migrate your entire recipe collection from Mealie backup files.
- **🤝 Recipe Sharing**: Share individual recipes or your entire collection with friends.
- **👫 Friend System**: Connect with friends to see their shared recipes and stay inspired.
- **🐳 Self-Hosted**: Run on your own server with Docker — your data stays yours.

---

## 🛠 Tech Stack

- **Frontend**: [Angular 18](https://angular.io/) (Standalone Components, Material UI)
- **Backend**: [NestJS](https://nestjs.com/) (TypeScript, TypeORM)
- **Database**: [SQLite](https://www.sqlite.org/) (Zero-config, easy backups)
- **AI Engine**: [Ollama](https://ollama.com/) (Local LLM for intelligent parsing)
- **Deployment**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## 🚀 Quick Start with Docker

The easiest way to get started is using Docker Compose. This will set up the application and the Ollama AI engine automatically.

### 1. Clone and Configure

```bash
git clone https://github.com/msawayda/Pass-The-Recipe.git
cd Pass-The-Recipe

# Create environment file
cp env.example .env

# Edit .env and set a secure JWT_SECRET
# Generate one with: openssl rand -base64 32
```

### 2. Run with Docker Compose

```bash
docker-compose up -d
```

On first run, this will:
1. Start the main application on [http://localhost:3084](http://localhost:3084)
2. Start the Ollama container
3. Automatically download the `llama3.2:3b` model (approx. 2GB)

### 3. Access the App

Open **[http://localhost:3084](http://localhost:3084)** in your browser.

---

## 🐳 Docker Deployment (Standalone)

If you prefer to run only the application container:

```bash
# Build the Docker image
docker build -t pass-the-recipe .

# Run the container
docker run -d \
  --name pass-the-recipe \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  -e JWT_SECRET="your-secure-secret-here" \
  pass-the-recipe
```

---

## 🖥 Unraid Deployment

1. Copy the `Dockerfile` and project files to your Unraid server (or use the Docker Compose Manager plugin).
2. If using the Unraid Docker UI:
   - **Name**: `pass-the-recipe`
   - **Repository**: `msawayda/pass-the-recipe:latest`
   - **Port**: `3084` → `3000`
   - **Path `/app/data`**: `/mnt/user/appdata/pass-the-recipe/data`
   - **Path `/app/uploads`**: `/mnt/user/appdata/pass-the-recipe/uploads`
   - **Variable `JWT_SECRET`**: `your-secure-secret`

---

## 💻 Development Setup

### Prerequisites

- **Node.js**: v20+
- **npm**: v10+
- **Ollama**: (Optional, for AI-powered ingredient parsing)

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 2. Set Up Ollama (Optional but Recommended)

The app includes an AI-powered ingredient parser that uses Ollama to intelligently extract quantities, units, and ingredients from recipe text. Without Ollama, it falls back to a rules-based parser.

#### Install Ollama

- **macOS/Linux**: `curl -fsSL https://ollama.com/install.sh | sh`
- **Windows**: Download from [ollama.com/download](https://ollama.com/download)

#### Pull the Model

```bash
# Start the Ollama service
ollama serve

# Pull the required model
ollama pull llama3.2:3b
```

### 3. Start the Application

**Terminal 1 (Backend):**
```bash
cd server
INGREDIENT_PARSER_TYPE=llm JWT_SECRET=dev-secret npm run start:dev
```

**Terminal 2 (Frontend):**
```bash
npm start
```

Open **[http://localhost:4200](http://localhost:4200)** for development.

---

## 🧠 Smart Ingredient Parser

Pass The Recipe uses a dual-engine parser:

1.  **LLM Parser (Recommended)**: Uses `llama3.2:3b` via Ollama. It excels at complex, natural language ingredients like *"2-3 medium ripe avocados, peeled and pitted"*.
2.  **Rules Parser**: A regex-based fallback for simple quantities and units. No dependencies required.

### Configuration

| Variable | Description |
|----------|-------------|
| `INGREDIENT_PARSER_TYPE` | Set to `llm` (default in Compose) or `rules`. |
| `OLLAMA_URL` | URL to your Ollama instance (default: `http://localhost:11434`). |
| `OLLAMA_MODEL` | Model name (default: `llama3.2:3b`). |

---

## 📂 Project Structure

```text
pass-the-recipe/
├── src/                    # Angular frontend
│   ├── app/
│   │   ├── core/           # Services, guards, models
│   │   ├── features/       # Feature-specific modules (auth, recipes, friends)
│   │   └── shared/         # Reusable components & UI
├── server/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication logic
│   │   ├── recipes/        # Recipe CRUD & processing
│   │   ├── ingredients/    # Parsing logic (LLM/Rules)
│   │   └── common/         # Database entities (SQLite)
├── Dockerfile              # Multi-stage production build
└── docker-compose.yml      # Full stack deployment
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create an account
- `POST /api/auth/login` - Obtain JWT token
- `GET /api/auth/profile` - Current user info

### Recipes & Ingredients
- `GET /api/recipes` - List user recipes
- `POST /api/recipes` - Create new recipe
- `POST /api/import/url` - Import via Schema.org/Recipe
- `POST /api/ingredients/parse` - Test the parser

---

## 💾 Data & Backup

Your data is stored in two locations:
- **Database**: `./data/pass-the-recipe.db` (SQLite)
- **Images**: `./uploads/` directory

To backup, simply copy the `./data` and `./uploads` folders.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🆘 Support

If you encounter any issues, please open an issue on GitHub.

*Created with ❤️ by msawayda*
