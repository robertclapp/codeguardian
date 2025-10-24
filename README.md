# CodeGuardian: AI-Powered Code Reviews

> A differentiated competitor to CodeRabbit with advanced AI mentorship and security-first architecture

## 🚀 Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd codeguardian

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Deploy with one command
./scripts/deploy.sh
```

Access your application at `https://localhost`

## 📋 Project Overview

CodeGuardian is an AI-powered code review tool designed to be a superior alternative to CodeRabbit. Built by a solo developer with a focus on security, mentorship, and developer experience.

### Key Differentiators

- **AI Mentorship Mode**: Explains WHY changes are needed, not just WHAT to change
- **Context-Aware Analysis**: Goes beyond linting to understand code context
- **One-Click Fixes**: Apply suggestions instantly
- **Security-First**: Built-in vulnerability detection and secure architecture
- **Privacy-Focused**: Your code stays private
- **Offline Capable**: Works without internet connectivity

## 🏗️ Architecture

- **Backend**: Flask with SQLAlchemy, JWT authentication, OpenAI integration
- **Frontend**: React with modern UI components
- **Database**: PostgreSQL with Redis caching
- **Deployment**: Docker Compose with Nginx reverse proxy
- **CI/CD**: GitHub Actions with comprehensive testing

## 📁 Project Structure

```
codeguardian/
├── codeguardian-backend/     # Flask API server
│   ├── src/                  # Source code
│   ├── tests/               # Test suites
│   └── requirements.txt     # Python dependencies
├── codeguardian-frontend/    # React application
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   └── package.json         # Node dependencies
├── scripts/                 # Deployment scripts
├── nginx/                   # Nginx configuration
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Container orchestration
├── Dockerfile              # Container definition
└── docs/                   # Documentation
```

## 🛠️ Development

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- Git

### Local Development

```bash
# Backend development
cd codeguardian-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/main.py

# Frontend development
cd codeguardian-frontend
npm install
npm run dev
```

### Testing

```bash
# Backend tests
cd codeguardian-backend
pytest tests/ -v --cov=src

# Frontend tests
cd codeguardian-frontend
npm run test
```

## 🚢 Deployment

### Production Deployment

1. **Set up your server** with Docker and Docker Compose
2. **Clone the repository** and configure environment variables
3. **Run the deployment script**: `./scripts/deploy.sh`
4. **Configure your domain** and SSL certificates
5. **Set up monitoring** with the included Grafana dashboards

### Environment Configuration

Copy `.env.example` to `.env` and configure:

- Database credentials
- OpenAI API key
- GitHub OAuth credentials
- Email settings
- Security keys

## 📊 Monitoring

- **Health Checks**: `/health` endpoint
- **Metrics**: Prometheus at `:9090`
- **Dashboards**: Grafana at `:3000`
- **Logs**: `docker-compose logs -f`

## 🔒 Security

- JWT-based authentication
- Input validation and sanitization
- Rate limiting
- CORS protection
- Security headers
- Vulnerability scanning in CI/CD

## 📈 Marketing Strategy

The included marketing strategy focuses on:

- Build in Public approach
- Developer community engagement
- Content marketing
- Viral social media tactics
- Organic growth strategies

## 🤝 Contributing

This is currently a solo project, but contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

[Add your chosen license here]

## 🆘 Support

- Check the deployment guide for common issues
- Review the architecture documentation
- Open an issue for bugs or feature requests

## 🎯 Roadmap

- [ ] Advanced AI models integration
- [ ] Multi-language support
- [ ] IDE plugins
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard

---

Built with ❤️ by a solo developer who believes in better code reviews.

