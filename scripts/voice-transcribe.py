import sys, json, subprocess
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel(sys.argv[2], device='cpu', compute_type='int8')
raw = subprocess.run(['ffmpeg','-v','error','-i',sys.argv[1],'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout
audio = np.frombuffer(raw, dtype=np.float32)
segs, info = m.transcribe(audio, language='he', word_timestamps=True, vad_filter=False, beam_size=5)
out = []
for s in segs:
    out.append({'start': s.start, 'end': s.end, 'text': s.text, 'words': [{'w': w.word, 's': w.start, 'e': w.end} for w in (s.words or [])]})
    print(f"{s.start:7.2f}-{s.end:7.2f} {s.text}", flush=True)
json.dump(out, open(sys.argv[3], 'w'), ensure_ascii=False)
