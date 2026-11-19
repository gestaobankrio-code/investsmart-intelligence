# Google Ads no InvestSmart Intelligence: integração segura

## Situação

O projeto possui um **teste manual privado de conexão**, sem alterar campanhas,
sem gerar custos de mídia e sem publicar informações de conta no site público.

- Workflow: `.github/workflows/google-ads-readonly.yml`
- Script: `integrations/google-ads/verify-connection.mjs`
- API REST: Google Ads v26 (`GoogleAdsService.SearchStream`)
- Operação executada: somente `SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1`
- **Status:** não conectado até a aprovação OAuth e sucesso do workflow.

## Autorização necessária pelo titular da conta

1. Na [visão geral Google Ads API do Google Cloud](https://console.cloud.google.com/apis/library/googleads.googleapis.com?project=investsmart-intelligence), habilitar a API no projeto que gerará as credenciais OAuth.
2. Confirmar nível **Explorer** (consulta read-only de contas de produção, sujeito a permissões); o nível **Basic** será necessário para `KeywordPlanIdeaService` e métricas de planejamento.
3. Em APIs e serviços > Credenciais, configurar o consentimento OAuth e criar **OAuth Client ID** apropriado. Autorizar a conta Google que possui acesso legítimo à conta de anúncios com escopo `https://www.googleapis.com/auth/adwords`.
4. Obter refresh token via um fluxo de autorização OAuth aprovado para o projeto. Não colar tokens nesta conversa nem no código.
5. No repositório `gestaobankrio-code/investsmart-intelligence`, configurar os **Actions Secrets**:
   - `GOOGLE_ADS_OAUTH_CLIENT_ID`
   - `GOOGLE_ADS_OAUTH_CLIENT_SECRET`
   - `GOOGLE_ADS_OAUTH_REFRESH_TOKEN`
   - `GOOGLE_ADS_CUSTOMER_ID` (10 dígitos, sem hífens)
   - `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (opcional, se usar MCC)
6. Abrir Actions > **Verificar conexão Google Ads (somente leitura)** > **Run workflow**. Conferir conclusão bem-sucedida.

## Restrições da arquitetura

- Não existe callback OAuth nem endpoint público que armazene credenciais no browser.
- Nenhum segredo deve ser declarado com prefixo `VITE_` nem enviado ao GitHub Pages.
- O teste privado não publica métricas de campanhas.
- Para dados internos da conta, será necessária uma camada de backend **autenticada e protegida**, com controle de permissões por usuário. Não publicar campanhas, gastos e conversões em feed aberto.
- Pesquisa de palavras-chave no Keyword Planner depende do nível Basic ou superior; a API **não deve** ser chamada enquanto não autorizada.
- O Google Trends continua sendo uma fonte separada, com tendência relativa e sem inventar volume ou CPC.

## Mudança regulatória em 2026

Segundo a documentação atual do Google Ads, a política de acesso passou a ser vinculada ao projeto do Google Cloud após a descontinuação do *developer token* em 9 de setembro de 2026. Não solicitar um novo token como requisito.

Referências oficiais:
- https://developers.google.com/google-ads/api/docs/api-policy/access-levels
- https://developers.google.com/google-ads/api/docs/api-policy/developer-token
- https://developers.google.com/google-ads/api/docs/oauth/overview
