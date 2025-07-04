---
title: Authentication
subtitle: API Authentication
headline: API Authentication | OpenRouter OAuth and API Keys
canonical-url: 'https://openrouter.ai/docs/api-reference/authentication'
'og:site_name': OpenRouter Documentation
'og:title': API Authentication - Secure Access to OpenRouter
'og:description': >-
  Learn how to authenticate with OpenRouter using API keys and Bearer tokens.
  Complete guide to secure authentication methods and best practices.
'og:image':
  type: url
  value: >-
    https://openrouter.ai/dynamic-og?title=API%20Authentication&description=Secure%20access%20to%20OpenRouter
'og:image:width': 1200
'og:image:height': 630
'twitter:card': summary_large_image
'twitter:site': '@OpenRouterAI'
noindex: false
nofollow: false
---

You can cover model costs with OpenRouter API keys.

Our API authenticates requests using Bearer tokens. This allows you to use `curl` or the [OpenAI SDK](https://platform.openai.com/docs/frameworks) directly with OpenRouter.

<Warning>
API keys on OpenRouter are more powerful than keys used directly for model APIs.

They allow users to set credit limits for apps, and they can be used in [OAuth](/docs/use-cases/oauth-pkce) flows.

</Warning>

## Using an API key

To use an API key, [first create your key](https://openrouter.ai/keys). Give it a name and you can optionally set a credit limit.

If you're calling the OpenRouter API directly, set the `Authorization` header to a Bearer token with your API key.

If you're using the OpenAI Typescript SDK, set the `api_base` to `https://openrouter.ai/api/v1` and the `apiKey` to your API key.

<CodeGroup>

```typescript title="TypeScript (Bearer Token)"
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <OPENROUTER_API_KEY>',
    'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
    'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o',
    messages: [
      {
        role: 'user',
        content: 'What is the meaning of life?',
      },
    ],
  }),
});
```

```typescript title="TypeScript (OpenAI SDK)"
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '<OPENROUTER_API_KEY>',
  defaultHeaders: {
    'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
    'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'openai/gpt-4o',
    messages: [{ role: 'user', content: 'Say this is a test' }],
  });

  console.log(completion.choices[0].message);
}

main();
```

```python title="Python"
import openai

openai.api_base = "https://openrouter.ai/api/v1"
openai.api_key = "<OPENROUTER_API_KEY>"

response = openai.ChatCompletion.create(
  model="openai/gpt-4o",
  messages=[...],
  headers={
    "HTTP-Referer": "<YOUR_SITE_URL>", # Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "<YOUR_SITE_NAME>", # Optional. Site title for rankings on openrouter.ai.
  },
)

reply = response.choices[0].message
```

```shell title="Shell"
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d '{
  "model": "openai/gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ]
}'
```

</CodeGroup>

To stream with Python, [see this example from OpenAI](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_stream_completions.ipynb).

## If your key has been exposed

<Warning>
  You must protect your API keys and never commit them to public repositories.
</Warning>

OpenRouter is a GitHub secret scanning partner, and has other methods to detect exposed keys. If we determine that your key has been compromised, you will receive an email notification.

If you receive such a notification or suspect your key has been exposed, immediately visit [your key settings page](https://openrouter.ai/settings/keys) to delete the compromised key and create a new one.

Using environment variables and keeping keys out of your codebase is strongly recommended.
