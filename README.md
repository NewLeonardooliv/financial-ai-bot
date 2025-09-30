# Assistant Intelligence

Uma API de alta performance construída com **Bun** e **Elysia** para processamento inteligente de mensagens via webhook, com foco em extração de gastos e categorização automática.

## 🚀 Tecnologias

- **[Bun](https://bun.sh/)** - Runtime JavaScript/TypeScript ultra-rápido
- **[Elysia](https://elysiajs.com/)** - Framework web moderno e performático
- **[OpenAI API](https://openai.com/)** - Integração com GPT para processamento de linguagem natural
- **[Evolution API](https://evolution-api.com/)** - Integração com WhatsApp Business
- **TypeScript** - Tipagem estática
- **Zod** - Validação de schemas
- **Docker** - Containerização

## 📋 Funcionalidades

- **Webhook Processing**: Recebe e processa mensagens do WhatsApp via Evolution API
- **Expense Extraction**: Agente especializado em extrair valores e categorias de gastos de mensagens de texto
- **Rate Limiting**: Controle de taxa de requisições
- **CORS**: Configuração de origens permitidas
- **Swagger Documentation**: Documentação automática da API
- **Health Check**: Monitoramento de saúde da aplicação
- **Logging**: Sistema de logs estruturado

## 🛠️ Setup

### Pré-requisitos

- [Bun](https://bun.sh/docs/installation) instalado
- Docker (opcional)

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd financial-ai-bot
   ```

2. **Instale as dependências**
   ```bash
   bun install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp env.example .env
   ```
   
   Edite o arquivo `.env` com suas configurações:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4
   
   # Evolution API Configuration
   EVOLUTION_API_URL=http://localhost:8080
   EVOLUTION_API_KEY=your-evolution-api-key
   EVOLUTION_INSTANCE_NAME=default
   ```

4. **Execute a aplicação**
   ```bash
   # Desenvolvimento
   bun run dev
   
   # Produção
   bun run start
   ```

### Docker

```bash
# Build da imagem
docker build -t financial-ai-bot .

# Executar container
docker run -p 3000:3000 --env-file .env financial-ai-bot
```

## 📡 Endpoints

- `GET /health` - Health check
- `POST /message` - Webhook para processamento de mensagens
- `GET /swagger` - Documentação da API

## 🔧 Scripts Disponíveis

- `bun run dev` - Executa em modo desenvolvimento com hot reload
- `bun run start` - Executa em modo produção
- `bun run build` - Build da aplicação
- `bun test` - Executa testes

## 📁 Estrutura do Projeto

```
src/
├── agents/           # Agentes de IA especializados
├── middleware/       # Middlewares (rate limit, error handling)
├── providers/        # Provedores de serviços externos
├── routes/          # Rotas da API
├── services/        # Serviços de negócio
├── utils/           # Utilitários (logger, session)
└── index.ts         # Configuração principal da aplicação
```

## 🌐 Acesso

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Documentação**: http://localhost:3000/swagger

---

Desenvolvido com ❤️ usando Bun e Elysia
