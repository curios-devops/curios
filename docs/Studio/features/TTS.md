1. Update the regular search function to add a STT button call "Read aloud" for the button icon use an speaker or loud icon like in the attached image in the overview section in line with share export rewrite  button in the right side put it right and move buttons to the left (do surgical updates just to add this button do not change anything else). 
Oficial Speech to text documnetion for Context: 

Transcriptions
The transcriptions API takes as input the audio file you want to transcribe and the desired output file format for the transcription of the audio. All models support the same set of input formats. On output:

whisper-1 supports json, text, srt, verbose_json, and vtt.
use thgpt-4o-mini-transcribe support json or plain text.
gpt-4o-transcribe-diarize supports json, text, and diarized_json (which adds speaker segments to the response).
Transcribe audio
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI();

const transcription = await openai.audio.transcriptions.create({
  file: fs.createReadStream("/path/to/file/audio.mp3"),
  model: "gpt-4o-transcribe",
});

console.log(transcription.text);
By default, the response type will be json with the raw text included.

{
  "text": "Imagine the wildest idea that you've ever had, and you're curious about how it might scale to something that's a 100, a 1,000 times bigger.
....
}
The Audio API also allows you to set additional parameters in a request. For example, if you want to set the response_format as text, your request would look like the following:

Additional options
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI();

const transcription = await openai.audio.transcriptions.create({
  file: fs.createReadStream("/path/to/file/speech.mp3"),
  model: "gpt-4o-transcribe",
  response_format: "text",
});

console.log(transcription.text);

Audio
Learn how to turn audio into text or text into audio.

Related guide: Speech to text

Create speech
post
 
https://api.openai.com/v1/audio/speech
Generates audio from the input text.

Request body
input
string

Required
The text to generate audio for. The maximum length is 4096 characters.

model
string

Required
One of the available TTS models: tts-1, tts-1-hd or gpt-4o-mini-tts.

voice
string

Required
The voice to use when generating the audio. Supported voices are alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, and verse. Previews of the voices are available in the Text to speech guide.

instructions
string

Optional
Control the voice of your generated audio with additional instructions. Does not work with tts-1 or tts-1-hd.

response_format
string

Optional
Defaults to mp3
The format to audio in. Supported formats are mp3, opus, aac, flac, wav, and pcm.

speed
number

Optional
Defaults to 1
The speed of the generated audio. Select a value from 0.25 to 4.0. 1.0 is the default.

stream_format
string

Optional
Defaults to audio
The format to stream the audio in. Supported formats are sse and audio. sse is not supported for tts-1 or tts-1-hd.

Example request
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI();

const speechFile = path.resolve("./speech.mp3");

async function main() {
  const mp3 = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: "Today is a wonderful day to build something people love!",
  });
  console.log(speechFile);
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);
}
main();
