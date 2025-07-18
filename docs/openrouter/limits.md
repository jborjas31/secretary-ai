---
title: Limits
subtitle: Rate Limits
headline: API Rate Limits | Configure Usage Limits in OpenRouter
canonical-url: 'https://openrouter.ai/docs/api-reference/limits'
'og:site_name': OpenRouter Documentation
'og:title': API Rate Limits - Manage Model Usage and Quotas
'og:description': >-
  Learn about OpenRouter's API rate limits, credit-based quotas, and DDoS
  protection. Configure and monitor your model usage limits effectively.
'og:image':
  type: url
  value: >-
    https://openrouter.ai/dynamic-og?title=API%20Rate%20Limits&description=Manage%20Model%20Usage%20and%20Quotas
'og:image:width': 1200
'og:image:height': 630
'twitter:card': summary_large_image
'twitter:site': '@OpenRouterAI'
noindex: false
nofollow: false
---

import {
  API_KEY_REF,
  FREE_MODEL_CREDITS_THRESHOLD,
  FREE_MODEL_HAS_CREDITS_RPD,
  FREE_MODEL_NO_CREDITS_RPD,
  FREE_MODEL_RATE_LIMIT_RPM,
  HTTPStatus,
  sep,
  Variant,
} from '../../../imports/constants';

<Tip>
  Making additional accounts or API keys will not affect your rate limits, as we
  govern capacity globally. We do however have different rate limits for
  different models, so you can share the load that way if you do run into
  issues.
</Tip>

## Rate Limits and Credits Remaining

To check the rate limit or credits left on an API key, make a GET request to `https://openrouter.ai/api/v1/auth/key`.

<Template data={{ API_KEY_REF }}>
<CodeGroup>

```typescript title="TypeScript"
const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
  method: 'GET',
  headers: {
    Authorization: 'Bearer {{API_KEY_REF}}',
  },
});
```

```python title="Python"
import requests
import json

response = requests.get(
  url="https://openrouter.ai/api/v1/auth/key",
  headers={
    "Authorization": f"Bearer {{API_KEY_REF}}"
  }
)

print(json.dumps(response.json(), indent=2))
```

</CodeGroup>
</Template>

If you submit a valid API key, you should get a response of the form:

```typescript title="TypeScript"
type Key = {
  data: {
    label: string;
    usage: number; // Number of credits used
    limit: number | null; // Credit limit for the key, or null if unlimited
    is_free_tier: boolean; // Whether the user has paid for credits before
  };
};
```

There are a few rate limits that apply to certain types of requests, regardless of account status:

1. Free usage limits: If you're using a free model variant (with an ID ending in <code>{sep}{Variant.Free}</code>), you can make up to {FREE_MODEL_RATE_LIMIT_RPM} requests per minute. The following per-day limits apply:

- If you have purchased less than {FREE_MODEL_CREDITS_THRESHOLD} credits, you're limited to {FREE_MODEL_NO_CREDITS_RPD} <code>{sep}{Variant.Free}</code> model requests per day.

- If you purchase at least {FREE_MODEL_CREDITS_THRESHOLD} credits, your daily limit is increased to {FREE_MODEL_HAS_CREDITS_RPD} <code>{sep}{Variant.Free}</code> model requests per day.

2. **DDoS protection**: Cloudflare's DDoS protection will block requests that dramatically exceed reasonable usage.

If your account has a negative credit balance, you may see <code>{HTTPStatus.S402_Payment_Required}</code> errors, including for free models. Adding credits to put your balance above zero allows you to use those models again.
