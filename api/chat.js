export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, mode } = req.body;

  const system = mode === 'recommend'
    ? `Du er Roamo, en dansk AI-rejseassistent. Brugeren har valgt en destination.
Returner KUN et JSON-objekt (ingen tekst før eller efter, ingen markdown) med denne struktur:
{
  "destination": "Destinationsnavn",
  "intro": "2 sætninger om destinationen på dansk",
  "hotels": [
    {
      "name": "Hotelnavnet",
      "stars": 4,
      "desc": "Kort beskrivelse på dansk, max 15 ord",
      "price": "Fra X.XXX kr/nat",
      "area": "Område/bydel"
    }
  ],
  "flights": [
    {
      "from": "CPH",
      "fromCity": "København",
      "to": "XXX",
      "toCity": "Destinationsby",
      "duration": "Xt Xm",
      "airline": "Flyselskab(er)",
      "price": "Fra X.XXX kr t/r"
    }
  ],
  "iataCode": "3-bogstavs IATA kode for nærmeste lufthavn"
}
Inkluder 2 hoteller og 1-2 flyafgange. Vær realistisk med priser og flyselskaber fra København.`
    : `Du er Roamo, en venlig dansk AI-rejseassistent. Hjælp danskere med at planlægge drømmerejser.
Stil spørgsmål om budget, datoer, interesser og rejsedeltagere.
Når brugeren nævner en konkret destination, svar kort og bekræftende og sig at du finder hoteller og fly nu.
Hold svar under 4 sætninger. Skriv altid på dansk.`;

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
        system,
        messages
      })
    });

    const data = await response.json();
    const reply = data.content.map(b => b.text || '').join('');

    if (mode === 'recommend') {
      try {
        const clean = reply.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        res.status(200).json({ type: 'recommendations', data: parsed });
      } catch {
        res.status(200).json({ type: 'text', reply });
      }
    } else {
      res.status(200).json({ type: 'text', reply });
    }
  } catch (err) {
    res.status(500).json({ error: 'Noget gik galt. Prøv igen.' });
  }
}
