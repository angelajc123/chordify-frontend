import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressionBuilder from '../ProgressionBuilder.vue'
import * as progressionApi from '../../api/progression.js'

// Mock the progression API
vi.mock('../../api/progression.js', () => ({
  getProgression: vi.fn()
}))

describe('ProgressionBuilder', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('renders the header with app title', () => {
    progressionApi.getProgression.mockResolvedValue({
      progression: {
        id: 'test-id',
        name: 'Test Progression',
        chords: []
      }
    })

    const wrapper = mount(ProgressionBuilder)
    
    expect(wrapper.find('.header h1').text()).toBe('Chordify')
  })

  it('displays progression name when successfully loaded', async () => {
    const mockProgression = {
      id: '019a08bc-6d5f-702e-bd63-ff7fb3bb0d21',
      name: 'My Awesome Progression',
      chords: ['C', 'G', 'Am', 'F']
    }

    progressionApi.getProgression.mockResolvedValue({
      progression: mockProgression
    })

    const wrapper = mount(ProgressionBuilder)
    
    // Wait for async operations to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.progression-info h2').text()).toBe('My Awesome Progression')
    expect(wrapper.find('.error').exists()).toBe(false)
  })

  it('displays error message when API returns an error', async () => {
    const errorMessage = 'Failed to load progression'
    
    progressionApi.getProgression.mockResolvedValue({
      error: errorMessage
    })

    const wrapper = mount(ProgressionBuilder)
    
    // Wait for async operations to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.error').text()).toBe(errorMessage)
    expect(wrapper.find('.progression-info').exists()).toBe(false)
  })

  it('calls getProgression with correct ID on mount', async () => {
    const expectedId = '019a08bc-6d5f-702e-bd63-ff7fb3bb0d21'
    
    progressionApi.getProgression.mockResolvedValue({
      progression: {
        id: expectedId,
        name: 'Test',
        chords: []
      }
    })

    mount(ProgressionBuilder)
    
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(progressionApi.getProgression).toHaveBeenCalledWith(expectedId)
    expect(progressionApi.getProgression).toHaveBeenCalledTimes(1)
  })

  it('initializes with empty progression state', () => {
    progressionApi.getProgression.mockResolvedValue({
      progression: {
        id: 'test-id',
        name: '',
        chords: []
      }
    })

    const wrapper = mount(ProgressionBuilder)
    
    expect(wrapper.vm.progression).toEqual({
      name: '',
      id: '',
      chords: []
    })
    expect(wrapper.vm.error).toBeNull()
  })

  it('handles network errors gracefully', async () => {
    progressionApi.getProgression.mockResolvedValue({
      error: 'Network error: Unable to reach server'
    })

    const wrapper = mount(ProgressionBuilder)
    
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.error').exists()).toBe(true)
    expect(wrapper.find('.error').text()).toContain('Network error')
  })

  it('renders main content area', () => {
    progressionApi.getProgression.mockResolvedValue({
      progression: {
        id: 'test-id',
        name: 'Test',
        chords: []
      }
    })

    const wrapper = mount(ProgressionBuilder)
    
    expect(wrapper.find('.content').exists()).toBe(true)
    expect(wrapper.find('.progression-builder').exists()).toBe(true)
  })
})
