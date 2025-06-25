# Sistema de Gestão de Livraria/Sebo - Luar Sebo

## Visão Geral
Sistema completo de gestão para livrarias e sebos, desenvolvido com React (frontend) e Express.js (backend). O sistema gerencia inventário de livros, vendas, etiquetas personalizadas e integração com a Estante Virtual.

## Arquitetura do Projeto
- **Frontend**: React com TypeScript, Vite, TailwindCSS, Radix UI
- **Backend**: Express.js com TypeScript, SQLite/Drizzle ORM
- **Banco de Dados**: SQLite para desenvolvimento, PostgreSQL para produção
- **Autenticação**: Passport.js com estratégia local
- **APIs Externas**: Estante Virtual, OpenAI, Google Gemini

## Funcionalidades Principais
1. Dashboard com estatísticas e visão geral
2. Cadastro e gestão de livros
3. Controle de estoque e prateleiras
4. Sistema de etiquetas personalizáveis
5. Análise de preços e tendências
6. Importação/exportação para Estante Virtual
7. Relatórios e análises

## Estado Atual
- ✅ Migração para ambiente Replit concluída
- ✅ Sistema de etiquetas personalizáveis implementado
- ✅ Configurações de marca salvam como padrão
- ✅ Interface de customização com scroll funcional
- ✅ Todas as dependências instaladas
- ✅ Aplicação rodando na porta 5000

## Configurações de Etiquetas
O sistema agora suporta:
- Layout personalizável de etiquetas
- Upload de templates de marca/logo
- Configurações de marca (nome, endereço, telefone, logo)
- Todas as configurações são salvas como padrão automaticamente
- Interface com scroll para customização

## Preferências do Usuário
- Idioma: Português brasileiro
- Interface limpa e funcional
- Configurações devem persistir como padrão
- Foco em usabilidade para livreiros/sebistas

## Mudanças Recentes
- 2025-01-23: Migração do Replit Agent para ambiente Replit padrão
- 2025-01-23: Implementado sistema de configurações de marca persistentes
- 2025-01-23: Corrigido layout da interface de customização de etiquetas
- 2025-01-23: Adicionado scroll na tela de configuração de etiquetas
- 2025-01-23: Corrigido PDF "Lista + Etiquetas" para aplicar layout personalizado salvo
- 2025-01-23: Sistema de etiquetas personalizadas agora funciona completamente

## Próximos Passos
- Sistema está pronto para uso e desenvolvimento adicional
- Usuário pode personalizar etiquetas e configurações de marca
- Todas as funcionalidades principais estão operacionais