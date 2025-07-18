---
title: Quickstart
subtitle: Get started with OpenRouter
slug: quickstart
headline: OpenRouter Quickstart Guide | Developer Documentation
canonical-url: 'https://openrouter.ai/docs/quickstart'
'og:site_name': OpenRouter Documentation
'og:title': OpenRouter Quickstart Guide
'og:description': >-
  Get started with OpenRouter's unified API for hundreds of AI models. Learn how
  to integrate using OpenAI SDK, direct API calls, or third-party frameworks.
'og:image':
  type: url
  value: >-
    https://openrouter.ai/dynamic-og?pathname=quickstart&title=Quick%20Start&description=Start%20using%20OpenRouter%20API%20in%20minutes%20with%20any%20SDK
'og:image:width': 1200
'og:image:height': 630
'twitter:card': summary_large_image
'twitter:site': '@OpenRouterAI'
noindex: false
nofollow: false
---

OpenRouter provides a unified API that gives you access to hundreds of AI models through a single endpoint, while automatically handling fallbacks and selecting the most cost-effective options. Get started with just a few lines of code using your preferred SDK or framework.

<Tip>
  Looking for information about free models and rate limits? Please see the [FAQ](/docs/faq#how-are-rate-limits-calculated)
</Tip>

In the examples below, the OpenRouter-specific headers are optional. Setting them allows your app to appear on the OpenRouter leaderboards.

## Using the OpenAI SDK

<CodeGroup>

```python title="Python"
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>", # Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "<YOUR_SITE_NAME>", # Optional. Site title for rankings on openrouter.ai.
  },
  model="openai/gpt-4o",
  messages=[
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
)

print(completion.choices[0].message.content)
```

```typescript title="TypeScript"
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
    messages: [
      {
        role: 'user',
        content: 'What is the meaning of life?',
      },
    ],
  });

  console.log(completion.choices[0].message);
}

main();
```

</CodeGroup>

## Using the OpenRouter API directly

<Tip>
  You can use the interactive [Request Builder](/request-builder) to generate OpenRouter API requests in the language of your choice.
</Tip>

<CodeGroup>

```python title="Python"
import requests
import json

response = requests.post(
  url="https://openrouter.ai/api/v1/chat/completions",
  headers={
    "Authorization": "Bearer <OPENROUTER_API_KEY>",
    "HTTP-Referer": "<YOUR_SITE_URL>", # Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "<YOUR_SITE_NAME>", # Optional. Site title for rankings on openrouter.ai.
  },
  data=json.dumps({
    "model": "openai/gpt-4o", # Optional
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  })
)
```

```typescript title="TypeScript"
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

```shell title="Shell"
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d '{
  "model": "openai/gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
}'
```

</CodeGroup>

The API also supports [streaming](/docs/api-reference/streaming).

## Using third-party SDKs

For information about using third-party SDKs and frameworks with OpenRouter, please [see our frameworks documentation.](/docs/community/frameworks)
