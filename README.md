# 🎓 PrepBac — Plateforme de Préparation au Baccalauréat

> Application web éducative moderne pour préparer le Baccalauréat mauritanien (Séries C & D).  
> Interface premium mobile-first avec IA intégrée, gamification et suivi de progression.

---

## ✨ Fonctionnalités principales

### Espace Étudiant
| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | Vue d'ensemble personnalisée : progression, streak, recommandations, accès rapide |
| 📚 **Cours** | Bibliothèque de leçons par matière et chapitre, lecture de PDF et contenu riche |
| 🏋️ **Exercices** | Exercices pratiques avec correction et Générateur IA |
| 📄 **Fiches** | Fiches de révision par chapitre |
| 🗂️ **Annales** | Sujets d'examens officiels (PDF + corrections) |
| 🗓️ **Planning** | Plan de révision personnalisé et calendrier d'étude |
| 🤖 **Assistant IA** | Tuteur conversationnel (Llama-3.3-70B) avec vision (LLaMA-4-Scout) : explique les cours, génère des exercices, lit les documents |
| 🔥 **Streak & Badges** | Système de gamification : série quotidienne, badges de progression |

### Espace Admin
| Page | Description |
|------|-------------|
| 📊 Dashboard | Statistiques globales de la plateforme |
| 👥 Utilisateurs | Gestion des comptes étudiants |
| 📖 Matières | Création et gestion des matières (Séries dynamiques via JSON) |
| 📂 Chapitres | Organisation des chapitres par matière |
| 📋 Cours & Leçons | Ajout de contenu pédagogique |
| ✏️ Exercices | Gestion des exercices (Classiques ou générés par IA) |
| 📑 Annales | Upload des sujets d'examens officiels |
| 📄 Résumés | Upload des fiches de révision PDF |
| ⚙️ Paramètres | Configuration générale |

---

## 🏗️ Architecture

```
PrepBac/
├── frontend/          # React 18 + Vite
│   └── src/
│       ├── pages/     # Pages étudiantes & admin
│       ├── components/# Composants réutilisables (Layout, StreakCard, ProgressRing…)
│       ├── layouts/   # AdminLayout
│       ├── context/   # AuthContext (JWT)
│       └── index.css  # Design system complet (tokens, animations, composants)
│
└── backend/           # PHP Native (sans framework)
    ├── public/        # Point d'entrée (index.php)
    ├── src/
    │   ├── Controllers/   # AdminController, QuizzesController, AuthController…
    │   ├── Core/          # Router, Database (PDO), Middleware
    │   └── Helpers/       # JWT, Response
    ├── config/
    │   └── config.php     # Configuration BDD, JWT, CORS
    └── schema.sql         # Schéma complet de la base de données
```

---

## ⚙️ Stack Technique

### Frontend
- **React 18** + **Vite**
- **React Router DOM** (navigation SPA)
- **Lucide React** (icônes)
- **CSS pur** — design system personnalisé, glassmorphism, animations
- **JWT** stocké en `localStorage`

### Backend
- **PHP Native** (PSR-4 autoloading via Composer)
- **MySQL** + **PDO** (requêtes préparées)
- **JWT** (authentification stateless)
- **REST API** JSON

---

## 🗄️ Base de données

| Table | Description |
|-------|-------------|
| `users` | Étudiants et admins (rôle, sélections dynamiques de séries) |
| `subjects` | Matières avec couleur, icône et gestion de séries multiples (JSON arrays) |
| `chapters` | Chapitres par matière |
| `lessons` | Leçons (contenu HTML/PDF) |
| `exams` | Annales officielles (PDF) avec filtrage multi-séries |
| `revision_sheets` | Fiches de révision |
| `study_plans` | Plannings d'étude |
| `user_progress` | Progression par chapitre |
| `ai_conversations` | Historique persistant des conversations avec l'IA avec support des images extraites |
| `exercises` | Contient les exercices classiques et le markdown/KaTeX pour les exercices générés par IA |

