import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { prompt, duration = 3, type = 'sfx' } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const endpoint = type === 'music'
      ? 'https://api.elevenlabs.io/v1/music'
      : 'https://api.elevenlabs.io/v1/sound-generation'

    const body = type === 'music'
      ? { prompt, duration_seconds: duration }
      : { text: prompt, duration_seconds: Math.min(duration, 22), prompt_influence: 0.3 }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error(`ElevenLabs ${type} error [${response.status}]: ${errBody}`)
      return new Response(JSON.stringify({ error: `${type} generation failed`, status: response.status }), {
        status: response.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('SFX edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
