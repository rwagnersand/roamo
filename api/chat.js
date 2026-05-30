export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Du er Roamo, en venlig og entusiastisk dansk AI-rejseassistent. Du hjælper danskere med at planlægge drømmerejser. Stil gerne opklarende spørgsmål om budget, rejsedatoer, interesser og hvem de rejser med. Når du har nok info, giv en konkret, inspirerende rejseplan med forslag til destination, hotel-type, aktiviteter og tips. Hold svarene korte og engagerende — maks 5 sætninger per svar. Skriv altid på dansk.`,
        messages
      })
    });

    const data = await response.json();
    const reply = data.content.map(b => b.text || '').join('');
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Noget gik galt. Prøv igen.' });
  }
}
