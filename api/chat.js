export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, mode, destination } = req.body;

  const system = mode === 'recommend'
    ? `Du er Roamo, en dansk AI-rejseassistent. Brugeren vil rejse til: ${destination}.
Returner KUN et JSON-objekt (ingen tekst før eller efter, ingen markdown) med denne struktur:
{
  "destination": "${destination}",
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
  "iataCode": "3-bogstavs IATA kode for nærmeste lufthavn til ${destination}"
}
Inkluder 2 hoteller og 1-2 flyafgange. Vær realistisk med priser og flyselskaber fra København.`
    : : `Du er Roamo, en dansk AI-rejseassistent der hjælper danskere med at planlægge rejser. VIGTIGE REGLER: 1. Stil spørgsmål om destination, rejsedatoer, antal personer og budget — ét spørgsmål ad gangen. 2. Når du har svar på alle 4 ting, skriv en kort opsummering og tilføj præcis dette til allersidst: [KLAR_TIL_ANBEFALING] 3. Anbefal ALDRIG selv hjemmesider som Booking.com, TUI eller lignende — det gør vores system automatisk. 4. Hold svar korte — max 3 sætninger. 5. Skriv altid på dansk.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system,
        messages
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
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
    res.status(500).json({ error: err.message });
  }
}