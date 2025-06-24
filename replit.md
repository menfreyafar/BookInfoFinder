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
### 2025-01-24 - Migração para Replit Completa e Lista de Clássicos Atualizada
- ✅ Migração completa do projeto para ambiente Replit
- ✅ Banco de dados convertido de PostgreSQL para SQLite para compatibilidade
- ✅ Todas as dependências instaladas e configuradas
- ✅ Aplicação rodando com sucesso na porta 5000
- ✅ Lista completa de livros clássicos adicionada aos alertas de estoque
- ✅ Sistema configurado para manter sempre ao menos 1 exemplar de cada clássico
- ✅ 80+ títulos essenciais incluindo literatura brasileira, estrangeira, filosofia e infantil

### 2025-01-24 - Sistema de Trocas e Livros em Falta Implementados
- ✅ Criada nova aba "Trocas" no menu principal
- ✅ Implementada análise automática de foto de pilhas de livros usando OpenAI Vision
- ✅ Sistema de cálculo de valores de troca baseado na política Luar Sebo
- ✅ Gestão automática de estoque (livros dados são removidos)
- ✅ Sistema de pré-cadastros para livros identificados na foto
- ✅ Nova aba "Pré-Cadastros" para processar livros pendentes
- ✅ Nova aba "Livros em Falta" para gerenciar clássicos essenciais
- ✅ Importação automática de 80+ livros clássicos obrigatórios
- ✅ Interface completa funcionando com todas as APIs
- ✅ Upload de logos e configurações funcionais
- ⚠️ OpenAI API necessita créditos para análise de fotos

### Database Schema Updates
- Tabela `exchanges`: registro de trocas
- Tabela `exchange_items`: itens recebidos na troca
- Tabela `exchange_given_books`: livros dados na troca
- Tabela `pre_catalog_books`: livros em pré-cadastro
- Tabela `missing_books`: livros clássicos que devem sempre estar em estoque

## User Preferences
- Sistema deve usar análise de foto para identificar livros em trocas
- Livros dados na troca devem ser removidos automaticamente do estoque
- Livros da foto devem ficar em pré-cadastro para processamento posterior
- Sempre manter ao menos um exemplar dos livros clássicos em estoque
- Lista de clássicos deve incluir literatura brasileira, estrangeira, filosofia e infantil
- Interface em português brasileiro
- Design clean e funcional

## Key Features
1. **Sistema de Trocas**:
   - Upload de foto de pilha de livros
   - Análise automática por IA (OpenAI Vision)
   - Cálculo de valores baseado na política da loja
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
- Todas as imagens são processadas via OpenAI Vision API
- Base64 encoding para upload de imagens
- PostgreSQL constraints para integridade referencial
- TypeScript para type safety
- React Query para state management
- Tailwind para styling responsivo