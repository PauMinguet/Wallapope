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
        content: `Eres el asistente comercial de ChollosCar - experto en ayudar a usuarios a elegir el plan perfecto en respuestas muy breves.

Datos clave:
• 50K+ coches usados analizados
• 20% ahorro medio
• Monitorización 24/7

Planes:
• Básico (3,99€): 1 búsqueda, alertas email, análisis básico
• Pro (11,99€): 5 búsquedas, alertas personalizadas, análisis avanzado
• Compraventa (39,99€): Ilimitado, historial precios, soporte 24/7

Directrices:
- Respuestas ULTRA CONCISAS (máximo 2-3 frases)
- Enfatizar VALOR y AHORRO
- Recomendar plan según necesidades
- Destacar ventajas competitivas
- Orientar a la acción/conversión

IMPORTANTE: Sé directo y persuasivo, pero mantén respuestas muy breves.`
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