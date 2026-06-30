export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { imageBase64, prompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Фото не передано' });
    }

    const apiKey = process.env.PHOTOROOM_API_KEY;

    // Конвертируем base64 в бинарный файл
    const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    // Формируем запрос к Photoroom API
    const formData = new FormData();
    formData.append('image_file', new Blob([imageBuffer], { type: mimeType }), 'photo.jpg');
    formData.append('outputType', 'rgba'); // прозрачный фон

    // Если пользователь выбрал пресет — добавляем фон
    if (prompt && prompt.trim()) {
      formData.append('aiBackground', prompt.trim());
    } else {
      formData.append('aiBackground', 'Clean white studio background, soft shadow, professional product photo');
    }

    const response = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText || 'Ошибка Photoroom API' });
    }

    // Photoroom возвращает картинку напрямую (не JSON)
    const imageArrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(imageArrayBuffer).toString('base64');

    return res.status(200).json({ image: `data:image/png;base64,${resultBase64}` });

  } catch (err) {
    return res.status(500).json({ error: 'Что-то пошло не так: ' + err.message });
  }
}
