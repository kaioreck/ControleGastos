Controle de Gastos para Viagens (App Híbrido com Cordova) ✈️
Um aplicativo híbrido, desenvolvido para a matéria de Desenvolvimento Mobile, focado em ajudar viajantes a controlar suas despesas e a fazer cotações de moedas em tempo real durante suas viagens pelo mundo.

📝 Sobre o Projeto
Viajar para países com moedas diferentes exige um controle financeiro cuidadoso. Este aplicativo foi criado para ser o companheiro ideal do viajante, resolvendo dois grandes problemas: o controle de gastos e a conversão de valores entre moedas.

Utilizando uma API de cotação em tempo real, o app permite que o usuário não só registre suas despesas, mas também entenda rapidamente o valor de produtos e serviços na sua moeda de origem, facilitando o planejamento e a organização financeira da viagem.

✨ Funcionalidades Principais
💸 Controle de Despesas: Adicione e visualize todos os seus gastos de viagem de forma simples e organizada.
💹 Conversor de Moedas Integrado: Faça cotações de valores em tempo real utilizando uma API online. Ideal para saber o preço das coisas antes de comprar.
📊 Visualização de Total: O sistema calcula e exibe o montante total gasto, oferecendo um resumo claro de suas finanças.
🛠️ Pré-requisitos
Antes de começar, você vai precisar ter instalado em sua máquina as seguintes ferramentas:

Node.js e npm
Apache Cordova (npm install -g cordova)
Um emulador Android configurado (via Android Studio) ou um dispositivo físico.
🚀 Como Executar o Projeto

Acesse a pasta do projeto:

Bash

cd ControleGastos
Adicione a plataforma desejada:
O Cordova pode precisar restaurar as plataformas e plugins. Adicione a plataforma Android:

Bash

cordova platform add android
Execute o aplicativo:
Você pode rodar o app em um emulador ou em um dispositivo Android conectado.

Para executar no emulador Android:
Bash

cordova emulate android
Para executar em um dispositivo Android conectado:
Bash

cordova run android
Pronto! O aplicativo será instalado e iniciado no ambiente escolhido.

💻 Tecnologias e APIs
Apache Cordova: Framework para desenvolvimento de aplicativos móveis híbridos.
HTML5, CSS3 e JavaScript: Tecnologias web padrão para a construção da interface e da lógica do app.
API de Cotação de Moedas: Integração com uma API externa para buscar taxas de câmbio atualizadas em tempo real.
