# Sistema Financeiro — 3 Empresas (Full‑Stack)

Dashboard financeiro consolidado e por empresa para **LOC TUDO**, **ALUGUE TUDO EVENTO**
e **ALUGUE TUDO COMÉRCIO**, com contas a pagar/receber, fluxo de caixa, relatórios e
importação de planilhas (XLSX/XLS/CSV).

```
React + TypeScript (Vite, Tailwind, Recharts)   ← /src
        ↓  REST
Node.js + TypeScript (Express, Mongoose, Zod)    ← /backend
        ↓
MongoDB
```

O front‑end continua consumindo os mesmos **services** (`src/services/*`); eles agora
falam com a API real em vez dos mocks. Toda conversão entre o formato da API
(inglês, valores em **centavos**, datas `YYYY-MM-DD`) e os tipos do front (português,
reais) fica em `src/services/adapters.ts`.

---

## 1. Pré‑requisitos

- Node.js ≥ 20
- Uma instância MongoDB (local ou **MongoDB Atlas**)

## 2. Configurar o MongoDB

**Atlas (recomendado):** crie um cluster gratuito, um usuário de banco e libere seu IP
em *Network Access*. Copie a *connection string* (`mongodb+srv://...`).

**Local:** instale o MongoDB Community e use `mongodb://localhost:27017/financeiro`.

## 3. Configurar o `.env`

### Backend — `backend/.env` (copie de `backend/.env.example`)

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/financeiro?retryWrites=true&w=majority
CORS_ORIGIN=http://localhost:5173
MAX_UPLOAD_MB=10
```

> Nunca comite o `.env` — ele está no `.gitignore`. Nenhuma credencial fica no código.

### Front‑end — `.env` na raiz (copie de `.env.example`)

```env
VITE_API_URL=http://localhost:3000/api
```

Se preferir, deixe `VITE_API_URL` comentado: em desenvolvimento o Vite faz proxy de
`/api` para `http://localhost:3000` (sem necessidade de CORS).

## 4. Instalar e rodar

```bash
# Backend
cd backend
npm install
npm run seed        # popula empresas, categorias e lançamentos (ver seção 6)
npm run dev         # API em http://localhost:3000  (health: /api/health)

# Front-end (outro terminal, na raiz do projeto)
npm install
npm run dev         # http://localhost:5173
```

### Scripts do backend

| Script | Ação |
|---|---|
| `npm run dev` | API com reload (tsx watch) |
| `npm run build` | Compila para `dist/` |
| `npm run start` | Roda `dist/server.js` |
| `npm run seed` | Recria as coleções com dados de demonstração |
| `npm run lint` | ESLint |

## 5. Health check

```bash
curl http://localhost:3000/api/health
# { "status": "ok", "database": "connected" }
```

Se o MongoDB estiver fora do ar, o servidor **não cai** — `database` fica
`"disconnected"` e o status vira `503`.

## 6. Seed (`npm run seed`)

- Cria as **3 empresas** (slugs `loc-tudo`, `alugue-tudo-evento`, `alugue-tudo-comercio`).
- Cria as **categorias** de receita/despesa (mesmos ids/cores do front).
- **LOC TUDO — dados reais**: importa `CONTAS A RECEBER ANUAL.XLS` (via o dataset já
  extraído em `backend/src/data/contasReceberLocTudo.json`, ~779 títulos).
- **ALUGUE TUDO EVENTO / COMÉRCIO**: contas a receber sintéticas coerentes.
- **Contas a pagar**: sintéticas para as 3 empresas.
- Gera volume suficiente para testar consolidado, individual, gráficos, rankings,
  vencidos, pagos e em aberto.

## 7. Importação de planilhas

1. Tela **Importação** → escolha a empresa → o tipo (Contas a Pagar / Receber).
2. Envie um arquivo **.xlsx / .xls / .csv** (limite `MAX_UPLOAD_MB`).
3. O backend lê o arquivo em memória (não grava em disco), identifica as colunas,
   converte valores (pt‑BR → centavos) e datas (`DD/MM/YYYY` → `Date`), valida cada
   linha e devolve uma **pré‑visualização** (`POST /api/import/preview`):
   `{ totalRows, validRows, invalidRows, columns, preview, errors }`.
4. Ao confirmar (`POST /api/import`), os registros são gravados com **upsert por
   `externalId`** (hash determinístico de empresa + tipo + documento + valor +
   vencimento + nome). Reimportar o mesmo arquivo **atualiza**, não duplica.
5. Cada importação vira um registro em **`import_logs`** (`GET /api/imports`).

Layouts reconhecidos:
- Cabeçalho pt‑BR genérico (`Cliente`/`Fornecedor`, `Documento`, `Valor`,
  `Vencimento`, `Categoria`, `Pagamento`, …) — detecção por sinônimos.
- Export **"Contas a Receber Anual"** do ERP (layout por posição de coluna,
  com linhas de continuação) — usado no seed da LOC TUDO.

