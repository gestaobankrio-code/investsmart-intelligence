# Production Readiness — InvestSmart Intelligence

## Concluído em 19/11/2026

- [x] Menu lateral alinhado e consistente em desktop, tablet e mobile.
- [x] Navegação com estados ativos e suporte a teclado.
- [x] Skip link e melhorias de acessibilidade.
- [x] Estados explícitos de loading, falha, dados atuais e dados desatualizados.
- [x] Remoção de datas hardcoded de extração.
- [x] Fonte primária e fallback redundante para leitura do feed.
- [x] Timeout de rede para evitar loading indefinido.
- [x] Sem fallback público para dados fictícios.
- [x] Páginas de erro/404 localizadas em português.
- [x] Lint sem erros/warnings.
- [x] Typecheck obrigatório.
- [x] Testes automatizados.
- [x] Build obrigatório.
- [x] GitHub Actions atualizado para runtime Node 24.

## Operação de dados

- [x] Feed existente identificado como `bigquery_live`.
- [x] Cobertura existente: 27 UFs.
- [x] Metodologia apresentada na interface.
- [x] Feed antigo é marcado como desatualizado.
- [ ] Autorizar o repositório `investsmart-trends-feed` na instalação GitHub do ChatGPT.
- [ ] Implantar coletor automático do Google Trends Public Dataset / BigQuery no repositório do feed.
- [ ] Configurar autenticação OIDC / Workload Identity Federation para o coletor.
- [ ] Validar a primeira atualização automática e o monitor de freshness.

## Growth Ops

- [x] Workflow de notificação existe e lê corretamente o Lovable Project ID.
- [ ] Configurar `GROWTH_OPS_PAT` em Actions secrets de `investsmart-intelligence`.
- [ ] Validar `repository_dispatch` ponta a ponta.
- [ ] Confirmar avanço automático de `lastSeenCommit` no Growth Ops.

## Fontes futuras

- [ ] Habilitar Google Ads Keyword Planner somente após acesso BASIC.
- [ ] Habilitar Google Trends API somente após aprovação/credenciais.
- [ ] Não substituir fontes indisponíveis por dados simulados.
