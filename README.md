# MobiAngola Rotas

PROMPT — DESENVOLVIMENTO DA PLATAFORMA MOBIANGOLA



1. Visão do projeto



Desenvolva uma aplicação de mobilidade urbana chamada MobiAngola, concebida para facilitar as deslocações das pessoas nas cidades angolanas.



O MobiAngola deve funcionar como um assistente inteligente de transportes públicos, ajudando os utilizadores a descobrir como chegar de um ponto a outro utilizando táxis colectivos (candongueiros) e autocarros.



O projeto começa com uma implementação-piloto em Luanda, Angola, e deve permitir expansão futura para outras províncias.



Objetivo principal: qualquer pessoa deve conseguir indicar a sua origem e o seu destino e receber instruções claras sobre quais transportes apanhar, onde embarcar, onde sair e onde fazer transferências.



2. Funcionalidades principais



A. Pesquisa de viagens



Criar uma página inicial com:



- Campo de localização de origem.

- Campo de destino.

- Botão "Encontrar viagem".

- Opção para utilizar a localização atual.

- Sugestões de paragens e destinos.

- Possibilidade de inverter origem e destino.



B. Alternativas de transporte



Apresentar todas as alternativas encontradas na base de dados, incluindo:



- Viagens diretas.

- Viagens com uma transferência.

- Viagens com duas ou mais transferências.

- Combinações entre táxis colectivos e autocarros.



Cada alternativa deve apresentar:



- Tempo estimado.

- Custo estimado em kwanzas (Kz).

- Número de transferências.

- Distância estimada, quando disponível.

- Lista detalhada das etapas.



C. Instruções detalhadas da viagem



Esta é uma das funcionalidades mais importantes.



Para cada etapa, apresentar:



1. Nome do transporte.

2. Código ou identificação da rota.

3. Destino escrito no veículo.

4. Local exato de embarque, quando conhecido.

5. Local onde o passageiro deve sair.

6. Nome da paragem de transferência.

7. Identificação do próximo transporte.

8. Custo estimado de cada etapa.



Exemplo meramente ilustrativo:



Etapa 1



- Transporte: Táxi colectivo.

- Destino indicado: [Destino cadastrado].

- Código da rota: [Código cadastrado].

- Embarque: Kilamba.

- Desembarque: [Paragem cadastrada].



Etapa 2



- Transporte: Autocarro.

- Destino indicado: [Destino cadastrado].

- Código da rota: [Código cadastrado].

- Embarque: [Paragem de transferência].

- Desembarque: Mutamba.



Não inventar rotas, paragens, códigos ou tarifas. Utilizar apenas dados cadastrados e identificar claramente as informações ainda não verificadas.



D. Mapa interativo



Integrar mapas baseados em OpenStreetMap.



O mapa deve:



- Mostrar a origem e o destino.

- Mostrar as paragens.

- Desenhar o percurso.

- Identificar os pontos de embarque e desembarque.

- Mostrar os locais de transferência.

- Permitir visualizar as diferentes alternativas.



E. Motor inteligente de rotas



Desenvolver um algoritmo que:



- Pesquise rotas disponíveis na base de dados.

- Combine diferentes transportes.

- Identifique viagens diretas e com transferências.

- Calcule custos estimados.

- Estime a duração das viagens.

- Ordene resultados por preço, duração e número de transferências.

- Evite ciclos e combinações inválidas.

- Permita configurar o número máximo de transferências.

- Apresente todas as alternativas encontradas dentro dos limites definidos.



Não apresentar resultados inventados quando não existirem dados suficientes.



3. Gestão administrativa



Criar um painel administrativo protegido por autenticação.



O administrador deve conseguir:



- Cadastrar e editar paragens.

- Cadastrar transportes.

- Cadastrar rotas de táxis colectivos.

- Cadastrar rotas de autocarros.

- Definir códigos das rotas.

- Definir o destino escrito nos veículos.

- Associar paragens a cada rota por ordem.

- Definir locais de embarque e desembarque permitidos.

- Registar tarifas e tempos estimados.

- Marcar rotas como verificadas ou não verificadas.

- Consultar estatísticas de utilização.

- Gerir utilizadores e informações da plataforma.



4. Tecnologia e arquitetura



Utilizar Python como linguagem principal.



Backend



- Python.

- FastAPI.

- SQLAlchemy.

- SQLite durante o desenvolvimento.

- PostgreSQL numa futura implementação em produção.

- API REST.



Aplicação Android



- Kivy e KivyMD.

- Comunicação com o backend através de HTTP REST.

- Interface adaptada a smartphones Android.

- Preparar o projeto para geração de APK.



Mapas



- OpenStreetMap.

- Biblioteca de mapas compatível com Kivy.

- Coordenadas geográficas para paragens e percursos.



Base de dados



Criar entidades para:



- Utilizadores.

- Paragens.

- Tipos de transporte.

- Rotas.

- Paragens associadas às rotas.

- Tarifas.

- Informações de verificação.

- Pesquisas de viagens.



Estruturar a base de dados para suportar diferentes cidades e províncias.



5. Design e experiência do utilizador



Criar uma interface moderna, intuitiva, profissional e simples de utilizar.



Identidade visual:



- Azul como cor principal.

- Branco como cor de fundo.

- Detalhes em azul-claro.

- Tipografia legível.

- Ícones intuitivos.

- Design responsivo.



A aplicação deve ser fácil de utilizar por pessoas com diferentes níveis de conhecimentos tecnológicos.



Ecrãs principais



1. Splash screen com o logótipo MobiAngola.

2. Página inicial.

3. Pesquisa de origem e destino.

4. Resultados das alternativas.

5. Detalhes da viagem.

6. Mapa interativo.

7. Perfil do utilizador.

8. Painel administrativo.



6. Requisitos de qualidade



- Código organizado e modular.

- Segurança na autenticação.

- Validação dos dados.

- Tratamento de erros.

- API documentada.

- Código preparado para manutenção e expansão.

- Boa performance em smartphones de recursos limitados.

- Interface em português.

- Valores monetários apresentados em Kz.

- Não utilizar dados fictícios como se fossem informações reais.



7. Estratégia de desenvolvimento



Desenvolver por etapas:



Fase 1: Estrutura do projeto e base de dados.



Fase 2: Backend FastAPI e API REST.



Fase 3: Motor de pesquisa e combinação de rotas.



Fase 4: Painel administrativo para cadastro dos transportes.



Fase 5: Aplicação Android.



Fase 6: Integração dos mapas.



Fase 7: Testes, correções e preparação para demonstração.



Começar com o percurso-piloto Kilamba → Mutamba, utilizando táxis colectivos e autocarros.



Criar dados de demonstração claramente identificados como fictícios até serem substituídos por dados reais e verificados.



8. Resultado esperado



Entregar um sistema funcional composto por:



- Backend Python.

- Base de dados estruturada.

- Motor de pesquisa de rotas.

- Aplicação Android.

- Painel administrativo.

- Mapa interativo.

- Documentação técnica.

- Testes automatizados.



IMPORTANTE: Não construir apenas páginas estáticas ou uma demonstração visual. Implementar funcionalidades reais, integrar frontend e backend e testar os principais fluxos da aplicação.



Começar pela arquitetura e pela estrutura do projeto. Explicar cada etapa, apresentar os ficheiros criados e validar o funcionamento antes de avançar para a etapa seguinte.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2da59403-71e6-4248-9bfc-147e2e4d59f0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
