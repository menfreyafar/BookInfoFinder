# Projeto Sistema de Gestão de Livraria/Sebo

## Visão Geral
Sistema completo de gestão para livrarias e sebos, com funcionalidades de:
- Cadastro e gestão de livros
- Controle de estoque e prateleiras
- Geração de etiquetas personalizadas 
- Integração com Estante Virtual
- Sistema de trocas e análise de preços
- Dashboard com estatísticas

## Arquitetura do Projeto
- **Backend**: Express.js com TypeScript
- **Frontend**: React com Vite
- **Banco de Dados**: SQLite com Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui components
- **Autenticação**: Passport.js com estratégia local

## Configurações Padrão
Sistema modificado para salvar configurações como padrão:
- Template de etiquetas personalizado salvo automaticamente
- Layout de etiquetas mantido como configuração padrão
- Informações da marca (nome, logo, endereço, telefone) persistidas
- Configurações aplicadas automaticamente a novas etiquetas

## Funcionalidades Principais
1. **Gestão de Livros**: CRUD completo com ISBN, sinopse, condição
2. **Estoque**: Controle por prateleiras com códigos únicos
3. **Etiquetas**: Geração de PDFs com templates personalizáveis
4. **Importação**: Integração automática com Estante Virtual
5. **Análise**: Comparação de preços e sugestões de trocas

## Mudanças Recentes
- 26/01/2025: Migração para ambiente Replit padrão concluída
- Configurações de template e marca agora salvas como padrão
- Sistema de brand info adicionado ao customizador de etiquetas
- Melhorias na persistência de configurações personalizadas

## Status Atual
Projeto completamente funcional no ambiente Replit com todas as dependências instaladas e configurações de segurança implementadas.