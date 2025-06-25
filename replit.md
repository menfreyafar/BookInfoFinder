# Luar Sebo e Livraria - Sistema de Gestão

## Overview
Sistema completo de gestão para sebo e livraria com funcionalidades de:
- Catálogo de livros com busca por ISBN
- Gestão de estoque e inventário
- Sistema de vendas (PDV)
- Integração com Estante Virtual
- Sistema de trocas com análise de foto por IA
- Pré-cadastros de livros identificados em trocas

## Project Architecture
- **Backend**: Node.js com Express e TypeScript
- **Frontend**: React com Vite e TailwindCSS
- **Database**: PostgreSQL (Neon-backed)
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js
- **Image Analysis**: OpenAI Vision API
- **File Uploads**: Multer

## Recent Changes
### 2025-06-25 - Interface de Personalização Visual de Etiquetas Implementada
- ✅ **Editor drag-and-drop** para posicionamento visual de elementos
- ✅ **Upload de modelos personalizados** (PDF, PNG, JPG)
- ✅ **Dimensões exatas**: 10cm altura × 2,5cm largura
- ✅ **Posicionamento preciso** de preço, título, autor, sinopse, código
- ✅ **Controles visuais** para fonte, cor, alinhamento, opacidade
- ✅ **Preview em tempo real** sobre modelo carregado
- ✅ **Sistema de salvamento** de layouts personalizados
- ✅ **Geração automática** de PDFs com layout customizado

### 2025-06-25 - Migração para Replit Finalizada e Modelo de Etiquetas Atualizado
- ✅ Migração completa do Replit Agent para ambiente Replit finalizada
- ✅ Todas as dependências instaladas e funcionando
- ✅ Aplicação rodando com sucesso na porta 5000
- ✅ Sistema de gestão de livraria totalmente operacional
- ✅ Integração GitHub configurada (repositório BookInfoFinder)
- ✅ Hot reload e desenvolvimento ativo funcionando
- ✅ **Modelo de etiquetas/marca-páginas replicado EXATAMENTE conforme design fornecido**
- ✅ **Layout vertical compacto com preço em destaque, título em maiúsculas**
- ✅ **Dimensões exatas: 120x180pt (formato vertical) com fontes precisas**
- ✅ **Disposição: 6 etiquetas por linha conforme modelo original**
- ✅ **Posicionamento e espaçamento idênticos ao arquivo fornecido**
- ✅ **Sistema de upload de modelo personalizado implementado**
- ✅ **Dimensões exatas: 10cm altura × 2,5cm largura**
- ✅ **Layout otimizado: 6 etiquetas horizontais por página**
- ✅ **Inserção automática de dados nos modelos personalizados**

## Recent Changes
### 2025-06-24 - Sistema de Guarda e Etiquetas Implementado
- ✅ Sistema de guarda completo com estantes configuráveis
- ✅ Aba "Guarda" para checklist de livros a serem guardados
- ✅ Gerenciamento de estantes nas configurações
- ✅ Sistema de códigos únicos LU-{ID}-{ANO} para identificação
- ✅ Geração de etiquetas/marca-páginas em PDF otimizado para idosos
- ✅ Layout com preço em destaque, informações claras e fonte grande
- ✅ Renomeação "Busca por ISBN" → "Cadastro" conforme solicitado

### 2025-06-24 - Migração para Replit Finalizada e Sistema de Precificação Ajustado
- ✅ Migração completa do Replit Agent para ambiente Replit finalizada
- ✅ Todas as dependências instaladas e funcionando
- ✅ APIs de análise de imagem (Gemini + OpenAI) configuradas
- ✅ Sistema de precificação ajustado conforme padrões do usuário
- ✅ Análise automática de fotos funcionando com 9 livros identificados
- ✅ Percentuais de troca alinhados com avaliação manual

