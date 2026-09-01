const { Mistral } = require('@mistralai/mistralai');

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

async function explainScanResults(results) {
  // Condense les résultats pour ne pas envoyer un JSON trop lourd à l'IA
  const summary = {
    dependencies: results.dependencies?.locations?.map((loc) => ({
      location: loc.location,
      vulnerabilities: loc.audit?.metadata?.vulnerabilities,
    })),
    secrets: {
      secretsFound: results.secrets?.secretsFound,
      findings: results.secrets?.findings?.slice(0, 5), // limite pour ne pas exploser le prompt
    },
    codeQuality: {
      errorCount: results.codeQuality?.errorCount,
      warningCount: results.codeQuality?.warningCount,
      topIssues: results.codeQuality?.issues?.slice(0, 10),
    },
    docker: results.docker?.locations,
    cicd: results.cicd?.workflows,
  };

  const prompt = `Tu es un expert en sécurité et qualité logicielle. Voici les résultats d'un scan automatique d'un dépôt de code (au format JSON) :

${JSON.stringify(summary, null, 2)}

Rédige une explication claire et concise en français, destinée à un développeur, qui :
1. Résume l'état général du projet (bon/moyen/préoccupant) en 1-2 phrases
2. Liste les 3 problèmes les plus importants à corriger en priorité, en expliquant pourquoi ils comptent et comment les corriger concrètement
3. Reste factuelle, sans inventer de détails absents des résultats fournis

Réponds uniquement avec le texte de l'explication, sans préambule ni formules de politesse.`;

  const response = await client.chat.complete({
    model: 'mistral-small-latest',
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0].message.content;
}

module.exports = { explainScanResults };