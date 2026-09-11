import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import ScenarioButtons from './ScenarioButtons';
import type { ReportInput } from '../utils/incidentFactory';
import type { DemoScenario } from '../data/demoScenarios';
import type { ResourceNeed } from '../types/incident';
import { RESOURCE_LABEL } from '../utils/labels';
import { describeCoords, googleMapsLink, openStreetMapLink } from '../utils/geo';
import { INDIA_PLACES } from '../data/indiaPlaces';

interface EmergencyReportFormProps {
  onSubmit: (input: ReportInput) => void;
}

type SpeechStatus = 'unsupported' | 'idle' | 'listening' | 'error' | 'denied';

/** Minimal shape of the Web Speech API we rely on (it is not in lib.dom types). */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

const MAX_IMAGE_EDGE = 1000;
const MAX_VIDEO_MB = 200;

const RESOURCE_OPTIONS: ResourceNeed[] = [
  'medical_assistance',
  'evacuation_assistance',
  'drinking_water',
  'food',
  'transport',
  'shelter',
  'communication_support',
  'power_support',
];

export default function EmergencyReportForm({ onSubmit }: EmergencyReportFormProps) {
  const [text, setText] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoNote, setGeoNote] = useState<{ kind: 'ok' | 'warn' | 'plain'; message: string } | null>(null);
  const [photo, setPhoto] = useState<{ dataUrl: string; name: string } | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [video, setVideo] = useState<{ url: string; name: string; sizeKb: number } | null>(null);
  const [videoNote, setVideoNote] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ url: string; name: string; seconds: number } | null>(null);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [resourceNeed, setResourceNeed] = useState<ResourceNeed | 'auto'>('auto');
  const [resourceQuantity, setResourceQuantity] = useState('');
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
  const [usedVoice, setUsedVoice] = useState(false);
  const [scenarioNote, setScenarioNote] = useState<DemoScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setSpeechStatus('unsupported');
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setText(`${baseTextRef.current}${baseTextRef.current ? ' ' : ''}${transcript}`.trimStart());
      setUsedVoice(true);
    };
    recognition.onerror = (event) => {
      setSpeechStatus(event?.error === 'not-allowed' ? 'denied' : 'error');
    };
    recognition.onend = () => {
      setSpeechStatus((current) => (current === 'listening' ? 'idle' : current));
    };
    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggleVoice = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (speechStatus === 'listening') {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      setSpeechStatus('idle');
      return;
    }
    baseTextRef.current = text;
    try {
      recognition.start();
      setSpeechStatus('listening');
    } catch {
      setSpeechStatus('error');
    }
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoNote({
        kind: 'warn',
        message: 'This browser does not support location access. Please type the location instead.',
      });
      return;
    }
    setGeoNote({ kind: 'plain', message: 'Requesting location from your browser…' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });
        // Turn the fix into something a person can read, using the offline
        // India index — no geocoding service is contacted.
        const described = describeCoords(lat, lng);
        setGeoNote({
          kind: 'ok',
          message: `Approximate coordinates captured (${lat.toFixed(4)}, ${lng.toFixed(4)})${
            described.place ? ` — nearest known city: ${described.place}, ${described.region}` : ''
          }. They stay on this device — nothing is uploaded.`,
        });
        if (!locationLabel.trim()) setLocationLabel(described.label);
      },
      (positionError) => {
        setGeoNote({
          kind: 'warn',
          message:
            positionError.code === positionError.PERMISSION_DENIED
              ? 'Location permission was declined. Please type the location instead.'
              : 'Location is not available right now. Please type the location instead.',
        });
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60_000 },
    );
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoNote('That file is not an image. Please choose a photo.');
      return;
    }
    setPhotoNote('Preparing preview…');
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();
      image.onload = () => {
        // Downscale locally so the demo never blows the localStorage quota.
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          setPhoto({ dataUrl: source, name: file.name });
          setPhotoNote(null);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setPhoto({ dataUrl: canvas.toDataURL('image/jpeg', 0.72), name: file.name });
        setPhotoNote(null);
      };
      image.onerror = () => {
        setPhotoNote('That image could not be read in this browser. The report can still be submitted without it.');
      };
      image.src = source;
    };
    reader.onerror = () => setPhotoNote('That image could not be read. The report can still be submitted without it.');
    reader.readAsDataURL(file);
  };

  const handleVideo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setVideoNote('That file is not a video. Please choose a video clip.');
      return;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_VIDEO_MB) {
      setVideoNote(
        `That clip is ${sizeMb.toFixed(0)} MB. Please attach something under ${MAX_VIDEO_MB} MB, or trim it first.`,
      );
      return;
    }
    if (video) URL.revokeObjectURL(video.url);
    setVideo({ url: URL.createObjectURL(file), name: file.name, sizeKb: Math.round(file.size / 1024) });
    setVideoNote(null);
  };

  /** Record a voice note with MediaRecorder. Honest fallback if unavailable. */
  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setAudioNote('Audio recording is not available in this browser. You can still type or attach a photo.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (tickRef.current) window.clearInterval(tickRef.current);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (audio) URL.revokeObjectURL(audio.url);
        setAudio({
          url: URL.createObjectURL(blob),
          name: `voice-note-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.webm`,
          seconds: recordSeconds,
        });
        setRecording(false);
        setAudioNote(null);
      };
      recorderRef.current = recorder;
      setRecordSeconds(0);
      recorder.start();
      setRecording(true);
      setAudioNote('Recording… press stop when you are done.');
      tickRef.current = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    } catch {
      setAudioNote('Microphone permission was declined, so no audio was recorded. You can still type the report.');
      setRecording(false);
    }
  };

  useEffect(
    () => () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    },
    [],
  );

  const pickScenario = (scenario: DemoScenario) => {
    setText(scenario.text);
    setLocationLabel(scenario.locationHint);
    setScenarioNote(scenario);
    setError(null);
    textRef.current?.focus();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (text.trim().length < 10) {
      setError('Please describe what is happening in at least a few words so the report can be analysed.');
      textRef.current?.focus();
      return;
    }
    setError(null);
    if (speechStatus === 'listening') {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setSpeechStatus('idle');
    }
    if (recording) recorderRef.current?.stop();
    const quantity = Number.parseInt(resourceQuantity, 10);
    onSubmit({
      text: text.trim(),
      locationLabel,
      coords,
      photoDataUrl: photo?.dataUrl ?? null,
      photoName: photo?.name ?? null,
      usedVoice,
      video,
      audio,
      resourceNeed,
      resourceQuantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    });
  };

  return (
    <form className="sb-card" onSubmit={submit} noValidate>
      <div className="sb-card__head">
        <div>
          <h2 className="sb-card__title">
            <Icon name="alert" size={18} />
            Emergency report
          </h2>
          <p className="sb-card__sub">
            Everything you enter stays on this device. Nothing is sent to any server, and no emergency service
            is contacted by this form.
          </p>
        </div>
      </div>

      <div className="sb-field">
        <label className="sb-label" htmlFor="sb-report-text">
          What is happening?
        </label>
        <textarea
          id="sb-report-text"
          ref={textRef}
          className="sb-textarea"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setScenarioNote(null);
          }}
          placeholder="Describe what is happening. Mention location, people affected, hazards, and urgent needs if known."
          aria-describedby="sb-report-help"
          required
        />
        <p className="sb-hint" id="sb-report-help">
          Plain language is fine. The prototype looks for words such as “trapped”, “fire”, “flood”, “wires”,
          “bleeding” or “water needed”.
        </p>
        {scenarioNote && (
          <p className="sb-hint sb-hint--warn">
            Simulated demo scenario loaded: {scenarioNote.title}. {scenarioNote.expected}
          </p>
        )}
      </div>

      <div className="sb-field">
        <label className="sb-label" htmlFor="sb-report-location">
          Location{' '}
          <span className="sb-label__opt">
            — anywhere in India: type a landmark or city, or use your device location
          </span>
        </label>
        <div className="sb-inline-row">
          <input
            id="sb-report-location"
            className="sb-input"
            value={locationLabel}
            onChange={(event) => setLocationLabel(event.target.value)}
            placeholder="e.g. Science Block, Ground Floor — or any city in India"
            autoComplete="off"
            list="sb-india-places"
          />
          {/* Offline index of Indian cities: reports are not limited to one campus. */}
          <datalist id="sb-india-places">
            {INDIA_PLACES.map((place) => (
              <option key={`${place.name}-${place.state}`} value={`${place.name}, ${place.state}`} />
            ))}
          </datalist>
          <button type="button" className="sb-btn sb-btn--ghost sb-btn--sm" onClick={useMyLocation}>
            <Icon name="pin" size={16} />
            Use my location
          </button>
        </div>
        {geoNote && (
          <p
            className={`sb-hint${geoNote.kind === 'warn' ? ' sb-hint--warn' : geoNote.kind === 'ok' ? ' sb-hint--ok' : ''}`}
            role="status"
          >
            {geoNote.message}
          </p>
        )}
        {coords && (
          <p className="sb-hint">
            <a href={googleMapsLink(coords.lat, coords.lng)} target="_blank" rel="noreferrer noopener">
              Open in Google Maps
            </a>
            {' · '}
            <a href={openStreetMapLink(coords.lat, coords.lng)} target="_blank" rel="noreferrer noopener">
              Open in OpenStreetMap
            </a>
            {' · '}
            <button
              type="button"
              className="sb-linkish"
              onClick={() => {
                setCoords(null);
                setGeoNote({ kind: 'plain', message: 'Coordinates removed. The typed location is still used.' });
              }}
            >
              Remove coordinates
            </button>
          </p>
        )}
      </div>

      <div className="sb-field">
        <span className="sb-label">
          Evidence photo <span className="sb-label__opt">— optional</span>
        </span>
        {photo ? (
          <div className="sb-evidence">
            <img className="sb-evidence__img" src={photo.dataUrl} alt="Preview of the evidence you attached" />
            <div className="sb-evidence__meta">
              <div className="sb-evidence__name">{photo.name}</div>
              <div>User-submitted evidence — not independently verified.</div>
              <button
                type="button"
                className="sb-btn sb-btn--subtle sb-btn--sm"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setPhoto(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                <Icon name="close" size={14} />
                Remove photo
              </button>
            </div>
          </div>
        ) : (
          <div className="sb-upload">
            <label className="sb-upload__box" htmlFor="sb-report-photo">
              <Icon name="camera" size={18} />
              <div>Attach a photo from this device</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.75 }}>Stored locally only, never uploaded</div>
            </label>
            <input
              id="sb-report-photo"
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sb-visually-hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </div>
        )}
        {photoNote && <p className="sb-hint sb-hint--warn">{photoNote}</p>}
      </div>

      <div className="sb-field">
        <span className="sb-label">
          Video evidence <span className="sb-label__opt">— optional</span>
        </span>
        {video ? (
          <div className="sb-evidence sb-evidence--media">
            <video className="sb-evidence__video" src={video.url} controls preload="metadata" />
            <div className="sb-evidence__meta">
              <div className="sb-evidence__name">{video.name}</div>
              <div>
                {(video.sizeKb / 1024).toFixed(1)} MB · User-submitted evidence — not independently verified.
              </div>
              <div className="sb-hint" style={{ marginTop: 4 }}>
                Playable for this browser session only. Video is never uploaded and is too large to store, so
                only its name and size are kept with the incident.
              </div>
              <button
                type="button"
                className="sb-btn sb-btn--subtle sb-btn--sm"
                style={{ marginTop: 8 }}
                onClick={() => {
                  URL.revokeObjectURL(video.url);
                  setVideo(null);
                  if (videoRef.current) videoRef.current.value = '';
                }}
              >
                <Icon name="close" size={14} />
                Remove video
              </button>
            </div>
          </div>
        ) : (
          <div className="sb-upload">
            <label className="sb-upload__box" htmlFor="sb-report-video">
              <Icon name="camera" size={18} />
              <div>Attach or record a video clip</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.75 }}>Stays on this device, session only</div>
            </label>
            <input
              id="sb-report-video"
              ref={videoRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="sb-visually-hidden"
              onChange={(event) => handleVideo(event.target.files?.[0])}
            />
          </div>
        )}
        {videoNote && <p className="sb-hint sb-hint--warn">{videoNote}</p>}
      </div>

      <div className="sb-field">
        <span className="sb-label">
          Voice note <span className="sb-label__opt">— optional, recorded audio</span>
        </span>
        {audio ? (
          <div className="sb-evidence sb-evidence--media">
            <div className="sb-evidence__meta" style={{ flex: 1 }}>
              <div className="sb-evidence__name">{audio.name}</div>
              <audio className="sb-evidence__audio" src={audio.url} controls preload="metadata" />
              <div>
                {audio.seconds}s · User-submitted evidence — not independently verified. Playable for this
                session only.
              </div>
              <button
                type="button"
                className="sb-btn sb-btn--subtle sb-btn--sm"
                style={{ marginTop: 8 }}
                onClick={() => {
                  URL.revokeObjectURL(audio.url);
                  setAudio(null);
                }}
              >
                <Icon name="close" size={14} />
                Remove voice note
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`sb-btn sb-btn--sm ${recording ? 'sb-btn--danger' : 'sb-btn--ghost'}`}
            onClick={toggleRecording}
            aria-pressed={recording}
          >
            <Icon name="mic" size={16} />
            {recording ? `Stop recording (${recordSeconds}s)` : 'Record a voice note'}
          </button>
        )}
        {audioNote && (
          <p className="sb-hint sb-hint--warn" role="status">
            {audioNote}
          </p>
        )}
      </div>

      <div className="sb-field">
        <label className="sb-label" htmlFor="sb-report-resource">
          Resource request <span className="sb-label__opt">— optional, overrides what the text implies</span>
        </label>
        <div className="sb-inline-row">
          <select
            id="sb-report-resource"
            className="sb-select"
            style={{ flex: '1 1 220px' }}
            value={resourceNeed}
            onChange={(event) => setResourceNeed(event.target.value as ResourceNeed | 'auto')}
          >
            <option value="auto">Detect from my description</option>
            {RESOURCE_OPTIONS.map((need) => (
              <option key={need} value={need}>
                {RESOURCE_LABEL[need]}
              </option>
            ))}
          </select>
          <input
            className="sb-input"
            style={{ flex: '0 1 190px' }}
            type="number"
            min="1"
            max="10000"
            inputMode="numeric"
            value={resourceQuantity}
            onChange={(event) => setResourceQuantity(event.target.value)}
            placeholder="For how many people"
            aria-label="Number of people this resource is needed for"
          />
        </div>
        <p className="sb-hint">
          Asking for something is not the same as reporting danger: a resource request with no life-safety
          signal is queued as Medium, not raised as an alarm.
        </p>
      </div>

      <div className="sb-field">
        <span className="sb-label">
          Voice dictation <span className="sb-label__opt">— optional, speech to text</span>
        </span>
        <button
          type="button"
          className={`sb-btn sb-btn--sm ${speechStatus === 'listening' ? 'sb-btn--danger' : 'sb-btn--ghost'}`}
          onClick={toggleVoice}
          disabled={speechStatus === 'unsupported'}
          aria-pressed={speechStatus === 'listening'}
        >
          <Icon name="mic" size={16} />
          {speechStatus === 'listening' ? 'Stop voice input' : 'Speak the report'}
        </button>
        <p
          className={`sb-hint${speechStatus === 'unsupported' || speechStatus === 'denied' || speechStatus === 'error' ? ' sb-hint--warn' : ''}`}
          role="status"
        >
          {speechStatus === 'unsupported' &&
            'Voice input is not available in this browser. Please type the report instead — nothing else changes.'}
          {speechStatus === 'idle' && 'Uses your browser’s built-in speech recognition. No audio is stored by SankatBrigade.'}
          {speechStatus === 'listening' && 'Listening… speak clearly, then press stop. You can edit the text afterwards.'}
          {speechStatus === 'denied' && 'Microphone permission was declined. Please type the report instead.'}
          {speechStatus === 'error' &&
            'Voice input stopped unexpectedly in this browser. Please type the report instead.'}
        </p>
      </div>

      {error && (
        <p className="sb-hint sb-hint--warn" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="sb-btn sb-btn--danger sb-btn--block">
        <Icon name="send" size={17} />
        Submit Emergency Report
      </button>

      <div className="sb-section">
        <div className="sb-section__head">
          <div>
            <h3 className="sb-section__title" style={{ fontSize: '1rem' }}>
              Try a demo scenario
            </h3>
            <p className="sb-section__sub">
              These fill the form with fixed text. They run through exactly the same rules as anything you type.
            </p>
          </div>
        </div>
        <ScenarioButtons onPick={pickScenario} />
      </div>
    </form>
  );
}
