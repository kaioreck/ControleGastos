# 💸 CashTrip – Controle de Gastos e Conversão de Moedas ✈️

Aplicativo híbrido desenvolvido com Cordova para ajudar viajantes a controlar suas despesas e converter moedas em tempo real durante viagens internacionais. Ideal para manter o orçamento sob controle, mesmo em países com moedas diferentes.

---

## 🚀 Funcionalidades Principais

- 💰 **Controle de Despesas**: Registre e visualize os gastos da viagem por categoria e moeda.
- 🌍 **Conversor de Moedas Integrado**: Cotações em tempo real usando a [ExchangeRate API](https://www.exchangerate-api.com/).
- 📊 **Resumo de Gastos**: Visualização clara do total gasto, separado por moeda ou convertido para a moeda principal.

---

## ⚙️ Tecnologias Utilizadas

- **Apache Cordova** – Framework híbrido para apps mobile.  
- **HTML5, CSS3 e JavaScript** – Construção da interface e lógica do app.  
- **Node.js + Express (Backend)** – API e controle de dados.  
- **ExchangeRate API** – API externa para cotação de moedas em tempo real.

---

## 🛠️ Pré-requisitos

- [Node.js e npm](https://nodejs.org)  
- [Apache Cordova](https://cordova.apache.org) (`npm install -g cordova`)  
- Android Studio ou dispositivo Android físico  
- Banco de dados local ou Online (PostgreSQL ou Neon etc..)

---

## 📦 Como Rodar o Projeto Localmente

### 🔐 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do **backend** com os dados:

```env
DB_HOST=localhost
DB_USER=usuario
DB_PASS=senha
DB_NAME=controle_viagem
EXCHANGE_API_KEY=sua_chave_api_aqui
```

> 💡 Para obter a chave da ExchangeRate API, crie uma conta gratuita em [exchangerate-api.com](https://www.exchangerate-api.com/).

---

### 🧠 2. Executar o Backend

```bash
cd backend
npm install
npm start          # Banco local
npm run start:prod # Banco em nuvem (ex: Neon)
```

---

### 🌐 3. Executar o Frontend no Navegador

Abra outro terminal:

```bash
cd frontend
npm install
cordova platform add browser
cordova run browser
```

---

### 🤖 4. Executar no Android

```bash
cordova platform add android
cordova emulate android    # emulador
cordova run android        # dispositivo físico
```

---

📌 Sinta-se à vontade para contribuir, abrir issues ou sugerir melhorias!