## 8. Endpoints (`/api`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | status do servidor + MongoDB |
| GET | `/companies` · `/companies/:id` | empresas (id = slug ou ObjectId) |
| POST | `/companies` · PUT `/companies/:id` | criar / editar empresa |
| DELETE | `/companies/:id` | **bloqueado** (409 se houver lançamentos; senão 405) |
| GET | `/categories` · `/customers` · `/suppliers` | catálogos p/ filtros |
| GET | `/receivables` | lista + filtros + paginação + ordenação |
| GET/POST/PUT/DELETE | `/receivables/:id` | CRUD |
| GET | `/receivables/summary?group=totais\|empresa\|cliente\|mes` | agregações |
| GET | `/payables` … `/payables/summary` | idem para contas a pagar |
| GET | `/dashboard?companyId=all\|<slug>` | indicadores (consolidado ou individual) |
| GET | `/dashboard/companies?sort=saldo\|recebido\|aReceber\|aPagar\|inadimplencia` | comparativo das 3 + consolidado |
| GET | `/cash-flow?companyId&groupBy=day\|week\|month` | pontos do fluxo |
| GET | `/cash-flow/summary` · `/cash-flow/entries` · `/cash-flow/comparison` | resumo, lançamentos, comparativo |
| GET | `/reports/:type` | relatório pronto (`{ colunas, linhas }`) |
| POST | `/import/preview` · `/import` | pré‑visualizar / efetivar importação (multipart) |
| GET | `/imports` | histórico de importações |

**Filtros de `/receivables` e `/payables`:** `companyId`, `status`
(`pending\|paid\|overdue\|canceled`; receivables também aceitam `em_aberto`),
`category`, `customerName`/`supplierName`, `paymentMethod`, `search`,
`startDate`/`endDate`/`dueStart`/`dueEnd`, `paymentStart`/`paymentEnd`,
`page`, `limit`, `sort` (ex.: `sort=dueDate:desc`).

**Listagens** devolvem `{ data: [...], pagination: { page, limit, total, totalPages } }`.
**Erros** devolvem `{ success:false, message, errors:[] }` com status 400/404/409/422/500.

## 9. Estrutura do projeto

```
/                         front-end (Vite)
├── src/
│   ├── services/         api.ts, adapters.ts, *Service.ts  → falam com a API
│   ├── pages/ components/ hooks/ utils/ types/
│   └── mock/             mantido só para referência (não é mais fonte de dados)
├── backend/
│   ├── src/
│   │   ├── config/       env.ts (zod), db.ts (conexão / health)
│   │   ├── models/       company, receivable, payable, importLog, category
│   │   ├── repositories/ acesso ao Mongoose
│   │   ├── services/     regra de negócio + agregações
│   │   ├── controllers/  req → service → res
│   │   ├── routes/       um router por recurso
│   │   ├── middlewares/  validate (zod), errorHandler, upload (multer)
│   │   ├── validators/   schemas zod
│   │   ├── imports/      parser de planilha, dedupe, seed
│   │   ├── utils/        money (centavos), dates, slug, http
│   │   ├── app.ts / server.ts
│   │   └── data/         dataset real da LOC TUDO
│   └── .env.example
```

Fluxo de uma requisição: **Route → Controller → Service → Repository → MongoDB**.
Nenhuma regra de negócio nas rotas; nenhum objeto cru do cliente chega ao Mongoose
(tudo passa por zod).

## 10. Convenções importantes

- **Dinheiro:** inteiro em **centavos** no banco e na API (campos `*Cents`). O front
  divide por 100 na camada de adapter. Sem `float` em soma de dinheiro.
- **Datas:** `Date` em UTC no banco; a API serializa datas de negócio como
  `YYYY-MM-DD`; o front exibe `DD/MM/YYYY` e valores como `R$ 25.450,00`.
- **`companyId` na API:** o slug da empresa (`loc-tudo`, …) ou `all` para consolidado.
  O consolidado é **calculado por aggregation** — não existe coleção duplicada.
- **Status:** canônico `pending | paid | overdue | canceled`. `overdue` é derivado
  (pendente + vencido) na leitura.

## 11. Segurança (fase atual, sem autenticação)

`helmet`, CORS restrito a `CORS_ORIGIN`, `.env` fora do versionamento, upload
limitado por tamanho e validado por extensão **e** MIME, nome de arquivo ignorado,
dados de importação sanitizados, e todas as queries montadas a partir de valores já
validados por zod (evita NoSQL injection).

## 12. Produção (futuro)

- Backend: `npm run build && npm run start` (definir `NODE_ENV=production`,
  `MONGODB_URI` do cluster de produção, `CORS_ORIGIN` do domínio real).
- Front‑end: `npm run build` → servir `dist/` em CDN/estático, com
  `VITE_API_URL` apontando para a URL pública da API.
- Adicionar autenticação/-autorização antes de expor publicamente.
