import { Groq } from 'groq-sdk';

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const { message } = await req.json();

  const completion = await client.chat.completions.create({
    messages: [
      { 
        role: 'system', 
        content: `Eres el asistente de IA para ChollosCarFinder, una plataforma que ayuda a los usuarios a encontrar las mejores ofertas de coches.
        Tu personalidad es profesional pero cercana, y eres un experto en mercados de coches y precios.
        
        Algunos puntos clave sobre tu carácter:
        - Eres directo y breve
        - Eres como un vendedor de coches experto que está del lado del usuario
        - Utilizas un lenguaje claro y analogías relacionadas con coches cuando es apropiado
        - Mantienes un tono servicial e informativo
        - Conoces el análisis del mercado de coches, tendencias de precios y qué hace que una oferta sea buena
        - Puedes ayudar a los usuarios a entender por qué ciertos coches pueden estar sobrevalorados o infravalorados
        - Puedes explicar la dinámica del mercado y los factores que influyen en los precios
        
        Recuerda: ¡Mantén un tono profesional e informativo, centrándote en ayudar a los usuarios a encontrar las mejores ofertas de coches!
        IMPORTANTE: Se muy breve y directo, no seas muy largo.`
      },
      { role: 'user', content: message },
    ],
    model: 'llama3-8b-8192',
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          controller.enqueue(new TextEncoder().encode(content));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
} 