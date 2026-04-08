import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

function MicIcon({ active }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
      {active && <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" className="pulse-dot"/>}
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  )
}

function VolumeBar({ level }) {
  return (
    <div className="volume-bar-container">
      <div className="volume-bar-track">
        <div
          className="volume-bar-fill"
          style={{ width: `${Math.min(100, level * 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function App() {
  const [devices, setDevices] = useState({ inputs: [], outputs: [] })
  const [selectedMic, setSelectedMic] = useState('')
  const [selectedSpeaker, setSelectedSpeaker] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [volume, setVolume] = useState(1)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)
  const [permissionGranted, setPermissionGranted] = useState(false)

  const streamRef = useRef(null)
  const audioElRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const audioCtxRef = useRef(null)

  const loadDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const inputs = allDevices.filter(d => d.kind === 'audioinput')
      const outputs = allDevices.filter(d => d.kind === 'audiooutput')
      setDevices({ inputs, outputs })
      if (inputs.length > 0 && !selectedMic) setSelectedMic(inputs[0].deviceId)
      if (outputs.length > 0 && !selectedSpeaker) setSelectedSpeaker(outputs[0].deviceId)
    } catch (err) {
      setError('No se pudo obtener la lista de dispositivos: ' + err.message)
    }
  }, [selectedMic, selectedSpeaker])

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setPermissionGranted(true)
      setError(null)
      await loadDevices()
    } catch (err) {
      setError('Permiso de micrófono denegado. Permite el acceso en tu navegador.')
    }
  }, [loadDevices])

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const hasLabels = devices.some(d => d.label)
      if (hasLabels) {
        setPermissionGranted(true)
        loadDevices()
      }
    })

    navigator.mediaDevices.addEventListener('devicechange', loadDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices)
  }, [loadDevices])

  const startLevelMeter = useCallback((stream) => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      setLevel(Math.sqrt(sum / data.length))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const stopLevelMeter = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setLevel(0)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const constraints = {
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const audioEl = new Audio()
      audioEl.srcObject = stream
      audioEl.volume = volume
      audioElRef.current = audioEl

      if (selectedSpeaker && audioEl.setSinkId) {
        await audioEl.setSinkId(selectedSpeaker)
      }

      await audioEl.play()
      startLevelMeter(stream)
      setIsActive(true)
    } catch (err) {
      setError('Error al iniciar: ' + err.message)
    }
  }, [selectedMic, selectedSpeaker, volume, startLevelMeter])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current.srcObject = null
      audioElRef.current = null
    }
    stopLevelMeter()
    setIsActive(false)
  }, [stopLevelMeter])

  // Restart when devices change while active
  useEffect(() => {
    if (isActive) {
      stop()
      setTimeout(start, 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMic, selectedSpeaker])

  // Apply volume changes live
  useEffect(() => {
    if (audioElRef.current) {
      audioElRef.current.volume = volume
    }
  }, [volume])

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop])

  const hasSinkId = typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype

  return (
    <div className="app">
      <div className="card">
        <header className="card-header">
          <div className={`mic-icon-wrapper ${isActive ? 'active' : ''}`}>
            <MicIcon active={isActive} />
          </div>
          <h1>Megaphone</h1>
          <p className="subtitle">Audio en tiempo real</p>
        </header>

        {!permissionGranted ? (
          <div className="permission-section">
            <p className="permission-text">
              Necesitamos acceso al micrófono para listar los dispositivos disponibles.
            </p>
            <button className="btn btn-primary" onClick={requestPermission}>
              Permitir micrófono
            </button>
          </div>
        ) : (
          <>
            <div className="controls">
              <div className="control-group">
                <label>
                  <MicIcon active={false} />
                  Micrófono
                </label>
                <select
                  value={selectedMic}
                  onChange={e => setSelectedMic(e.target.value)}
                  disabled={isActive}
                >
                  {devices.inputs.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Micrófono ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label>
                  <SpeakerIcon />
                  Altavoz
                  {!hasSinkId && <span className="badge">No soportado</span>}
                </label>
                <select
                  value={selectedSpeaker}
                  onChange={e => setSelectedSpeaker(e.target.value)}
                  disabled={isActive || !hasSinkId}
                >
                  {devices.outputs.length === 0 ? (
                    <option value="">Altavoz por defecto</option>
                  ) : (
                    devices.outputs.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Altavoz ${d.deviceId.slice(0, 8)}`}
                      </option>
                    ))
                  )}
                </select>
                {!hasSinkId && (
                  <p className="hint">Tu navegador no soporta selección de altavoz. Usa Chrome o Edge.</p>
                )}
              </div>

              <div className="control-group">
                <label>
                  Volumen — {Math.round(volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  className="range-input"
                />
              </div>
            </div>

            {isActive && (
              <div className="level-section">
                <span className="level-label">Nivel de entrada</span>
                <VolumeBar level={level} />
              </div>
            )}

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <button
              className={`btn btn-main ${isActive ? 'btn-danger' : 'btn-primary'}`}
              onClick={isActive ? stop : start}
            >
              {isActive ? 'Detener' : 'Iniciar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