---

## 🚀 Installation & Démarrage

### Prérequis
- PHP 8.1+
- MySQL 8+
- Node.js 18+ / npm
- Composer

### 1. Base de données

```bash
mysql -u root -p
CREATE DATABASE bac_prepa;
USE bac_prepa;
SOURCE backend/schema.sql;
```

### 2. Backend PHP

```bash
cd backend
composer install

# Configurer la BDD dans config/config.php
# DB_HOST, DB_USER, DB_PASS, DB_NAME

# Lancer le serveur de développement
php -S localhost:8000 -t public/
```

### 3. Frontend React

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🔧 Configuration

Fichier : `backend/config/config.php`

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', 'root');
define('DB_NAME', 'bac_prepa');
define('JWT_SECRET', 'votre_secret_jwt_securise'); // ⚠️ Changer en production
define('CORS_ALLOWED_ORIGIN', 'http://localhost:5173');
```

---

## 🔌 API Endpoints principaux

### Authentification
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

### Cours & Contenu
```
GET  /api/courses/library?series=C
GET  /api/courses/lesson/:id
GET  /api/admin/chapters?series=C
```

### Assistant IA & Génération
```
POST /api/ai/chat
POST /api/ai/generate-exercise
```

### Progression
```
GET  /api/progress/dashboard
GET  /api/streak/stats
```

### Admin
```
GET|POST|PUT|DELETE /api/admin/subjects
GET|POST|PUT|DELETE /api/admin/chapters
GET|POST|PUT|DELETE /api/admin/users
GET|POST|PUT|DELETE /api/admin/series
```

---

## 🎨 Design System

PrepBac utilise un design system custom basé sur des **CSS Variables** avec :

- **Police** : Inter (corps) + Outfit (titres)
- **Couleurs** : Palette bleu/indigo/violet avec support glassmorphism
- **Tokens** : `--primary`, `--r-md`, `--shadow-glass`, `--t`…
- **Animations** : `fadeUp`, `pulseGlow`, barres de progression animées
- **Components** : `.card`, `.btn`, `.progress-track`, `.chat-bubble`…

---

## 🔐 Sécurité

- Authentification **JWT** (tokens Bearer)
- Mots de passe hashés avec **bcrypt** (`password_hash`)
- Requêtes SQL via **PDO + prepared statements** (protection injection)
- **CORS** configuré pour le domaine frontend
- Rôles : `student` | `admin` (routes protégées côté client et serveur)

---

## 🤖 Intégration IA

L'assistant IA est propulsé par les derniers modèles open-source de classe mondiale :
- **Llama-3.3-70B-Versatile** sert de professeur principal pour l'explication des concepts, l'organisation des plannings d'étude ou la génération complète d'exercices structurés sur mesure.
- **Llama-4-Scout (Vision)** permet l'extraction visuelle de documents mathématiques, transformant n'importe quel PDF (comme les annales et fiches de révision) en contexte lisible par l'IA.

Les réponses sont nativement formatées en intègrant la solution **react-markdown** accompagnée de **rehype-katex** pour le rendu parfait de formules mathématiques complexes.

---

## 📦 Séries supportées

| Série | Matières typiques |
|-------|-------------------|
Auparavant limités à des labels codés en dur ('C', 'D'), l'application a migré vers un modèle de base de données à gestion dynamique des séries.

Toutes les ressources de la plateforme (Matières, Chapitres, Exercices, Leçons, etc) stockent désormais un tableau de clés étrangères (`[1, 2]`) dans une structure de colonne `JSON`. Le filtrage se fait efficacement via la clause `JSON_CONTAINS()` de MySQL.

---

## 👥 Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `student` | Dashboard, Cours, QCM, Exercices, Annales, Planning, Assistant |
| `admin` | Tout + Interface d'administration complète (`/admin`) |

---

## 📄 Licence

Projet éducatif — PrepBac © 2026. Tous droits réservés.
