# InvestSmart Intelligence

Central de inteligência regional da InvestSmart com os termos efetivamente publicados pelo Google Trends Top 25 e Top Rising para o Brasil, sem lista de termos predefinidos. A fonte não é restrita a finanças e não representa todas as pesquisas realizadas.

**Aplicação:** https://investsmart-intelligence.lovable.app  
**Lovable Project ID:** `59f4d220-1c73-44be-85dc-800f8b5d8995`

## Arquitetura

- Front-end/SSR: React 19 + TanStack Start + Vite.
- Identidade visual: Barlow, roxo InvestSmart, neon e base neutra.
- Fonte pública atual: `gestaobankrio-code/investsmart-trends-feed`.
- A interface lê `trends.json` e `status.json` sem expor credenciais Google.
- Origem primária: GitHub Pages.
- Origem de contingência: GitHub Raw.
- Não existe fallback para dados simulados na interface pública.
- Feed com mais de 3 dias é identificado visualmente como desatualizado.

## Módulos

1. Radar Brasil
2. Ranking por UF
3. Comparar Estados
4. Fontes e Metodologia

## Qualidade

O workflow `.github/workflows/quality.yml` é obrigatório na `main` e executa:

- lint;
- TypeScript typecheck;
- testes automatizados;
- build completo.

## Fonte de dados

Os dados são extraídos do Google Trends Public Dataset no BigQuery, selecionando todos os termos presentes nos destaques Brasil da fonte, sem filtros por palavras-chave ou tema. Não é correto apresentar o conjunto como exclusivamente financeiro. Os índices do Google Trends são relativos (0–100) e não equivalem a volume absoluto de pesquisas.

Google Ads Keyword Planner e Google Trends API não são utilizados pela interface pública enquanto seus respectivos acessos não estiverem aprovados/configurados.

## Regras de integridade

- ausência de registro não deve ser convertida em zero;
- variação é exibida em pontos do índice, não em percentual;
- falha de leitura nunca deve gerar dados fictícios;
- datas de extração/fonte devem vir do feed e não ser hardcoded;
- segredos e credenciais nunca devem ser colocados no código do navegador.

## Desenvolvimento

```sh
bun install
bun run dev
```

Validação local:

```sh
bun run lint
bunx tsc --noEmit
bun run test
bun run build
```

## Integrações operacionais

### Growth Ops

O workflow `Notificar Growth Ops` envia `repository_dispatch` para:

`gestaobankrio-code/growth-ops-investsmart`

Ele depende do secret de Actions:

`GROWTH_OPS_PAT`

O token nunca deve ser armazenado no repositório.

### Feed Google Trends

A atualização do feed é responsabilidade do repositório:

`gestaobankrio-code/investsmart-trends-feed`

A UI permanece operacional quando a origem principal falha, usando o fallback GitHub Raw, mas dados antigos são explicitamente marcados como desatualizados.

## Lovable

Este projeto permanece conectado ao Lovable. Commits enviados à branch conectada devem permanecer lineares; não reescreva o histórico publicado com force-push/rebase.
