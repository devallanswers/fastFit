# fastFit

Aplicacao web para uma loja de alimentos e bebidas, com fluxo de compra para clientes e painel administrativo para gerenciar a operacao da loja.

## Visao geral

O fastFit permite que clientes naveguem pelo catalogo, adicionem produtos ao carrinho, acompanhem pedidos e realizem pagamentos via Pix. A equipe da loja conta com um painel para administrar produtos, categorias, pedidos, usuarios, entregas, promocoes e configuracoes.

## Funcionalidades

- Catalogo de produtos e categorias
- Carrinho de compras e checkout
- Pagamento via Pix
- Acompanhamento de pedidos
- Login e controle de acesso
- Painel administrativo
- Gerenciamento de produtos, pedidos, entregas e promocoes
- Integracao opcional com WhatsApp para comunicacoes da loja

## Tecnologias

### Frontend

- React
- TypeScript
- Vite
- React Router
- Firebase Authentication

### Backend

- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- PostgreSQL
- JWT
- OpenAPI / Swagger

## Estrutura

```text
fastFit/
├── frontend/   # Aplicacao React e painel administrativo
└── backend/    # API REST e regras de negocio
```

## Como executar

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

No Windows, use `mvnw.cmd`. Configure as variaveis de ambiente do banco e dos servicos externos antes de iniciar.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Para gerar a versao de producao:

```bash
npm run build
```

> Nunca coloque senhas, chaves privadas ou arquivos `.env` no repositorio. Use as variaveis de ambiente esperadas pelo backend e pelo frontend.

## Imagens do projeto

Adicione aqui capturas das principais telas para apresentar o projeto no GitHub.

### Loja e catalogo

<img width="535" height="907" alt="home2" src="https://github.com/user-attachments/assets/57288412-8f5c-4892-add9-e7223526dba1" />
<img width="535" height="907" alt="home" src="https://github.com/user-attachments/assets/6b67f427-a654-4d7e-910d-a66ab45bdf9a" />

### Carrinho e pagamento

<img width="535" height="907" alt="cart" src="https://github.com/user-attachments/assets/c772c3d2-98c6-46d7-8b9b-0e3b9fac7a1d" />

### Painel administrativo

<img width="1917" height="866" alt="paineladmin" src="https://github.com/user-attachments/assets/05389876-00e4-4da9-966e-5ccd0e5a7cb0" />

## Documentacao

- [Guia de configuracao do backend](backend/SETUP_GUIDE.md)
- [Arquitetura do backend](backend/ARCHITECTURE_DIAGRAM.txt)

## Status

Projeto finalizado, criado para estudo, demonstracao e uso real de uma aplicacao full stack com fluxo de e-commerce.

## Link em Produção
https://fastfitstore.vercel.app/
