import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup, act } from '@testing-library/react'

// Flush all pending React state updates and cleanup after each test
afterEach(async () => {
  await act(async () => {})
  cleanup()
})

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn()
const mockEnumerateDevices = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
  writable: true,
  configurable: true,
})

// Mock HTMLMediaElement.setSinkId
Object.defineProperty(HTMLMediaElement.prototype, 'setSinkId', {
  value: vi.fn().mockResolvedValue(undefined),
  writable: true,
  configurable: true,
})

// Global test mocks
global.mockGetUserMedia = mockGetUserMedia
global.mockEnumerateDevices = mockEnumerateDevices
global.mockAddEventListener = mockAddEventListener
global.mockRemoveEventListener = mockRemoveEventListener