### 2025-01-24 - Migração para Replit Completa e Lista de Clássicos Atualizada
- ✅ Migração completa do projeto para ambiente Replit
- ✅ Banco de dados convertido de PostgreSQL para SQLite para compatibilidade
- ✅ Todas as dependências instaladas e configuradas
- ✅ Aplicação rodando com sucesso na porta 5000
- ✅ Lista completa de livros clássicos adicionada aos alertas de estoque
- ✅ Sistema configurado para manter sempre ao menos 1 exemplar de cada clássico
- ✅ 80+ títulos essenciais incluindo literatura brasileira, estrangeira, filosofia e infantil

### 2025-06-24 - Sistema de Trocas Aprimorado Implementado
- ✅ Sistema de trocas com análise de foto implementado (Gemini + OpenAI)
- ✅ Modo manual robusto para quando APIs não estão disponíveis
- ✅ Campos para inserir livros dados pelo cliente na troca
- ✅ Livros da foto automaticamente enviados para pré-cadastro
- ✅ Processamento automático de estoque remove livros dados do inventário
- ✅ Interface de pré-cadastros para processar livros identificados
- ✅ Separação visual entre livros recebidos e dados nas trocas
- ✅ Banco de dados estruturado com tabelas de exchange, pre_catalog_books
- ✅ API completa para gerenciamento de trocas e pré-cadastros
- ✅ **Análise avançada de precificação baseada em dados reais de mercado**
- ✅ **Integração com preços Amazon Brasil e média Estante Virtual**
- ✅ **Sistema de avaliação de rotatividade e facilidade de venda**
- ✅ **Ajuste automático por condição física e demanda de mercado**

### Database Schema Updates
- Tabela `exchanges`: registro de trocas
- Tabela `exchange_items`: itens recebidos na troca
- Tabela `exchange_given_books`: livros dados na troca
- Tabela `pre_catalog_books`: livros em pré-cadastro
- Tabela `missing_books`: livros clássicos que devem sempre estar em estoque

## User Preferences
- Sistema de troca por foto implementado com modo manual
- **Livros RECEBIDOS pelo cliente** (que saem do sebo) são removidos do estoque automaticamente
- **Livros DADOS pelo cliente** (da foto) viram pré-cadastro para processamento posterior
- Aba de trocas deve ter campos para inserir livros que o cliente está recebendo
- Análise de valores deve considerar: preços Amazon (novos), média Estante Virtual, facilidade de venda
- Precificação baseada em dados reais de mercado e demanda específica por categoria
- Sempre manter ao menos um exemplar dos livros clássicos em estoque
- Lista de clássicos deve incluir literatura brasileira, estrangeira, filosofia e infantil
- **Sistema de códigos únicos**: LU-{ID}-{ANO} para identificação de exemplares
- **Etiquetas otimizadas para idosos**: fonte grande, preço em destaque, layout claro
- **Aba "Cadastro"** (antiga "Busca por ISBN") para cadastro de livros
- Interface em português brasileiro
- Design clean e funcional

## Key Features
1. **Sistema de Trocas**:
   - Upload de foto de pilha de livros
   - Análise automática por IA (Gemini + OpenAI Vision)
   - Precificação inteligente baseada em dados reais de mercado
   - Análise de rotatividade e facilidade de venda por categoria
   - Ajuste automático por condição física (novo/usado)
   - Gestão de livros dados em troca
   - Controle de estoque automático

2. **Pré-Cadastros**:
   - Livros identificados na foto ficam pendentes
   - Interface para processar ou rejeitar livros
   - Conversão automática para o catálogo principal

3. **Política de Trocas**:
   - Valor base: 20% do valor estimado
   - Progressão por valor: +10% a cada R$ 10 acima de R$ 30
   - Bônus por ano: 2024-2025 (+10%), 2022-2023 (+5%)
   - Limite máximo: 50%
   - Arredondamento para múltiplo de R$ 5

## Technical Notes
- Análise de imagens via Gemini 2.5 Flash + OpenAI Vision API (fallback)
- Sistema avançado de precificação com análise de mercado
- Integração com dados de preços Amazon Brasil e Estante Virtual
- Avaliação automática de rotatividade por categoria de livro
- Base64 encoding para upload de imagens
- SQLite database para compatibilidade Replit
- TypeScript para type safety
- React Query para state management
- Tailwind para styling responsivo