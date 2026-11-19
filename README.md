# InvestSmart Intelligence

Central de inteligência financeira regional da InvestSmart com dados reais do Google Trends Top 25 e Top Rising para o Brasil. As buscas são provenientes da fonte, sem lista de palavras-chave predefinidas; os assuntos publicados são filtrados por relevância financeira auditável, e os mesmos assuntos nacionais têm séries regionais por UF.

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

1. Radar Brasil: assuntos nacionais e evolução regional.
2. Termos financeiros: cada palavra única, com temperatura predominante observada.
3. Comparar Estados: Quente / Morno / Frio ou Sem comparação por UF.
4. Fontes e Metodologia: dados, limites e situação das integrações.

## Qualidade

O workflow `.github/workflows/quality.yml` é obrigatório na `main` e executa:

- lint;
- TypeScript typecheck;
- testes automatizados;
- build completo.

## Fonte de dados

Os dados são extraídos do Google Trends Public Dataset no BigQuery e classificados por relevância financeira (regra de domínio auditável). O sistema não cadastra palavras-chave de resultado. As temperaturas são apenas a direção das variações entre semanas: Quente (alta), Morno (estável), Frio (queda), Misto (sem direção predominante) ou Sem comparação (histórico insuficiente). Não são volumes de busca, CPC, índices de oportunidade ou previsões. O mesmo termo nacional pode ter séries diferentes por UF.

Google Ads Keyword Planner e Google Trends API não são utilizados pela interface pública enquanto seus respectivos acessos não estiverem aprovados/configurados. O Google Ads possui um teste manual e privado de conexão read-only, detalhado em [docs/GOOGLE_ADS_INTEGRATION.md](docs/GOOGLE_ADS_INTEGRATION.md); sem credenciais e OAuth autorizados, não está conectado.

## Regras de integridade

- ausência de registro não deve ser convertida em zero;
- splash de abertura sem percentual de carregamento fictício; respeita movimento reduzido e permite pular;
- barra de navegação inferior no mobile, com áreas de toque ampliadas e safe areas;
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
