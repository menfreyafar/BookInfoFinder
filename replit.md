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
7. Sistema Radar - Pedidos de clientes
8. Relatórios e análises

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
- 2025-06-25: Implementado sistema "Radar" completo para pedidos de clientes
- 2025-06-25: Adicionada tabela customer_requests no banco de dados
- 2025-06-25: Criadas rotas API para gerenciar solicitações de clientes
- 2025-06-25: Nova interface web para cadastro e gestão de pedidos
- 2025-06-25: Sistema de notificação quando livros procurados entram no estoque
- 2025-06-26: Implementado campo de busca inteligente no dashboard
- 2025-06-26: Busca suporta critérios múltiplos: título, autor, nacionalidade, cores, idiomas
- 2025-06-26: Adicionada busca por preços com filtros de valores (até X reais, acima de Y reais)
- 2025-06-26: Corrigido erro "inventory id not found" no sistema de estoque
- 2025-06-26: Implementado formulário completo de edição de livros no inventário
- 2025-06-26: Formulário do inventário permite editar todos os dados do livro (título, autor, preços, etc.)
- 2025-06-26: Corrigidos erros SQL na busca inteligente relacionados aos campos de preços
- 2025-06-26: Adicionado campo de upload de imagem de capa no formulário de edição do inventário
- 2025-06-26: Implementado campo de upload de imagem na busca por ISBN
- 2025-06-26: Sistema de edição completo permite modificar todos os dados incluindo imagem de capa

## Próximos Passos
- Sistema está pronto para uso e desenvolvimento adicional
- Usuário pode personalizar etiquetas e configurações de marca
- Todas as funcionalidades principais estão operacionais