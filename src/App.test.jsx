import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

async function renderApp() {
  let result
  await act(async () => {
    result = render(<App />)
  })
  return result
}

describe('App Component', () => {
  let mockStream, mockAudioElement, mockAnalyser, mockAudioContext

  beforeEach(() => {
    vi.clearAllMocks()

    mockStream = { getTracks: vi.fn(() => [{ stop: vi.fn() }]) }

    mockAnalyser = {
      fftSize: 256,
      frequencyBinCount: 128,
      getByteTimeDomainData: vi.fn((data) => {
        for (let i = 0; i < data.length; i++) data[i] = 128
      }),
    }

    mockAudioContext = {
      createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
      createAnalyser: vi.fn(() => mockAnalyser),
      close: vi.fn(),
    }
    global.AudioContext = vi.fn(function () { return mockAudioContext })

    mockAudioElement = {
      srcObject: null,
      volume: 1,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      setSinkId: vi.fn().mockResolvedValue(undefined),
    }
    global.Audio = vi.fn(function () { return mockAudioElement })

    global.mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone' },
      { deviceId: 'speaker-1', kind: 'audiooutput', label: 'Speaker' },
    ])
    global.mockGetUserMedia.mockResolvedValue(mockStream)
  })

  // --- Rendering ---

  it('renders the title', async () => {
    await renderApp()
    expect(screen.getByText('Megaphone')).toBeInTheDocument()
  })

  it('renders the subtitle', async () => {
    await renderApp()
    expect(screen.getByText('Audio en tiempo real')).toBeInTheDocument()
  })

  it('renders the card container', async () => {
    await renderApp()
    expect(document.querySelector('.card')).toBeInTheDocument()
  })

  it('renders the app wrapper', async () => {
    await renderApp()
    expect(document.querySelector('.app')).toBeInTheDocument()
  })

  it('renders SVG icons', async () => {
    await renderApp()
    expect(document.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('renders the mic icon wrapper', async () => {
    await renderApp()
    expect(document.querySelector('.mic-icon-wrapper')).toBeInTheDocument()
  })

  // --- Permission section ---

  it('shows permission section when no devices available', async () => {
    global.mockEnumerateDevices.mockResolvedValueOnce([])
    await renderApp()
    await waitFor(() => {
      expect(screen.getByText(/Necesitamos acceso al micrófono/i)).toBeInTheDocument()
    })
  })

  it('shows the allow-mic button', async () => {
    global.mockEnumerateDevices.mockResolvedValueOnce([])
    await renderApp()
    await waitFor(() => {
      expect(screen.getByText(/Permitir micrófono/i)).toBeInTheDocument()
    })
  })

  it('calls getUserMedia when allow button clicked', async () => {
    global.mockEnumerateDevices.mockResolvedValueOnce([])
    const user = userEvent.setup()
    await renderApp()
    await waitFor(() => screen.getByText(/Permitir micrófono/i))
    await user.click(screen.getByText(/Permitir micrófono/i))
    expect(global.mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it('shows error when mic permission denied', async () => {
    global.mockGetUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'))
    global.mockEnumerateDevices.mockResolvedValueOnce([])
    const user = userEvent.setup()
    await renderApp()
    await waitFor(() => screen.getByText(/Permitir micrófono/i))
    await user.click(screen.getByText(/Permitir micrófono/i))
    await waitFor(() => {
      expect(screen.getByText(/Permiso de micrófono/i)).toBeInTheDocument()
    })
  })

  // --- Controls visible after permission ---

  it('shows start button after devices load', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/Iniciar/i)).toBeInTheDocument()
    })
  })

  it('shows at least two select dropdowns', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows device options', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
    })
  })

  it('shows control groups', async () => {
    render(<App />)
    await waitFor(() => {
      expect(document.querySelectorAll('.control-group').length).toBeGreaterThan(0)
    })
  })

  it('shows volume label', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/Volumen/i)).toBeInTheDocument()
    })
  })

  it('shows volume range slider', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByRole('slider').length).toBeGreaterThan(0)
    })
  })

  // --- Device options ---

  it('renders mic device as option', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Microphone')).toBeInTheDocument()
    })
  })

  it('renders speaker device as option', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Speaker')).toBeInTheDocument()
    })
  })

  it('allows changing mic selection', async () => {
    global.mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1' },
      { deviceId: 'mic-2', kind: 'audioinput', label: 'Mic 2' },
    ])
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getAllByRole('combobox'))
    const [micSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(micSelect, 'mic-2')
    expect(micSelect).toHaveValue('mic-2')
  })

  it('allows changing speaker selection', async () => {
    global.mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1' },
      { deviceId: 'spk-1', kind: 'audiooutput', label: 'Speaker 1' },
      { deviceId: 'spk-2', kind: 'audiooutput', label: 'Speaker 2' },
    ])
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getAllByRole('combobox'))
    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[1], 'spk-2')
    expect(selects[1]).toHaveValue('spk-2')
  })

  it('renders fallback label for devices without label', async () => {
    global.mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'abc123def', kind: 'audioinput', label: '' },
      { deviceId: 'labeled', kind: 'audioinput', label: 'Labeled Mic' },
    ])
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/Micrófono abc123/i)).toBeInTheDocument()
    })
  })


  it('adds devicechange listener on mount', async () => {
    await renderApp()
    expect(global.mockAddEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function))
  })

  it('removes devicechange listener on unmount', async () => {
    const { unmount } = await renderApp()
    unmount()
    expect(global.mockRemoveEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function))
  })

  // --- Audio start ---

  it('calls getUserMedia on start', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    expect(global.mockGetUserMedia).toHaveBeenCalled()
  })

  it('creates Audio element on start', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    expect(global.Audio).toHaveBeenCalled()
  })

  it('calls play() on audio element', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => expect(mockAudioElement.play).toHaveBeenCalled())
  })

  it('sets srcObject to the stream', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => expect(mockAudioElement.srcObject).toBe(mockStream))
  })

  it('calls setSinkId when speaker is selected', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => expect(mockAudioElement.setSinkId).toHaveBeenCalled())
  })

  it('creates AudioContext for level meter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    expect(global.AudioContext).toHaveBeenCalled()
  })

  it('creates analyser node', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
  })

  it('shows level meter section when active', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => {
      expect(screen.getByText(/Nivel de entrada/i)).toBeInTheDocument()
    })
  })

  it('shows Detener button when active', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => {
      expect(screen.getByText(/Detener/i)).toBeInTheDocument()
    })
  })

  it('disables mic select when active', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')[0]).toBeDisabled()
    })
  })

  // --- setSinkId fallback ---

  it('continues playing if setSinkId throws', async () => {
    mockAudioElement.setSinkId.mockRejectedValueOnce(new Error('NotSupportedError'))
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => expect(mockAudioElement.play).toHaveBeenCalled())
  })

  // --- Audio stop ---

  it('calls pause() when stopped', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => screen.getByText(/Detener/i))
    await user.click(screen.getByText(/Detener/))
    expect(mockAudioElement.pause).toHaveBeenCalled()
  })

  it('stops stream tracks when stopped', async () => {
    const trackStop = vi.fn()
    mockStream.getTracks.mockReturnValue([{ stop: trackStop }])
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => screen.getByText(/Detener/i))
    await user.click(screen.getByText(/Detener/))
    expect(trackStop).toHaveBeenCalled()
  })

  it('shows Iniciar button again after stopping', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => screen.getByText(/Detener/i))
    await user.click(screen.getByText(/Detener/))
    expect(screen.getByText(/Iniciar/i)).toBeInTheDocument()
  })

  it('hides level meter when stopped', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => screen.getByText(/Nivel de entrada/i))
    await user.click(screen.getByText(/Detener/))
    expect(screen.queryByText(/Nivel de entrada/i)).not.toBeInTheDocument()
  })

  // --- Errors ---

  it('shows error when getUserMedia fails on start', async () => {
    global.mockGetUserMedia.mockRejectedValueOnce(new Error('Stream unavailable'))
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => {
      expect(screen.getByText(/Stream unavailable/i)).toBeInTheDocument()
    })
  })

  it('shows error box element on error', async () => {
    global.mockGetUserMedia.mockRejectedValueOnce(new Error('fail'))
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText(/Iniciar/i))
    await user.click(screen.getByText(/Iniciar/))
    await waitFor(() => {
      expect(document.querySelector('.error-box')).toBeInTheDocument()
    })
  })

  it('handles enumeration errors gracefully', async () => {
    global.mockEnumerateDevices.mockRejectedValueOnce(new Error('DOMException'))
    const { container } = render(<App />)
    await waitFor(() => expect(container).toBeInTheDocument())
  })
})

