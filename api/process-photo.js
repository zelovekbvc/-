export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { imageBase64, prompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Фото не передано' });
    }

    // Ключ берётся из защищённой переменной окружения, а не из кода
    const apiKey = process.env.OPENAI_API_KEY;

    const userBackground = (prompt && prompt.trim()) || 'чистый белый студийный фон с мягкой тенью';

    const finalPrompt =
      `Полностью замени фон этого фото на: ${userBackground}. ` +
      `Это обязательное условие: задний план должен визуально полностью отличаться от исходного — ` +
      `другой цвет, другая текстура, другое освещение фона. ` +
      `Само украшение (кольцо, цепочка, серьги — что бы это ни было) должно остаться абсолютно без изменений: ` +
      `та же форма, цвет металла, отражения на самом изделии, положение в кадре. ` +
      `Не сохраняй исходный фон ни в каком виде — это главная задача редактирования.`;

    // Превращаем base64 в файл-картинку, который ожидает OpenAI
    const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');

    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), 'photo.png');
    formData.append('prompt', finalPrompt);
    formData.append('model', 'gpt-image-1');
    formData.append('size', '1024x1024');

    const openaiResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return res.status(500).json({ error: data.error?.message || 'Ошибка ИИ-сервиса' });
    }

    const resultBase64 = data.data[0].b64_json;

    return res.status(200).json({ image: `data:image/png;base64,${resultBase64}` });
  } catch (err) {
    return res.status(500).json({ error: 'Что-то пошло не так на сервере' });
  }
}
