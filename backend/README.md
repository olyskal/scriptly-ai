# Documentação da API Scriptly

Bem-vindo à documentação da API do Scriptly. Este documento fornece informações detalhadas sobre todos os endpoints disponíveis, autenticação, códigos de status e exemplos de requisições e respostas.

## Sumário

- [Autenticação](#autenticação)
- [Limites de Taxa](#limites-de-taxa)
- [Endpoints](#endpoints)
  - [Autenticação](#autenticação-1)
  - [Usuários](#usuários)
  - [Posts](#posts)
  - [Assinaturas](#assinaturas)
  - [Webhooks](#webhooks)
- [Códigos de Status](#códigos-de-status)
- [Tratamento de Erros](#tratamento-de-erros)
- [Ambientes](#ambientes)

## Autenticação

Todas as requisições para a API (exceto rotas públicas) requerem autenticação via token JWT no cabeçalho `Authorization`:

```
Authorization: Bearer <seu_token_jwt>
```

## Limites de Taxa

- **Limite Global**: 100 requisições por IP a cada 15 minutos
- **Autenticação**: 10 tentativas por IP a cada 15 minutos

## Endpoints

### Autenticação

#### Obter informações do usuário autenticado

```http
GET /api/users/me
```

**Resposta de sucesso (200 OK):**
```json
{
  "id": "user_123",
  "email": "usuario@exemplo.com",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Usuários

#### Obter perfil do usuário

```http
GET /api/users/me
```

**Resposta de sucesso (200 OK):**
```json
{
  "id": "user_123",
  "email": "usuario@exemplo.com",
  "subscriptionStatus": "ACTIVE",
  "currentPeriodEnd": "2023-12-31T23:59:59.000Z"
}
```

### Posts

#### Listar posts do usuário

```http
GET /api/posts
```

**Resposta de sucesso (200 OK):**
```json
[
  {
    "id": "post_123",
    "title": "Meu Primeiro Post",
    "content": "Conteúdo do post...",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### Criar um novo post

```http
POST /api/posts
Content-Type: application/json

{
  "title": "Novo Post",
  "content": "Conteúdo do novo post..."
}
```

**Resposta de sucesso (201 Created):**
```json
{
  "id": "post_124",
  "title": "Novo Post",
  "content": "Conteúdo do novo post...",
  "createdAt": "2023-01-02T00:00:00.000Z"
}
```

### Assinaturas

#### Criar sessão de checkout

```http
POST /api/subscriptions/create-checkout-session
Content-Type: application/json

{
  "plan": "pro",
  "interval": "monthly"
}
```

**Parâmetros:**
- `plan` (obrigatório): Plano de assinatura (`pro`)
- `interval` (obrigatório): Periodicidade do pagamento (`monthly` ou `yearly`)

**Resposta de sucesso (200 OK):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

#### Verificar status da assinatura

```http
GET /api/subscriptions/status
```

**Resposta de sucesso (200 OK):**
```json
{
  "isPro": true,
  "status": "ACTIVE",
  "currentPeriodEnd": "2023-12-31T23:59:59.000Z",
  "plan": "pro",
  "interval": "monthly"
}
```

### Webhooks

#### Webhook do Stripe

```http
POST /api/webhooks/stripe
```

**Cabeçalhos necessários:**
- `stripe-signature`: Assinatura do webhook

**Corpo:** Evento do Stripe (raw JSON)

## Códigos de Status

A API retorna os seguintes códigos de status HTTP:

- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `400 Bad Request`: Dados inválidos fornecidos
- `401 Unauthorized`: Autenticação necessária ou token inválido
- `403 Forbidden`: Acesso negado
- `404 Not Found`: Recurso não encontrado
- `429 Too Many Requests`: Limite de taxa excedido
- `500 Internal Server Error`: Erro interno do servidor

## Tratamento de Erros

Os erros retornam um objeto JSON com a seguinte estrutura:

```json
{
  "error": "Mensagem de erro descritiva",
  "code": "CÓDIGO_DO_ERRO",
  "details": {
    "campo": ["mensagem de validação"]
  }
}
```

## Ambientes

- **Produção**: `https://api.scriptly.app`
- **Desenvolvimento**: `http://localhost:3000`

## Variáveis de Ambiente

As seguintes variáveis de ambiente são necessárias:

```env
# Configuração do Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/scriptly"

# Autenticação
NEXTAUTH_SECRET="seu_segredo_seguro"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_MONTHLY_PRICE_ID="price_..."
STRIPE_PRO_YEARLY_PRICE_ID="price_..."

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

## Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente
4. Execute as migrações do banco de dados:
   ```bash
   npx prisma migrate dev
   ```
5. Inicie o servidor:
   ```bash
   npm run dev
   ```

## Testes

Para executar os testes:

```bash
npm test
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature:
   ```bash
   git checkout -b feature/nova-feature
   ```
3. Faça commit das suas alterações
4. Faça push para a branch
5. Abra um Pull Request

## Licença

MIT
