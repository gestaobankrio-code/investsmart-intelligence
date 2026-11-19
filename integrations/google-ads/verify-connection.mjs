/** Teste privado de conexão Google Ads. Apenas SELECT, sem publicar métricas. */
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Configure a credencial " + name + " em Actions Secrets.");
  return value;
};
async function main() {
  const clientId = required("GOOGLE_ADS_OAUTH_CLIENT_ID");
  const clientSecret = required("GOOGLE_ADS_OAUTH_CLIENT_SECRET");
  const refreshToken = required("GOOGLE_ADS_OAUTH_REFRESH_TOKEN");
  const customerId = required("GOOGLE_ADS_CUSTOMER_ID");
  const managerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim();
  if (!/^[0-9]{10}$/.test(customerId)) throw new Error("Customer ID: use dez dígitos.");
  if (managerId && !/^[0-9]{10}$/.test(managerId)) throw new Error("Manager ID inválido.");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(12000),
  });
  if (!tokenResponse.ok) throw new Error("Falha OAuth (HTTP " + tokenResponse.status + ").");
  const token = await tokenResponse.json();
  if (typeof token.access_token !== "string") throw new Error("OAuth não retornou access token.");
  const headers = {
    authorization: "Bearer " + token.access_token,
    "content-type": "application/json",
    ...(managerId ? { "login-customer-id": managerId } : {}),
  };
  const adsResponse = await fetch("https://googleads.googleapis.com/v26/customers/" + customerId + "/googleAds:searchStream", {
    method: "POST",
    headers,
    body: JSON.stringify({ query: "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!adsResponse.ok) throw new Error("Google Ads recusou a leitura (HTTP " + adsResponse.status + "). Verifique acesso Explorer/Basic e OAuth.");
  const batches = await adsResponse.json();
  if (!Array.isArray(batches) || !batches.some((batch) => batch.results?.length)) throw new Error("Consulta não retornou cliente.");
  console.log("Google Ads: conexão autorizada para leitura. Nenhuma métrica foi publicada.");
}
await main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Erro Google Ads");
  process.exitCode = 1;
});
