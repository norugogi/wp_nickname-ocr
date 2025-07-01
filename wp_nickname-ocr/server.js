require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/ocr', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;
  const imageData = fs.readFileSync(imagePath);

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/images/uploads',
      imageData,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'vision'
        }
      }
    );

    const imageURL = response.data.url;

    const gptRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageURL }
              },
              {
                type: 'text',
                text: '이 이미지 속에서 플레이어 닉네임만 추출해서 한 줄에 하나씩 출력해줘. Lv. 같은 숫자 정보는 빼줘.'
              }
            ]
          }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const result = gptRes.data.choices[0].message.content;
    res.send({ nicknames: result });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('OCR 처리 중 오류 발생');
  } finally {
    fs.unlinkSync(imagePath); // 임시 파일 삭제
  }
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
