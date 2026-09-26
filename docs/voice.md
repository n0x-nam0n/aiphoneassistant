# AI Phone Voice Strategy

## Caller-message contract

For a reservation request that has been accepted for human review, the workflow returns:

```json
{
  "caller_message": "Your reservation request has been sent to the restaurant for review. It is not confirmed yet."
}
```

Retell or Vapi takes `caller_message` and speaks it using the configured voice.

## Should you clone your voice?

You can, but do not clone your voice for the first version.

Start with a licensed stock voice because it is:

- Faster to launch
- Usually more consistent
- Easier to replace
- Not tied to your personal identity
- Better suited to different restaurant brands
- Less likely to make callers think they are speaking directly with you

Your personal voice across 20 unrelated restaurants could become strange. A caller might reasonably assume “Zach” works at that restaurant.

## Best starting choice

Offer each restaurant two or three approved voices:

- Warm and conversational
- Polished and professional
- Friendly bilingual voice, if needed

Let the restaurant select one. The system should still identify itself honestly:

> “Thank you for calling Bella’s Kitchen. I’m the restaurant’s automated assistant. How may I help you?”

The assistant does not need to repeatedly announce that it is artificial, but it should never claim to be a real employee.

## Voice options

### 1. Stock platform voice — recommended first

Retell and Vapi offer voices from supported text-to-speech providers. Configure:

- Voice
- Language
- Speaking speed
- Responsiveness
- Interruption handling
- Tone
- Pronunciation rules

No recording or cloning is required. This is the correct option for the first test restaurant.

### 2. Designed synthetic brand voice — recommended later

Instead of copying a real person, create an original synthetic voice with characteristics such as:

- Female or male presentation
- Approximate age
- Calm or energetic tone
- Regional accent
- Speaking pace
- Hospitality style
- English and Spanish support

This could become the recognizable RestaurantAIReceptionist.com voice without tying the product to your biological voice. A synthetic brand voice is generally a better long-term EstomoAI asset than a personal clone.

### 3. Clone your voice — optional

If you specifically want the receptionist to sound like you, ElevenLabs supports:

- Instant Voice Cloning: approximately 1–2 minutes of clean audio
- Professional Voice Cloning: approximately 30–180 minutes of clean audio, with verification and substantially better fidelity

Professional Voice Cloning should be restricted to the speaker’s own verified voice. Anyone supplying a voice should create and verify it through their own account before sharing it appropriately.

The general Vapi connection is:

```text
Your verified ElevenLabs voice
            ↓
ElevenLabs voice ID/API access
            ↓
Vapi voice configuration
            ↓
Your Vapi restaurant agent
```

Vapi supports ElevenLabs as a voice provider and provides a custom-voice configuration path.

## If a restaurant owner wants their own voice

Do not clone it yourself from recordings.

The owner should:

1. Explicitly agree to the use.
2. Create and verify their own professional clone.
3. Authorize its specific use by EstomoAI.
4. Define where it may be used.
5. Define who controls the account.
6. Define what happens when the contract ends.
7. Retain the ability to withdraw permission.

## Contract requirements

The agreement should address:

- Voice ownership
- Permitted businesses and agents
- Advertising use
- Prohibited statements
- Access and account control
- Termination and deletion
- Security incidents
- Whether the clone may be reused

## Recommendation for EstomoAI

Use this sequence:

1. Pilot: licensed stock voice
2. First customers: customer chooses among three approved voices
3. Established product: original EstomoAI synthetic brand voice
4. Premium option: verified customer-owned custom voice
5. Your personal clone: reserve for your own EstomoAI sales line or demonstration

For the prototype, choose a warm stock voice and spend time on call accuracy, routing, transfers, and safe responses. A spectacular cloned voice attached to a receptionist that mishandles reservations is merely a very convincing way to annoy customers.

